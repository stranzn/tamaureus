use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use tokio::process::Command;

use crate::models::{AppState, ExtractedTrack};
use crate::user_config::read_settings;
use crate::utils::ytdlp_controller::ytdlp_binary_path;

#[derive(Debug, Deserialize)]
struct YtdlpMetadata {
    title: Option<String>,
    artist: Option<String>,
    uploader: Option<String>,
    channel: Option<String>,
    album: Option<String>,
    duration: Option<f64>, // seconds, may be fractional
}

#[derive(Debug, Serialize, Clone)]
pub struct DownloadResult {
    pub id: i64,
    pub duplicate: bool,
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c => c,
        })
        .collect()
}

// reads the embedded (already cropped/converted-to-jpg) thumbnail back out of the file's ID3 tag
fn extract_embedded_thumbnail(path: &Path) -> Option<(String, String)> {
    let tag = id3::Tag::read_from_path(path).ok()?;
    let picture = tag.pictures().next()?;

    let mime = if picture.mime_type.is_empty() {
        "image/jpeg".to_string()
    } else {
        picture.mime_type.clone()
    };

    let b64 = general_purpose::STANDARD.encode(&picture.data);
    Some((b64, mime))
}

// falls back to app_data_dir/library if the user hasn't set a music dir in settings yet
fn resolve_music_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let settings = read_settings(app);
    if !settings.music_dir.is_empty() {
        return Ok(PathBuf::from(settings.music_dir));
    }

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("library");
    Ok(dir)
}

// holding area for files that have been downloaded but not yet confirmed/inserted
fn pending_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("pending-imports");
    Ok(dir)
}

fn nonce() -> Result<String, String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos()
        .to_string())
}

// step 1: download + extract metadata, stage the file, return it for the user to review/edit.
// does NOT touch the database.
#[tauri::command]
pub async fn download_song(app: AppHandle, url: String) -> Result<ExtractedTrack, String> {
    let binary_path = ytdlp_binary_path(&app)?;
    if !binary_path.exists() {
        return Err("yt-dlp is not installed".to_string());
    }

    let job_id = nonce()?;
    let job_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("yt-dlp-tmp")
        .join(&job_id);
    tokio::fs::create_dir_all(&job_dir)
        .await
        .map_err(|e| e.to_string())?;

    let output_template = job_dir.join("%(title)s.%(ext)s");

    let mut command = Command::new(&binary_path);
    command
        .arg("-x")
        .arg("--audio-format")
        .arg("mp3")
        .arg("--audio-quality")
        .arg("0")
        .arg("--embed-thumbnail")
        .arg("--embed-metadata")
        .arg("--convert-thumbnails")
        .arg("jpg")
        .arg("--ppa")
        .arg("ThumbnailsConvertor+ffmpeg_o:-vf crop='ih:ih'")
        .arg("--replace-in-metadata")
        .arg("title")
        .arg(r"(?i)\s([([].?official.* [)]]|\bfree\b|lyric video|video|clip|4k|hd|8k)")
        .arg("")
        .arg("--extractor-args")
        .arg("youtube:player_client=android")
        .arg("--no-playlist")
        .arg("--print-json")
        .arg("--output")
        .arg(output_template.to_string_lossy().to_string())
        .arg(&url)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        command.creation_flags(CREATE_NO_WINDOW);
    }

    let output = command.output().await.map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let _ = tokio::fs::remove_dir_all(&job_dir).await;
        return Err(format!("yt-dlp failed: {}", stderr));
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let metadata: YtdlpMetadata = stdout
        .lines()
        .find_map(|line| serde_json::from_str::<YtdlpMetadata>(line).ok())
        .ok_or_else(|| "could not parse yt-dlp metadata output".to_string())?;

    let title = metadata
        .title
        .clone()
        .unwrap_or_else(|| "Unknown Title".to_string());
    let artist = metadata
        .artist
        .clone()
        .or(metadata.uploader.clone())
        .or(metadata.channel.clone())
        .unwrap_or_else(|| "Unknown Artist".to_string());
    let album = metadata
        .album
        .clone()
        .unwrap_or_else(|| "Unknown Album".to_string());
    let duration_ms = metadata.duration.map(|d| (d * 1000.0) as i64).unwrap_or(0);

    // job_dir should contain exactly one file: the finished, thumbnail-embedded mp3
    let mut entries = tokio::fs::read_dir(&job_dir)
        .await
        .map_err(|e| e.to_string())?;
    let downloaded_path = match entries.next_entry().await.map_err(|e| e.to_string())? {
        Some(entry) => entry.path(),
        None => {
            let _ = tokio::fs::remove_dir_all(&job_dir).await;
            return Err("yt-dlp produced no output file".to_string());
        }
    };

    let file_meta = tokio::fs::metadata(&downloaded_path)
        .await
        .map_err(|e| e.to_string())?;
    let file_size = file_meta.len() as i64;

    // id3 reading is blocking file IO — keep it off the async runtime
    let thumb_path = downloaded_path.clone();
    let (thumbnail_base64, thumbnail_mime) =
        tokio::task::spawn_blocking(move || extract_embedded_thumbnail(&thumb_path))
            .await
            .map_err(|e| e.to_string())?
            .map(|(b, m)| (Some(b), Some(m)))
            .unwrap_or((None, None));

    // move into staging (not the real library yet) — final filename/location depends on
    // whatever the user confirms, which may differ from this extracted metadata
    let staging_dir = pending_dir(&app)?;
    tokio::fs::create_dir_all(&staging_dir)
        .await
        .map_err(|e| e.to_string())?;
    let staged_path = staging_dir.join(format!("{}.mp3", job_id));
    tokio::fs::rename(&downloaded_path, &staged_path)
        .await
        .map_err(|e| e.to_string())?;
    let _ = tokio::fs::remove_dir_all(&job_dir).await;

    Ok(ExtractedTrack {
        file_path: staged_path.to_string_lossy().to_string(),
        title,
        artist,
        album,
        duration_ms,
        file_format: "mp3".to_string(),
        file_size,
        date_added: None,
        thumbnail_base64,
        thumbnail_mime,
    })
}

