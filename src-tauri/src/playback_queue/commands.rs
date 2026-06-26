use sqlx::SqlitePool;
use tauri::State;
use crate::models::AppState;
use crate::playback_queue::{AppQueue, RepeatMode};

// ── helpers ──────────────────────────────────────────────────────────────────

async fn repack_positions(db: &SqlitePool) -> Result<(), String> {
    sqlx::query!(
        r#"
        WITH ranked AS (
            SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS new_pos
            FROM queue_items
        )
        UPDATE queue_items
        SET position = (SELECT new_pos FROM ranked WHERE ranked.id = queue_items.id)
        "#
    )
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

// ── commands ──────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn queue_get(state: State<'_, AppState>) -> Result<crate::models::QueueResponse, String> {
    let queue = state.queue.lock().await;
    queue.get_full_queue(&state.db).await
}

#[tauri::command]
pub async fn queue_add_track(
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut queue = state.queue.lock().await;

    // check if the last track in the queue is the same
    let last_track_id: Option<i64> = sqlx::query_scalar!(
        "SELECT track_id FROM queue_items ORDER BY position DESC LIMIT 1"
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    if last_track_id == Some(track_id) {
        return Ok(()); // silently skip, not an error
    }

    let next_pos: i64 = sqlx::query_scalar!(
        "SELECT COALESCE(MAX(position) + 1, 0) FROM queue_items"
    )
    .fetch_one(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query!(
        "INSERT INTO queue_items (track_id, position) VALUES (?, ?)",
        track_id,
        next_pos
    )
    .execute(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    queue.reload_from_db(&state.db).await
}

#[tauri::command]
pub async fn queue_play_now(
    track_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut queue = state.queue.lock().await;
    let db = &state.db;

    repack_positions(db).await?;
    queue.reload_from_db(db).await?;

    // check if the last track in the queue is the same
    let last_track_id: Option<i64> = sqlx::query_scalar!(
        "SELECT track_id FROM queue_items ORDER BY position DESC LIMIT 1"
    )
    .fetch_optional(&state.db)
    .await
    .map_err(|e| e.to_string())?;

    if last_track_id == Some(track_id) {
        return Ok(()); // silently skip, not an error
    }

    let insert_pos = queue.current_position as i64;

    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    // shift everything at or after current position down by one
    sqlx::query!(
        "UPDATE queue_items SET position = position + 1 WHERE position >= ?",
        insert_pos
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    // insert new track at current position
    sqlx::query!(
        "INSERT INTO queue_items (track_id, position) VALUES (?, ?)",
        track_id,
        insert_pos
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    queue.reload_from_db(db).await?;
    queue.save_state(db).await
}

#[tauri::command]
pub async fn queue_remove_track(
    queue_item_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut queue = state.queue.lock().await;
    let db = &state.db;

    // get position of the item being removed before deleting
    let removed_pos: i64 = sqlx::query_scalar!(
        "SELECT position FROM queue_items WHERE id = ?",
        queue_item_id
    )
    .fetch_one(db)
    .await
    .map_err(|e| e.to_string())?;

    sqlx::query!(
        "DELETE FROM queue_items WHERE id = ?",
        queue_item_id
    )
    .execute(db)
    .await
    .map_err(|e| e.to_string())?;

    repack_positions(db).await?;

    // if removed track was before current position, shift current position back
    if removed_pos < queue.current_position as i64 && queue.current_position > 0 {
        queue.current_position -= 1;
    }

    queue.reload_from_db(db).await?;
    queue.save_state(db).await
}

#[tauri::command]
pub async fn queue_clear(state: State<'_, AppState>) -> Result<(), String> {
    let mut queue = state.queue.lock().await;
    let db = &state.db;

    sqlx::query!("DELETE FROM queue_items")
        .execute(db)
        .await
        .map_err(|e| e.to_string())?;

    queue.current_position = 0;
    queue.reload_from_db(db).await?;
    queue.save_state(db).await
}

#[tauri::command]
pub async fn queue_set_position(
    position: usize,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut queue = state.queue.lock().await;

    if queue.items.is_empty() {
        return Err("queue is empty".to_string());
    }
    if position >= queue.items.len() {
        return Err(format!(
            "position {} out of range (queue length {})",
            position,
            queue.items.len()
        ));
    }

    queue.current_position = position;
    queue.save_state(&state.db).await
}

#[tauri::command]
pub async fn queue_set_repeat(
    mode: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut queue = state.queue.lock().await;

    queue.repeat_mode = match mode.as_str() {
        "one" => RepeatMode::One,
        "all" => RepeatMode::All,
        "none" => RepeatMode::None,
        other => return Err(format!("invalid repeat mode: {}", other)),
    };

    queue.save_state(&state.db).await
}

#[tauri::command]
pub async fn queue_toggle_shuffle(state: State<'_, AppState>) -> Result<bool, String> {
    let mut queue = state.queue.lock().await;

    queue.shuffle_enabled = !queue.shuffle_enabled;

    if queue.shuffle_enabled {
        queue.shuffled_order = build_shuffled_order(&queue);
    } else {
        queue.shuffled_order.clear();
    }

    queue.save_state(&state.db).await?;
    Ok(queue.shuffle_enabled)
}

#[tauri::command]
pub async fn queue_move_track(
    queue_item_id: i64,
    new_position: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut queue = state.queue.lock().await;
    let db = &state.db;

    let old_position: i64 = sqlx::query_scalar!(
        "SELECT position FROM queue_items WHERE id = ?",
        queue_item_id
    )
    .fetch_one(db)
    .await
    .map_err(|e| e.to_string())?;

    if old_position == new_position {
        return Ok(());
    }

    let mut tx = db.begin().await.map_err(|e| e.to_string())?;

    // temporarily move the track out of the way to avoid unique index conflict
    sqlx::query!(
        "UPDATE queue_items SET position = -1 WHERE id = ?",
        queue_item_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    if new_position > old_position {
        // moving down: shift items between old and new up by one
        sqlx::query!(
            "UPDATE queue_items SET position = position - 1 WHERE position > ? AND position <= ?",
            old_position,
            new_position
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    } else {
        // moving up: shift items between new and old down by one
        sqlx::query!(
            "UPDATE queue_items SET position = position + 1 WHERE position >= ? AND position < ?",
            new_position,
            old_position
        )
        .execute(&mut *tx)
        .await
        .map_err(|e| e.to_string())?;
    }

    sqlx::query!(
        "UPDATE queue_items SET position = ? WHERE id = ?",
        new_position,
        queue_item_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;

    tx.commit().await.map_err(|e| e.to_string())?;

    // update current_position if it was affected by the move
    let current = queue.current_position as i64;
    if current == old_position {
        queue.current_position = new_position as usize;
    } else if new_position > old_position && current > old_position && current <= new_position {
        queue.current_position -= 1;
    } else if new_position < old_position && current >= new_position && current < old_position {
        queue.current_position += 1;
    }

    queue.reload_from_db(db).await?;
    queue.save_state(db).await
}

// ── shuffle helper ────────────────────────────────────────────────────────────

fn build_shuffled_order(queue: &AppQueue) -> Vec<usize> {
    use std::collections::VecDeque;

    let len = queue.items.len();
    if len == 0 {
        return vec![];
    }

    let current = queue.current_position;
    let mut indices: Vec<usize> = (0..len).filter(|&i| i != current).collect();

    // fisher-yates shuffle
    use std::time::{SystemTime, UNIX_EPOCH};
    let seed = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos() as usize;

    let mut rng_state = seed;
    for i in (1..indices.len()).rev() {
        rng_state ^= rng_state << 13;
        rng_state ^= rng_state >> 7;
        rng_state ^= rng_state << 17;
        let j = rng_state % (i + 1);
        indices.swap(i, j);
    }

    // current track plays first in shuffle order
    let mut result = VecDeque::from(indices);
    result.push_front(current);
    result.into()
}