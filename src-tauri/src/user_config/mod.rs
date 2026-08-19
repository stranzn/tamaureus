use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager}; // Required for .path() extension trait

#[derive(Serialize, Deserialize, Clone)]
pub(crate) struct Settings {
    #[serde(default)]
    pub music_dir: String,
    #[serde(default)]
    pub delete_files_on_remove: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            music_dir: String::new(),
            delete_files_on_remove: false,
        }
    }
}

// resolves the settings.txt path in app_config_dir, creating the dir if needed
fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|_| "Could not find config directory".to_string())?;

    if !config_dir.exists() {
        fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
    }

    Ok(config_dir.join("settings.txt"))
}

// reads settings.txt. new format is json; if parsing fails, falls back to
// treating the whole file as a legacy plain music-dir path
pub(crate) fn read_settings(app: &AppHandle) -> Settings {
    let path = match settings_path(app) {
        Ok(p) => p,
        Err(_) => return Settings::default(),
    };

    match fs::read_to_string(&path) {
        Ok(contents) => match serde_json::from_str::<Settings>(&contents) {
            Ok(settings) => settings,
            Err(_) => Settings {
                music_dir: contents.trim().to_string(),
                delete_files_on_remove: false,
            },
        },
        Err(_) => Settings::default(),
    }
}

fn write_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let path = settings_path(app)?;
    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_music_dir(app: AppHandle, path: String) -> Result<(), String> {
    let mut settings = read_settings(&app);
    settings.music_dir = path;
    write_settings(&app, &settings)
}

#[tauri::command]
pub fn load_music_dir(app: AppHandle) -> Option<String> {
    let settings = read_settings(&app);
    if settings.music_dir.is_empty() {
        None
    } else {
        Some(settings.music_dir)
    }
}

#[tauri::command]
pub fn save_delete_files_setting(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = read_settings(&app);
    settings.delete_files_on_remove = enabled;
    write_settings(&app, &settings)
}

#[tauri::command]
pub fn load_settings(app: AppHandle) -> Settings {
    read_settings(&app)
}