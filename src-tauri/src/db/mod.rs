use crate::models::{AppState, Artist};


// get artists alphabetically
#[allow(dead_code)]
#[tauri::command]
pub async fn get_artists(state: tauri::State<'_, AppState>) -> Result<Vec<Artist>, String> {
    sqlx::query_as::<_, Artist>("SELECT id, name FROM artists ORDER BY name")
        .fetch_all(&state.db)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

// add artist to database. ignore on duplicate name
#[allow(dead_code)]
#[tauri::command]
pub async fn add_artist(name: String, state: tauri::State<'_, AppState>) -> Result<i64, String> {
    let name = name.trim().to_string();

    // try to insert, ignore if exists
    sqlx::query("INSERT OR IGNORE INTO artists (name) VALUES (?)")
        .bind(&name)
        .execute(&state.db)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    // fetch id
    let (id,): (i64,) = sqlx::query_as("SELECT id FROM artists WHERE name = ?")
        .bind(&name)
        .fetch_one(&state.db)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(id)
}

// check if artist exists by name
#[allow(dead_code)]
#[tauri::command]
pub async fn artist_exists(name: &str, state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM artists WHERE name = ?")
        .bind(name.trim())
        .fetch_one(&state.db)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

    Ok(count.0 > 0)
}
