// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod db;
mod models;
mod user_config;
mod player;
mod utils;

use sqlx::{sqlite::SqlitePoolOptions};
use tauri::Manager;



fn get_db_path(app: &tauri::AppHandle) -> String {
    let path = app
        .path()
        .app_local_data_dir()
        .expect("Failed to get app data dir")
        .join("tamaureus.db");

    // Ensure directory exists
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).expect("Failed to create data dir");
    }

    format!("sqlite://{}?mode=rwc", path.display())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let db_url = get_db_path(&app.handle());

            let pool = tauri::async_runtime::block_on(
                SqlitePoolOptions::new()
                    .max_connections(10)
                    .connect(&db_url),
            )
            .expect("Failed to create DB pool");

            // Run migrations
            tauri::async_runtime::block_on(sqlx::migrate!().run(&pool))
                .expect("Failed to run migrations");

            app.manage(models::AppState { db: pool });

            let audio_player = models::AudioPlayer::new();
            app.manage(audio_player);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // db::get_artists, 
            // db::add_artist, 
            user_config::save_music_dir, 
            user_config::load_music_dir, 
            player::play_track,
            player::pause,
            player::resume,
            player::stop_track,
            player::set_volume,
            player::get_playback_state])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}