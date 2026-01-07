use crate::models::{AppState, Artist};

#[allow(dead_code)]
#[tauri::command]
pub async fn get_artists(state: tauri::State<'_, AppState>) -> Result<Vec<Artist>, String> {
    sqlx::query_as::<_, Artist>("SELECT id, name FROM artists ORDER BY name")
        .fetch_all(&state.db)
        .await
        .map_err(|e| e.to_string())
}

#[allow(dead_code)]
#[tauri::command]
pub async fn add_artist(name: String, state: tauri::State<'_, AppState>) -> Result<i64, String> {
    let rowid = sqlx::query("INSERT INTO artists (name) VALUES (?)")
        .bind(name.trim())
        .execute(&state.db)
        .await
        .map_err(|e| format!("Database error: {}", e))?
        .last_insert_rowid();
    Ok(rowid)
}