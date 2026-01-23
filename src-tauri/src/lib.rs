mod db;
mod models;
mod player;
mod user_config;
mod utils;

use crate::player::AudioPlayer;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use std::str::FromStr;
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

            let connect_options =
                SqliteConnectOptions::from_str(&db_url)?
                    .create_if_missing(true) // ← This guarantees file creation
                    .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal);

            let pool = tauri::async_runtime::block_on(
                SqlitePoolOptions::new()
                    .max_connections(10)
                    .connect_with(connect_options),
            )
            .expect("Failed to create DB pool");

            // Run migrations
            tauri::async_runtime::block_on(sqlx::migrate!().run(&pool))
                .expect("Failed to run migrations");

            app.manage(models::AppState { db: pool });

            // Manage audio player
            let audio_player = AudioPlayer::new(app.handle().clone());
            app.manage(audio_player);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // database functions
            // artist functions
            db::get_artists,
            db::get_artist,
            db::add_artist,
            db::remove_artist,
            db::artist_exists,
            db::find_or_create_artist,
            // album functions
            db::get_albums,
            db::get_album,
            db::add_album,
            db::remove_album,
            db::album_exists,
            db::find_or_create_album,
            // track functions
            db::get_tracks,
            db::get_tracks_with_names,
            db::add_track,
            // user config functions
            user_config::save_music_dir,
            user_config::load_music_dir,
            // util functions
            utils::move_file_to_dir,
            utils::tag_reader::get_track_metadata,
            utils::get_user_song_dir,
            // player functions
            player::play_track,
            player::pause,
            player::resume,
            player::stop_track,
            player::set_volume,
            player::get_playback_state,
            player::seek_track,
            player::get_position
        ])
        .run(tauri::generate_context!())
        .expect("error running tauri application");
}
