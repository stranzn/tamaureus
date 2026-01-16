
use crate::{models::{Album, AppState as Database, Artist, ExtractedTrack, Track}, utils::current_date_as_int};

#[allow(dead_code)]
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

    pub async fn find_or_create_artist(&self, name: &str) -> Result<i64, String> {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err("Artist name cannot be empty".to_string());
        }

        // Try to find
        if let Some(id) = sqlx::query_scalar!(
            "SELECT id FROM artists WHERE name = ? COLLATE NOCASE",
            trimmed
        )
        .fetch_one(&self.db)
        .await
        .map_err(|e| format!("Artist lookup failed: {}", e))?
        {
            return Ok(id);
        }

        // Create new
        let id = sqlx::query_scalar!(
            "INSERT INTO artists (name) VALUES (?) RETURNING id",
            trimmed
        )
        .fetch_one(&self.db)
        .await
        .map_err(|e| format!("Artist creation failed: {}", e))?;

        Ok(id)
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

    // checks for artist_id because album titles are not unique
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

    pub async fn find_or_create_album(&self, title: &str, artist_id: i64) -> Result<i64, String> {
        let trimmed = title.trim();
        if trimmed.is_empty() {
            return Err("Album title cannot be empty".to_string());
        }

        // Find existing album by title + artist
        if let Some(id) = sqlx::query_scalar!(
            "SELECT id FROM albums WHERE title = ? AND artist_id = ?",
            trimmed,
            artist_id
        )
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("Album lookup failed: {}", e))?
        {
            return Ok(id);
        }

        // Create new
        let id = sqlx::query_scalar!(
            "INSERT INTO albums (title, artist_id) VALUES (?, ?) RETURNING id",
            trimmed,
            artist_id
        )
        .fetch_one(&self.db)
        .await
        .map_err(|e| format!("Album creation failed: {}", e))?
        .ok_or_else(|| "Failed to get inserted album ID".to_string())?;

        Ok(id)
    }

    // track queries

    // TODO: implement functions for tracks

    pub async fn get_tracks(&self) -> Result<Vec<Track>, String> {
        sqlx::query_as::<_, Track>("SELECT id, file_path, title, artist_id, album_id, duration_ms, file_format, file_size, date_added FROM tracks ORDER BY title")
            .fetch_all(&self.db)
            .await
            .map_err(|e| format!("Database error: {}", e))
    }

    // opting to have struct as argument here because of the number of properties
    pub async fn add_track(&self, track: ExtractedTrack) -> Result<i64, String> {
        let file_path = track.file_path.clone();
        // check if artist and album already exist
        let artist_id = self.find_or_create_artist(&track.artist).await?;

        let album_id = self
            .find_or_create_album(&track.album, artist_id)
            .await?;

        let result = sqlx::query("INSERT OR IGNORE INTO tracks (file_path, title,
         artist_id, album_id, duration_ms, file_format, file_size, date_added, thumbnail_base64, thumbnail_mime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")       // might be None/0 if auto-generated
        .bind(&file_path)
        .bind(track.title)
        .bind(artist_id)
        .bind(album_id)
        .bind(track.duration_ms)
        .bind(track.file_format)
        .bind(track.file_size)
        .bind(track.date_added.unwrap_or_else(|| current_date_as_int()))
        .bind(track.thumbnail_base64.as_deref())
        .bind(track.thumbnail_mime.as_deref())
        .execute(&self.db)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        let inserted_id = result.last_insert_rowid();

        if inserted_id > 0 {
            return Ok(inserted_id);
        }

        // Was ignored → fetch existing id
        let existing_id: i64 = sqlx::query_scalar("SELECT id FROM tracks WHERE file_path = ?")
            .bind(&file_path)
            .fetch_one(&self.db)
            .await
            .map_err(|e| format!("Failed to find existing track: {}", e))?;

        Ok(existing_id)
    }
    // pub async fn remove_track();
    // pub async fn track_exists();

    // maintenance functions

    // pub async fn sync_database();
}

// Tauri Commands
#[allow(dead_code)]
#[tauri::command]
pub async fn get_artists(state: tauri::State<'_, Database>) -> Result<Vec<Artist>, String> {
    state.get_artists().await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn get_artist(state: tauri::State<'_, Database>, name: String) -> Result<Artist, String> {
    state.get_artist(name).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn add_artist(state: tauri::State<'_, Database>, name: String) -> Result<i64, String> {
    state.add_artist(name).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn remove_artist(state: tauri::State<'_, Database>, id: i64) -> Result<(), String> {
    state.remove_artist(id).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn artist_exists(
    state: tauri::State<'_, Database>,
    name: String,
) -> Result<bool, String> {
    state.artist_exists(&name).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn find_or_create_artist(
    state: tauri::State<'_, Database>,
    name: &str
) -> Result<i64, String> {
    state.find_or_create_artist(name).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn get_albums(state: tauri::State<'_, Database>) -> Result<Vec<Album>, String> {
    state.get_albums().await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn get_album(state: tauri::State<'_, Database>, title: String) -> Result<Album, String> {
    state.get_album(title).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn add_album(
    state: tauri::State<'_, Database>,
    title: String,
    artist_id: i64,
    cover_path: String,
) -> Result<i64, String> {
    state.add_album(title, artist_id, cover_path).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn remove_album(state: tauri::State<'_, Database>, id: i64) -> Result<(), String> {
    state.remove_album(id).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn album_exists(
    state: tauri::State<'_, Database>,
    title: String,
    artist_id: i64,
) -> Result<bool, String> {
    state.album_exists(&title, artist_id).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn find_or_create_album(
    state: tauri::State<'_, Database>,
    title: &str,
    artist_id: i64
) -> Result<i64, String> {
    state.find_or_create_album(title, artist_id).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn get_tracks(state: tauri::State<'_, Database>) -> Result<Vec<Track>, String> {
    state.get_tracks().await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn add_track(state: tauri::State<'_, Database>, track: ExtractedTrack) -> Result<i64, String> {
    state.add_track(track).await
}

