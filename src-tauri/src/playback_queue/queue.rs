use crate::models::{QueueItem, QueueItemWithTrack, QueueResponse, QueueStateRow};
use sqlx::SqlitePool;

#[derive(Debug, Default)]
pub struct AppQueue {
    pub items: Vec<QueueItem>,
    pub current_position: usize,
    pub repeat_mode: RepeatMode,
    pub shuffle_enabled: bool,
    pub shuffled_order: Vec<usize>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RepeatMode {
    None,
    One,
    All,
}

impl Default for RepeatMode {
    fn default() -> Self {
        RepeatMode::None
    }
}

impl AppQueue {
    pub async fn load_from_db(db: &SqlitePool) -> Result<Self, String> {
        let items: Vec<QueueItem> = sqlx::query_as!(
            QueueItem,
            r#"
            SELECT id as queue_item_id, position, track_id
            FROM queue_items
            ORDER BY position ASC
            "#
        )
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

        let state = sqlx::query_as!(
            QueueStateRow,
            "SELECT current_position, repeat_mode, shuffle_enabled FROM queue_state WHERE id = 1"
        )
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or(QueueStateRow {
            current_position: Some(0),
            repeat_mode: Some("none".to_string()),
            shuffle_enabled: Some(false),
        });

        let mut queue = Self {
            items,
            current_position: state.current_position.unwrap_or(0) as usize,
            repeat_mode: match state.repeat_mode.unwrap_or_default().as_str() {
                "one" => RepeatMode::One,
                "all" => RepeatMode::All,
                _ => RepeatMode::None,
            },
            shuffle_enabled: state.shuffle_enabled.unwrap_or(false),
            ..Default::default()
        };
        
        queue.clamp_current_position();
        Ok(queue)
    }

    pub async fn reload_from_db(&mut self, db: &SqlitePool) -> Result<(), String> {
        let items = sqlx::query_as!(
            QueueItem,
            r#"
            SELECT id as queue_item_id, position, track_id
            FROM queue_items
            ORDER BY position ASC
            "#
        )
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

        self.items = items;
        self.clamp_current_position();
        Ok(())
    }

    fn clamp_current_position(&mut self) {
        if self.items.is_empty() {
            self.current_position = 0;
        } else if self.current_position >= self.items.len() {
            self.current_position = self.items.len() - 1;
        }
    }

    pub async fn save_state(&self, db: &SqlitePool) -> Result<(), String> {
        let pos = self.current_position as i64;
        let repeat = match self.repeat_mode {
            RepeatMode::None => "none",
            RepeatMode::One => "one",
            RepeatMode::All => "all",
        };
        sqlx::query!(
            "UPDATE queue_state SET current_position = ?, repeat_mode = ?, shuffle_enabled = ?, last_updated = unixepoch() WHERE id = 1",
            pos,
            repeat,
            self.shuffle_enabled
        )
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub async fn get_position_of_track(
        &self,
        track_id: i64,
        db: &SqlitePool,
    ) -> Result<Option<i64>, String> {
        sqlx::query_scalar!(
            "SELECT position FROM queue_items WHERE track_id = ? LIMIT 1",
            track_id
        )
        .fetch_optional(db)
        .await
        .map_err(|e| e.to_string())
    }

    pub async fn get_full_queue(&self, db: &SqlitePool) -> Result<QueueResponse, String> {
        let items = sqlx::query_as!(
            QueueItemWithTrack,
            r#"
            SELECT
                qi.id as queue_item_id,
                qi.position,
                qi.track_id,
                t.title,
                t.file_path,
                t.duration_ms,
                ar.name as artist_name,
                al.title as album_title,
                al.cover_path,
                t.thumbnail_base64,
                t.thumbnail_mime
            FROM queue_items qi
            JOIN tracks t ON qi.track_id = t.id
            JOIN artists ar ON t.artist_id = ar.id
            JOIN albums al ON t.album_id = al.id
            ORDER BY qi.position ASC
            "#
        )
        .fetch_all(db)
        .await
        .map_err(|e| e.to_string())?;

        Ok(QueueResponse {
            items,
            current_position: self.current_position,
            repeat_mode: match self.repeat_mode {
                RepeatMode::None => "none".to_string(),
                RepeatMode::One => "one".to_string(),
                RepeatMode::All => "all".to_string(),
            },
            shuffle_enabled: self.shuffle_enabled,
        })
    }
}
