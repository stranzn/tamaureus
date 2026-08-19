use chrono::{Datelike, Local};
use tauri::Manager;
use std::fs;
use std::path::Path;
use tauri::AppHandle;
use crate::user_config::read_settings;

pub mod tag_reader;

#[allow(dead_code)]
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

    // return early if paths are the same
    if src_path == dest_path {
        return Ok(dest_path.to_string_lossy().into_owned());
    }

    tokio::fs::rename(src_path, &dest_path)
        .await
        .map_err(|e| format!("Failed to move file: {}", e))?;

    Ok(dest_path.to_string_lossy().into_owned())
}

pub fn current_date_as_int() -> i64 {
    let now = Local::now();
    (now.year() as i64) * 10000 
        + (now.month() as i64) * 100 
        + (now.day() as i64)
}

#[allow(dead_code)]
#[tauri::command]
pub async fn read_file_as_base64(path: String) -> Result<String, String> {
    use base64::{Engine as _, engine::general_purpose};
    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    Ok(general_purpose::STANDARD.encode(&bytes))
}

#[allow(dead_code)]
#[tauri::command]
pub async fn delete_track_file(app: AppHandle, src_file: String) -> Result<String, String> {
    // defense in depth: even if the frontend forgets to gate this call,
    // refuse to delete anything unless the setting is actually enabled
    let settings = read_settings(&app);
    if !settings.delete_files_on_remove {
        return Err("deleting files on removal is disabled in settings".to_string());
    }
 
    let src_path = Path::new(&src_file);
 
    if !src_path.exists() {
        return Err(format!("file does not exist: {}", src_path.display()));
    }
 
    match fs::remove_file(src_path) {
        Ok(_) => {
            println!("successfully deleted {}", src_path.display());
            Ok(format!("deleted {}", src_path.display()))
        }
        Err(e) => {
            println!("failed to delete {}: {}", src_path.display(), e);
            Err(format!("failed to delete {}: {}", src_path.display(), e))
        }
    }
}

