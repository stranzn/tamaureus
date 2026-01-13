use base64::{engine::general_purpose, Engine as _};
use chrono::Local;
use std::fs::File;
use std::path::{Path};
use symphonia::core::formats::{FormatOptions, SeekMode};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::{Limit, MetadataOptions, StandardTagKey, Value};
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;
use symphonia::default;
use symphonia::core::errors::Error as SymphoniaError;

use crate::models::ExtractedTrack;

#[tauri::command]
pub async fn move_file_to_dir(
    src_file: String,
    dest_dir: String,
) -> Result<String, String> {
    let src_path = std::path::Path::new(&src_file);
    let dest_dir_path = std::path::Path::new(&dest_dir);

    let filename = src_path
        .file_name()
        .ok_or_else(|| "Source path has no filename".to_string())?;

    let dest_path = dest_dir_path.join(filename);

    tokio::fs::rename(src_path, &dest_path)
        .await
        .map_err(|e| format!("Failed to move file: {}", e))?;

    Ok(dest_path.to_string_lossy().into_owned())
}

#[tauri::command]
pub async fn extract_track_data(src_path: String) -> Result<ExtractedTrack, String> {
    let path = Path::new(&src_path);

    let file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;

    let file_size = file
        .metadata()
        .map_err(|e| format!("Failed to get metadata: {}", e))?
        .len() as i64;

    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|s| s.to_str()) {
        hint.with_extension(ext);
    }

    let format_opts = FormatOptions {
        enable_gapless: false,
        ..Default::default()
    };

    let metadata_opts = MetadataOptions {
        limit_visual_bytes: Limit::Maximum(10 * 1024 * 1024),
        ..Default::default()
    };

    let probed = default::get_probe()
        .format(&mut hint, mss, &format_opts, &metadata_opts)
        .map_err(|e| format!("Format probe failed: {}", e))?;

    let mut reader = probed.format;

    let track = reader
        .default_track()
        .ok_or("No default audio track found in file".to_string())?;

    let track_id = track.id;
    let time_base = track.codec_params.time_base;
    let n_frames = track.codec_params.n_frames;

    // ── Tags & Cover Art ──
    let mut title = "Unknown Title".to_string();
    let mut artist = "Unknown Artist".to_string();
    let mut album = "Unknown Album".to_string();
    let mut thumbnail_base64: Option<String> = None;
    let mut thumbnail_mime: Option<String> = None;

    if let Some(metadata_rev) = reader.metadata().current() {
        // Standard tags
        for tag in metadata_rev.tags() {
            if let Some(key) = tag.std_key {
                match key {
                    StandardTagKey::TrackTitle => {
                        title = tag.value.to_string();
                    }
                    StandardTagKey::Artist | StandardTagKey::AlbumArtist => {
                        let val = tag.value.to_string();
                        if !val.trim().is_empty() {
                            artist = val;
                        }
                    }
                    StandardTagKey::Album => {
                        album = tag.value.to_string();
                    }
                    _ => {}
                }
            }
        }

        // Cover art (take first one)
        if thumbnail_base64.is_none() {
            for visual in metadata_rev.visuals() {
                let data = visual.data.to_vec();
                let mime = visual.media_type.to_string();

                thumbnail_base64 = Some(general_purpose::STANDARD.encode(&data));
                thumbnail_mime = Some(mime);
                break;
            }
        }
    }

    // Fallback title from filename
    if title.trim().is_empty() || title == "Unknown Title" {
        title = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown Title")
            .to_string();
    }

    // Duration calculation
    let mut duration_ms: i64 = if let (Some(tb), Some(nf)) = (time_base, n_frames) {
        let time = tb.calc_time(nf);
        (time.seconds as i64 * 1000) + (time.frac as f64 * 1000.0) as i64
    } else {
        -1
    };

    // Full scan fallback if needed
    if duration_ms == -1 {
        if let Some(tb) = time_base {
            reader
                .seek(
                    symphonia::core::formats::SeekMode::Accurate,
                    symphonia::core::formats::SeekTo::Time {
                        time: Time::new(0, 0.0),
                        track_id: Some(track_id),
                    },
                )
                .map_err(|e| format!("Seek failed: {}", e))?;

            let mut total_dur = 0u64;

            loop {
                match reader.next_packet() {
                    Ok(packet) => {
                        if packet.track_id() == track_id {
                            total_dur = total_dur.saturating_add(packet.dur);
                        }
                    }
                    Err(SymphoniaError::IoError(err))
                        if err.kind() == std::io::ErrorKind::UnexpectedEof =>
                    {
                        break;
                    }
                    Err(e) => return Err(format!("Packet reading error: {}", e)),
                }
            }

            let time = tb.calc_time(total_dur);
            duration_ms = (time.seconds as i64 * 1000) + (time.frac as f64 * 1000.0) as i64;
        }
    }

    let file_format = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_lowercase();

    let date_added = Local::now()
        .format("%Y%m%d")
        .to_string()
        .parse::<i64>()
        .unwrap_or(0); // fallback

    Ok(ExtractedTrack {
        file_path: src_path,
        title,
        artist,
        album,
        duration_ms,
        file_format,
        file_size,
        date_added,
        thumbnail_base64,
        thumbnail_mime,
    })
}
