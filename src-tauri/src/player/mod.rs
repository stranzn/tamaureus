use crate::models::AudioPlayer;
use rodio::{Decoder, Sink, Source};
use std::sync::{Mutex, Arc};
use std::fs::File;
use std::io::BufReader;
use std::time::Duration;
use rodio::source::SeekError;

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

    // Inside impl AudioPlayer
    pub fn play(&self, path: String) -> Result<f64, String> {
        let file = File::open(&path).map_err(|e| format!("Failed to open file: {}", e))?;
        let source = Decoder::new(BufReader::new(file))
            .map_err(|e| format!("Failed to decode audio: {}", e))?;

        // --- NEW: Extract duration ---
        // source.total_duration() returns an Option<Duration>
        let duration = source.total_duration()
            .map(|d| d.as_secs_f64())
            .unwrap_or(0.0);
        // ----------------------------

        let sink = self.get_sink();
        sink.stop(); // Clear any previous track
        sink.append(source);
        sink.play();
        
        // Return the duration instead of ()
        Ok(duration)
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

   pub fn seek(&self, seconds: f32) -> Result<(), String> {
        let pos = Duration::from_secs_f32(seconds.max(0.0));
        let sink = self.get_sink();

        match sink.try_seek(pos) {
            Ok(()) => Ok(()),
            Err(SeekError::NotSupported { underlying_source }) => {
                // Optional: log it
                eprintln!("Seeking not supported by: {}", underlying_source);
                Err("Seeking not supported for this track (fallback not implemented)".to_string())
                // Or: trigger your old reload+skip method as fallback
                // self.seek_fallback(path, seconds)
            }
            Err(other) => Err(format!("Seek failed: {:?}", other)),
        }
    }


    pub fn get_position_secs(&self) -> f32 {
        let sink = self.get_sink();
        let pos = sink.get_pos();
        
        // Debug print – VERY useful!
        // println!("Current position reported: {:?}", pos);
        
        pos.as_secs_f32()   // or .as_millis() as f32 / 1000.0
    }
    
}

#[tauri::command]
pub fn play_track(path: String, player: tauri::State<'_, AudioPlayer>) -> Result<f64, String> {
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

#[tauri::command]
pub fn seek_track(seconds: f32, player: tauri::State<'_, AudioPlayer>) -> Result<(), String> {
    player.seek(seconds)
}

#[tauri::command]
pub fn get_position(player: tauri::State<'_, AudioPlayer>) -> f32 {
    player.get_position_secs()
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