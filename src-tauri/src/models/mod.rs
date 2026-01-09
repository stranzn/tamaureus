use sqlx::FromRow;
use std::sync::{Arc, Mutex};
use rodio::{OutputStream, Sink};

#[derive(Debug, Clone, FromRow, serde::Serialize, serde::Deserialize)]
pub struct Artist {
    pub id: i64,
    pub name: String,
}

pub struct AppState {
    pub db: sqlx::SqlitePool,
}

pub struct AudioPlayer {
    // Keeps the audio device open for the entire app lifetime
    pub _stream: OutputStream,
    // Shared sink we reuse for all playback
    pub sink: Arc<Mutex<Sink>>,
}