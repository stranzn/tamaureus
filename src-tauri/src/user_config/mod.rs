use std::fs;
use tauri::{AppHandle, Manager}; // Required for .path() extension trait

#[allow(dead_code)]
#[tauri::command]
pub fn save_music_dir(app: AppHandle, path: String) -> Result<(), String> {
    // 1. Get the config directory from the AppHandle
    // If we want the settings file to be in local instead of roaming, use app.path().app_local_config_dir()
    let config_dir = app.path().app_config_dir()
        .map_err(|_| "Could not find config directory".to_string())?;

    // 2. Create the directory if it doesn't exist (v2 won't always auto-create it)
    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }

    let config_path = config_dir.join("settings.txt");

    // 3. Write the file
    fs::write(config_path, path).map_err(|e| e.to_string())
}


#[allow(dead_code)]
#[tauri::command]
pub fn load_music_dir(app: AppHandle) -> Option<String> {
    // Get path via AppHandle
    let config_path = app.path().app_config_dir().ok()?.join("settings.txt");

    fs::read_to_string(config_path).ok()
}
