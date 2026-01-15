use chrono::{Datelike, Local};

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