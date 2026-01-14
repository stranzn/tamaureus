use base64::{engine::general_purpose, Engine as _};
use chrono::prelude::*;
use lofty::prelude::{Accessor, AudioFile, TaggedFileExt};
use lofty::probe::Probe;
use std::path::Path;

use crate::models::ExtractedTrack;

pub fn extract_track_metadata(path: &str) -> Result<ExtractedTrack, String> {
    let path = Path::new(&path);

    // basic info
    let metadata = path
        .metadata()
        .map_err(|e| format!("Cannot read file metadata {}", e))?;
    let file_size_bytes = metadata.len();
    let file_size_mb = file_size_bytes as f64 / 1_048_576.0; // convert to mb

    // probe and read file
    let tagged_file = Probe::open(path)
        .expect("ERROR: Bad path provided.")
        .read()
        .expect("ERROR: Failed to read file");

    // get duration

    let properties = tagged_file.properties();
    let duration_ms = (properties.duration().as_millis() as i64).max(0);

    let tag = match tagged_file.primary_tag() {
        Some(primary_tag) => primary_tag,
        None => tagged_file.first_tag().expect("ERROR: No tags found"),
    };

    // get common fields
    let title = tag.title().unwrap_or_default().to_string();
    let artist = tag.artist().unwrap_or_default().to_string();
    let album = tag.album().unwrap_or_default().to_string();

    // date as YYYYMMDD integer
    let date_added = Local::now()
        .format("%Y%m%d")
        .to_string()
        .parse::<i64>()
        .unwrap_or(19700101);

    // attempt to get best picture
    let picture_opt = tag
        .pictures()
        .iter()
        .find(|p| p.pic_type() == lofty::picture::PictureType::CoverFront)
        .or_else(|| tag.pictures().first());

    let (thumbnail_base64, thumbnail_mime) = if let Some(pic) = picture_opt {
        let mime = pic.mime_type().as_ref().map(|m| m.to_string());
        let base64 = general_purpose::STANDARD.encode(&pic.data());
        (Some(base64), mime)
    } else {
        (None, None)
    };

    Ok(ExtractedTrack {
        file_path: path.to_string_lossy().into_owned(),
        title,
        artist,
        album,
        duration_ms,
        file_format: path.extension().and_then(|e| e.to_str()).map(|s| s.to_lowercase()).unwrap_or_else(|| "unknown".to_string()),
        file_size: file_size_mb as i64,
        date_added,
        thumbnail_base64,
        thumbnail_mime,
    })
}


#[tauri::command]
pub fn get_track_metadata(path: String) -> Result<ExtractedTrack, String> {
    extract_track_metadata(&path)
}