use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, serde::Serialize, serde::Deserialize)]
pub struct Artist {
    pub id: i64,
    pub name: String,
}

pub struct AppState {
    pub db: sqlx::SqlitePool,
}