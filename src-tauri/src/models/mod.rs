use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, serde::Serialize, serde::Deserialize)]
pub struct Artist {
    pub id: i64,
    pub name: String,
}

#[derive(Debug, Clone, FromRow, serde::Serialize, serde::Deserialize)]
pub struct Album {
    pub id: i64,
    pub title: String,
    pub artist_id: i64,
    pub cover_path: Option<String>
}

pub struct Track {
    pub id: i64,
    pub file_path: String,
    pub title: String,
    pub artist_id: i64,
    pub album_id: i64,
    pub duration_ms: i64,
    pub file_format: String, // ex. "mp3"
    pub file_size: i64,
    pub date_added: i64 // ex. 20260112
}

#[derive(Debug)]
pub struct ExtractedTrack {
    pub file_path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub duration_ms: i64,
    pub file_format: String, // ex. "mp3"
    pub file_size: i64,
    pub date_added: i64, // ex. 20260112
    pub thumbnail_data: Option<Vec<u8>>,
    pub thumbnail_mime: Option<String>
}

#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::SqlitePool,
}