// step 2: user has reviewed/edited the metadata — finalize the file location and insert.
#[tauri::command]
pub async fn confirm_track_import(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
    extracted: ExtractedTrack,
) -> Result<DownloadResult, String> {
    let staged_path = PathBuf::from(&extracted.file_path);
    if !staged_path.exists() {
        return Err(
            "staged file no longer exists — it may have already been imported or discarded"
                .to_string(),
        );
    }

    let music_dir = resolve_music_dir(&app)?;
    tokio::fs::create_dir_all(&music_dir)
        .await
        .map_err(|e| e.to_string())?;

    let final_filename = format!(
        "{} - {}.{}",
        sanitize_filename(&extracted.artist),
        sanitize_filename(&extracted.title),
        extracted.file_format
    );
    let final_path = music_dir.join(&final_filename);
    let final_path_str = final_path.to_string_lossy().to_string();

    // duplicate check happens here, against the FINAL path — the user may have edited
    // title/artist since download, which changes what "duplicate" even means
    if let Some(existing_id) = state.track_exists(&final_path_str).await? {
        let _ = tokio::fs::remove_file(&staged_path).await;
        return Ok(DownloadResult {
            id: existing_id,
            duplicate: true,
        });
    }

    tokio::fs::rename(&staged_path, &final_path)
        .await
        .map_err(|e| e.to_string())?;

    let mut final_extracted = extracted;
    final_extracted.file_path = final_path_str;

    let id = state.add_track(final_extracted).await?;

    Ok(DownloadResult {
        id: id.abs(),
        duplicate: id < 0,
    })
}

// user backed out of the edit step without confirming — clean up the staged file
#[tauri::command]
pub async fn discard_pending_download(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    if path.exists() {
        tokio::fs::remove_file(&path)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// startup cleanup: removes anything left in pending-imports older than 24h
// (app closed between download and confirm, crash, etc.)
pub async fn cleanup_stale_pending_imports(app: &AppHandle) -> Result<(), String> {
    let dir = pending_dir(app)?;
    if !dir.exists() {
        return Ok(());
    }

    let cutoff = SystemTime::now() - Duration::from_secs(24 * 60 * 60);
    let mut entries = tokio::fs::read_dir(&dir).await.map_err(|e| e.to_string())?;

    while let Some(entry) = entries.next_entry().await.map_err(|e| e.to_string())? {
        let path = entry.path();
        if let Ok(meta) = entry.metadata().await {
            if let Ok(modified) = meta.modified() {
                if modified < cutoff {
                    let _ = tokio::fs::remove_file(&path).await;
                }
            }
        }
    }

    Ok(())
}
