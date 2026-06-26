use sqlx::FromRow;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Artist {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Album {
    pub id: i64,
    pub title: String,
    pub artist_id: i64,
    pub cover_path: Option<String>
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct Track {
    pub id: i64,
    pub file_path: String,
    pub title: String,
    pub artist_id: i64,
    pub album_id: i64,
    pub duration_ms: i64,
    pub file_format: String, // ex. "mp3"
    pub file_size: f64,
    pub date_added: Option<i64>, // ex. 20260112
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_base64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_mime: Option<String>,

    pub artist_name: Option<String>,
    pub album_name:  Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtractedTrack {
    pub file_path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_ms: i64,
    pub file_format: String, // ex. "mp3"
    pub file_size: f64,
    pub date_added: Option<i64>, // ex. 20260112
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_base64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_mime: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub cover_path: Option<String>,
    pub cover_color: Option<String>,
    pub is_system: bool,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PlaylistPreview {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub cover_path: Option<String>,
    pub track_count: i64,
    pub thumb1_base64: Option<String>,
    pub thumb1_mime: Option<String>,
    pub thumb2_base64: Option<String>,
    pub thumb2_mime: Option<String>,
    pub thumb3_base64: Option<String>,
    pub thumb3_mime: Option<String>,
    pub thumb4_base64: Option<String>,
    pub thumb4_mime: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct QueueItem {
    pub queue_item_id: i64,
    pub position: i64,
    pub track_id: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueueResponse {
    pub items: Vec<QueueItemWithTrack>,
    pub current_position: usize,
    pub repeat_mode: String,    // "none", "one", "all"
    pub shuffle_enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct QueueItemWithTrack {
    pub queue_item_id: i64,
    pub position: i64,
    pub track_id: i64,
    
    // track w/ metadata
    pub title: String,
    pub file_path: String,
    pub duration_ms: i64,
    pub artist_name: String,
    pub album_title: String,
    pub cover_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_base64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thumbnail_mime: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct QueueStateRow {
    pub current_position: Option<i64>,
    pub repeat_mode: Option<String>,
    pub shuffle_enabled: Option<bool>,
}

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::SqlitePool,
    pub queue: std::sync::Arc<tokio::sync::Mutex<crate::playback_queue::AppQueue>>
}
