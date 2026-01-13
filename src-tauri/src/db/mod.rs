use crate::models::{Album, AppState as Database, Artist, Track};

impl Database {
    // artist queries
    pub async fn get_artists(&self) -> Result<Vec<Artist>, String> {
        sqlx::query_as::<_, Artist>("SELECT id, name FROM artists ORDER BY name")
            .fetch_all(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn get_artist(&self, name: String) -> Result<Artist, String> {
        sqlx::query_as::<_, Artist>("SELECT id, name FROM artists WHERE name = ?")
            .bind(name)
            .fetch_one(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn add_artist(&self, name: String) -> Result<i64, String> {
        let name = name.trim().to_string();

        // try to insert, ignore if exists
        sqlx::query("INSERT OR IGNORE INTO artists (name) VALUES (?)")
            .bind(&name)
            .execute(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        // fetch id
        let (id,): (i64,) = sqlx::query_as("SELECT id FROM artists WHERE name = ?")
            .bind(&name)
            .fetch_one(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        Ok(id)
    }

    pub async fn remove_artist(&self, id: i64) -> Result<(), String> {
        sqlx::query("DELETE FROM artists WHERE id = ?")
            .bind(id)
            .execute(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        Ok(())
    }

    pub async fn artist_exists(&self, name: &str) -> Result<bool, String> {
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM artists WHERE name = ?")
            .bind(name.trim())
            .fetch_one(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        Ok(count.0 > 0)
    }

    // album queries
    pub async fn get_albums(&self) -> Result<Vec<Album>, String> {
        sqlx::query_as::<_, Album>(
            "SELECT id, title, artist_id, cover_path FROM albums ORDER BY title",
        )
        .fetch_all(&self.db)
        .await
        .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn get_album(&self, title: String) -> Result<Album, String> {
        sqlx::query_as::<_, Album>(
            "SELECT id, title, artist_id, cover_path FROM albums WHERE title = ?",
        )
        .bind(title)
        .fetch_one(&self.db)
        .await
        .map_err(|e| format!("Database error: {}", e))
    }

    pub async fn add_album(
        &self,
        title: String,
        artist_id: i64,
        cover_path: String,
    ) -> Result<i64, String> {
        let title = title.trim().to_string();
        let cover_path = cover_path.trim().to_string();

        sqlx::query("INSERT OR IGNORE INTO albums (title, artist_id, cover_path) VALUES (?, ?, ?)")
            .bind(&title)
            .bind(artist_id)
            .bind(&cover_path)
            .execute(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        let (id,): (i64,) =
            sqlx::query_as("SELECT id FROM albums WHERE title = ? AND artist_id = ?")
                .bind(&title)
                .bind(&artist_id)
                .fetch_one(&self.db)
                .await
                .map_err(|e| format!("Database error: {}", e))?;

        Ok(id)
    }

    pub async fn remove_album(&self, id: i64) -> Result<(), String> {
        sqlx::query("DELETE FROM albums WHERE id = ?")
            .bind(&id)
            .execute(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))?;

        Ok(())
    }

    pub async fn album_exists(&self, title: &str, artist_id: i64) -> Result<bool, String> {
        let count: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM albums WHERE title = ? AND artist_id = ?")
                .bind(title.trim())
                .bind(artist_id)
                .fetch_one(&self.db)
                .await
                .map_err(|e| format!("Database error: {}", e))?;
        Ok(count.0 > 0)
    }

    // track queries

    // TODO: implement functions for tracks

    // pub async fn get_tracks();
    // pub async fn add_track();
    // pub async fn remove_track();
    // pub async fn track_exists();

    // maintenance functions

    // pub async fn sync_database();
}

// Tauri Commands
#[tauri::command]
pub async fn get_artists(state: tauri::State<'_, Database>) -> Result<Vec<Artist>, String> {
    state.get_artists().await
}

#[tauri::command]
pub async fn get_artist(state: tauri::State<'_, Database>, name: String) -> Result<Artist, String> {
    state.get_artist(name).await
}

#[tauri::command]
pub async fn add_artist(state: tauri::State<'_, Database>, name: String) -> Result<i64, String> {
    state.add_artist(name).await
}

#[tauri::command]
pub async fn remove_artist(state: tauri::State<'_, Database>, id: i64) -> Result<(), String> {
    state.remove_artist(id).await
}

#[tauri::command]
pub async fn artist_exists(
    state: tauri::State<'_, Database>,
    name: String,
) -> Result<bool, String> {
    state.artist_exists(&name).await
}

#[tauri::command]
pub async fn get_albums(state: tauri::State<'_, Database>) -> Result<Vec<Album>, String> {
    state.get_albums().await
}

#[tauri::command]
pub async fn get_album(state: tauri::State<'_, Database>, title: String) -> Result<Album, String> {
    state.get_album(title).await
}

#[tauri::command]
pub async fn add_album(
    state: tauri::State<'_, Database>,
    title: String,
    artist_id: i64,
    cover_path: String,
) -> Result<i64, String> {
    state.add_album(title, artist_id, cover_path).await
}

#[tauri::command]
pub async fn remove_album(state: tauri::State<'_, Database>, id: i64) -> Result<(), String> {
    state.remove_album(id).await
}

#[tauri::command]
pub async fn album_exists(
    state: tauri::State<'_, Database>,
    title: String,
    artist_id: i64,
) -> Result<bool, String> {
    state.album_exists(&title, artist_id).await
}
