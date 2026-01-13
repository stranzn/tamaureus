use chrono::Local;
use std::fs::File;
use std::path::{Path, PathBuf};
use symphonia::core::formats::FormatOptions;
use symphonia::core::formats::{SeekMode, SeekTo};
use symphonia::core::io::MediaSourceStream;
use symphonia::core::meta::{Limit, MetadataOptions, StandardTagKey, Value};
use symphonia::core::probe::Hint;
use symphonia::core::units::Time;
use symphonia::default;

use crate::models::ExtractedTrack;

#[tauri::command]
pub async fn move_file_to_dir<P, Q>(src_file: P, dest_dir: Q) -> std::io::Result<PathBuf>
where
    P: AsRef<Path>,
    Q: AsRef<Path>,
{
    let src_path = src_file.as_ref();

    let filename = src_path.file_name().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Source path has no filename",
        )
    })?;

    let dest_path = dest_dir.as_ref().join(filename);

    tokio::fs::rename(src_path, &dest_path).await?;

    Ok(dest_path)
}

#[tauri::command]
pub async fn extract_track_data(
    src_path: &str,
) -> Result<ExtractedTrack, Box<dyn std::error::Error>> {
    let file = File::open(src_path)?;
    let file_size = file.metadata()?.len() as i64;
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = Path::new(src_path).extension().and_then(|s| s.to_str()) {
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

    let probed = default::get_probe().format(&mut hint, mss, &format_opts, &metadata_opts)?;
    let mut reader = probed.format;

    // 1. Get track reference and COPY primitives immediately
    let track = reader
        .default_track()
        .ok_or("No default audio track found in file")?;

    let track_id = track.id;
    let time_base = track.codec_params.time_base;
    let n_frames = track.codec_params.n_frames;

    // ── Extract Tags & Cover Art ──
    let mut title = String::from("Unknown Title");
    let mut artist = String::from("Unknown Artist");
    let mut album = String::from("Unknown Album");
    let mut thumbnail_data: Option<Vec<u8>> = None;
    let mut thumbnail_mime: Option<String> = None;

    if let Some(metadata_rev) = reader.metadata().current() {
        // Standard Tags
        for tag in metadata_rev.tags() {
            if let Some(key) = tag.std_key {
                match key {
                    StandardTagKey::TrackTitle => title = tag.value.to_string(),
                    StandardTagKey::Artist | StandardTagKey::AlbumArtist => {
                        let val = tag.value.to_string();
                        if !val.is_empty() {
                            artist = val;
                        }
                    }
                    StandardTagKey::Album => album = tag.value.to_string(),
                    _ => {}
                }
            }
        }

        // Visuals (Cover Art)
        if thumbnail_data.is_none() {
            for visual in metadata_rev.visuals() {
                // FIXED: Use .to_vec()
                thumbnail_data = Some(visual.data.to_vec());
                thumbnail_mime = Some(visual.media_type.to_string());
                break;
            }
        }
    }

    // fallback title
    if title.trim().is_empty() || title == "Unknown Title" {
        title = Path::new(src_path)
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Unknown Title")
            .to_string();
    }

    // duration calculation
    let mut duration_ms: i64 = if let (Some(tb), Some(nf)) = (time_base, n_frames) {
        let time = tb.calc_time(nf);
        (time.seconds as i64 * 1000) + (time.frac as f64 * 1000.0) as i64
    } else {
        -1
    };

    // Full packet scan fallback
    if duration_ms == -1 {
        if let Some(tb) = time_base {
            reader.seek(
                SeekMode::Accurate,
                SeekTo::Time {
                    time: Time::new(0, 0.0),
                    track_id: Some(track_id),
                },
            )?;

            let mut total_dur = 0u64;
            loop {
                match reader.next_packet() {
                    Ok(packet) => {
                        if packet.track_id() == track_id {
                            total_dur = total_dur.saturating_add(packet.dur);
                        }
                    }
                    Err(symphonia::core::errors::Error::IoError(err))
                        if err.kind() == std::io::ErrorKind::UnexpectedEof =>
                    {
                        break;
                    }
                    Err(e) => return Err(Box::new(e)),
                }
            }

            let time = tb.calc_time(total_dur);
            duration_ms = (time.seconds as i64 * 1000) + (time.frac as f64 * 1000.0) as i64;
        }
    }

    let file_format = Path::new(src_path)
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown")
        .to_lowercase();

    let date_added = Local::now().format("%Y%m%d").to_string().parse::<i64>()?;

    Ok(ExtractedTrack {
        file_path: src_path.to_string(),
        title,
        artist,
        album,
        duration_ms,
        file_format,
        file_size,
        date_added,
        thumbnail_data,
        thumbnail_mime,
    })
}
