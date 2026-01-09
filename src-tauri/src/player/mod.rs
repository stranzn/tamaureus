use crate::models::AudioPlayer;
use rodio::{Decoder, Sink};
use std::sync::{Mutex, Arc};
use std::fs::File;
use std::io::BufReader;

// #[tauri::command]
// pub fn play_track(path: String, player: State<'_, AudioPlayer>) -> Result<(), String> {
//     // Open and decode the file
//     let file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
//     let source = Decoder::new(BufReader::new(file))
//         .map_err(|e| format!("Failed to decode audio: {}", e))?;

//     // Lock the stream to get access to the mixer
//     let stream_guard = player.stream.lock()
//         .map_err(|_| "Stream lock poisoned".to_string())?;

//     // Create a new sink connected to the stream's mixer
//     let new_sink =  Sink::connect_new(&stream_guard.mixer());

//     // Lock the sink and replace the old one
//     let mut sink_guard = player.sink.lock()
//         .map_err(|_| "Sink lock poisoned".to_string())?;

//     // Stop and drop the old sink if it exists
//     if let Some(old_sink) = sink_guard.take() {
//         old_sink.stop();
//     }

//     // Append the source and play
//     new_sink.append(source);
//     new_sink.play();

//     // Store the new sink
//     *sink_guard = Some(new_sink);

//     Ok(())
// }

#[allow(dead_code)]
impl AudioPlayer {
    pub fn new() -> Self {
        let stream = rodio::OutputStreamBuilder::open_default_stream()
            .expect("Failed to open default audio output stream");

        let sink = Sink::connect_new(&stream.mixer());

        Self {
            _stream: stream,
            sink: Arc::new(Mutex::new(sink)),
        }
    }

    fn get_sink(&self) -> std::sync::MutexGuard<'_, Sink> {
        self.sink
            .lock()
            .expect("Sink lock poisoned — this should never happen")
    }

    pub fn play(&self, path: String) -> Result<(), String> {
        let file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
        let source = Decoder::new(BufReader::new(file))
            .map_err(|e| format!("Failed to decode audio: {}", e))?;

        let sink = self.get_sink();
        sink.stop(); // Clear any previous track
        sink.append(source);
        sink.play();

        Ok(())
    }

    pub fn pause(&self) {
        let sink = self.get_sink();
        sink.pause();
    }

    pub fn resume(&self) {
        let sink = self.get_sink();
        sink.play();
    }

    pub fn stop(&self) {
        let sink = self.get_sink();
        sink.stop();
    }

    pub fn set_volume(&self, volume: f32) {
        let volume = volume.clamp(0.0, 1.0);
        let sink = self.get_sink();
        sink.set_volume(volume);
    }

    pub fn is_paused(&self) -> bool {
        let sink = self.get_sink();
        sink.is_paused()
    }

    pub fn is_empty(&self) -> bool {
        let sink = self.get_sink();
        sink.empty()
    }

    pub fn volume(&self) -> f32 {
        let sink = self.get_sink();
        sink.volume()
    }
}

#[tauri::command]
pub fn play_track(path: String, player: tauri::State<'_, AudioPlayer>) -> Result<(), String> {
    player.play(path)
}

#[tauri::command]
pub fn pause(player: tauri::State<'_, AudioPlayer>) {
    player.pause();
}

#[tauri::command]
pub fn resume(player: tauri::State<'_, AudioPlayer>) {
    player.resume();
}

#[tauri::command]
pub fn stop_track(player: tauri::State<'_, AudioPlayer>) {
    player.stop();
}

#[tauri::command]
pub fn set_volume(volume: f32, player: tauri::State<'_, AudioPlayer>) {
    player.set_volume(volume);
}

#[derive(serde::Serialize)]
pub struct PlaybackState {
    pub is_paused: bool,
    pub is_empty: bool,
    pub volume: f32,
}

#[tauri::command]
pub fn get_playback_state(player: tauri::State<'_, AudioPlayer>) -> PlaybackState {
    PlaybackState {
        is_paused: player.is_paused(),
        is_empty: player.is_empty(),
        volume: player.volume(),
    }
}