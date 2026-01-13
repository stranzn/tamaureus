use rodio::{Sink, Source};
use std::fs::File;
use std::io::BufReader;
use std::sync::mpsc::{channel, Sender};
use std::sync::atomic::{AtomicU32, Ordering};
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

// Global atomic to track playback "generations"
static SEEK_VERSION: AtomicU32 = AtomicU32::new(0);

pub enum AudioCommand {
    Play(String, Sender<Result<f64, String>>),
    Pause,
    Resume,
    Stop,
    SetVolume(f32),
    Seek(f32),
    GetPosition(Sender<f32>),
    GetState(Sender<PlaybackState>),
}

#[derive(Clone, Copy, serde::Serialize)]
pub struct PlaybackState {
    pub is_paused: bool,
    pub is_empty: bool,
    pub volume: f32,
}

pub struct AudioPlayer {
    pub tx: Sender<AudioCommand>,
}

#[allow(dead_code)]
fn start_audio_thread(app_handle: AppHandle) -> Sender<AudioCommand> {
    let (tx, rx) = channel::<AudioCommand>();

    thread::spawn(move || {
        let stream = rodio::OutputStreamBuilder::open_default_stream()
            .expect("Failed to open default audio output stream");
        let sink = Sink::connect_new(&stream.mixer());

        loop {
            while let Ok(cmd) = rx.try_recv() {
                match cmd {
                    AudioCommand::Play(path, reply) => {
                        let result: Result<f64, String> = (|| {
                            let file = File::open(&path)
                                .map_err(|e| format!("Failed to open file: {}", e))?;

                            let reader = BufReader::new(file);
                            let file_len = reader.get_ref().metadata().ok().map(|m| m.len()); // optional but helpful

                            let mut builder = rodio::Decoder::builder()
                                .with_data(reader);

                            // Very important for seeking support
                            if let Some(len) = file_len {
                                builder = builder.with_byte_len(len);
                            }
                            builder = builder.with_seekable(true); // ← enables seeking

                            let source = builder.build()
                                .map_err(|e| format!("Decoder build failed: {}", e))?;

                            let duration = source
                                .total_duration()
                                .map(|d| d.as_secs_f64())
                                .unwrap_or(0.0);

                            sink.stop();
                            sink.append(source);
                            sink.play();

                            // Reset version on new track
                            SEEK_VERSION.store(0, Ordering::SeqCst);

                            Ok(duration)
                        })();

                        let _ = reply.send(result);
                    }
                    AudioCommand::Pause => sink.pause(),
                    AudioCommand::Resume => sink.play(),
                    AudioCommand::Stop => sink.stop(),
                    AudioCommand::SetVolume(v) => sink.set_volume(v.clamp(0.0, 1.0)),
                    AudioCommand::Seek(seconds) => {
                        // Increment version to invalidate old position messages
                        SEEK_VERSION.fetch_add(1, Ordering::SeqCst);
                        let pos = Duration::from_secs_f32(seconds.max(0.0));
                        let _ = sink.try_seek(pos);
                    }
                    AudioCommand::GetPosition(reply) => {
                        let _ = reply.send(sink.get_pos().as_secs_f32());
                    }
                    AudioCommand::GetState(reply) => {
                        let _ = reply.send(PlaybackState {
                            is_paused: sink.is_paused(),
                            is_empty: sink.empty(),
                            volume: sink.volume(),
                        });
                    }
                }
            }

            // Emit streaming data
            if !sink.is_paused() && !sink.empty() {
                let position = sink.get_pos().as_secs_f32();
                let version = SEEK_VERSION.load(Ordering::SeqCst);
                // Payload is a tuple: (current_time, current_version)
                let _ = app_handle.emit("audio_position", (position, version));
            }

            thread::sleep(Duration::from_millis(50));
        }
    });

    tx
}

#[allow(dead_code)]
impl AudioPlayer {
    pub fn new(app_handle: AppHandle) -> Self {
        let tx = start_audio_thread(app_handle);
        Self { tx }
    }

    pub fn play(&self, path: String) -> Result<f64, String> {
        let (reply_tx, reply_rx) = channel();
        let _ = self.tx.send(AudioCommand::Play(path, reply_tx));
        reply_rx.recv().unwrap_or_else(|_| Err("Thread disconnected".into()))
    }

    pub fn pause(&self) { let _ = self.tx.send(AudioCommand::Pause); }
    pub fn resume(&self) { let _ = self.tx.send(AudioCommand::Resume); }
    pub fn stop(&self) { let _ = self.tx.send(AudioCommand::Stop); }
    pub fn set_volume(&self, volume: f32) { let _ = self.tx.send(AudioCommand::SetVolume(volume)); }
    pub fn seek(&self, seconds: f32) { let _ = self.tx.send(AudioCommand::Seek(seconds)); }
    
    pub fn get_position_secs(&self) -> f32 {
        let (reply_tx, reply_rx) = channel();
        let _ = self.tx.send(AudioCommand::GetPosition(reply_tx));
        reply_rx.recv().unwrap_or(0.0)
    }

    pub fn get_playback_state(&self) -> PlaybackState {
        let (reply_tx, reply_rx) = channel();
        let _ = self.tx.send(AudioCommand::GetState(reply_tx));
        reply_rx.recv().unwrap_or(PlaybackState { is_paused: true, is_empty: true, volume: 0.0 })
    }
}

// Tauri commands
#[allow(dead_code)]
#[tauri::command] pub fn play_track(path: String, player: State<'_, AudioPlayer>) -> Result<f64, String> { player.play(path) }

#[allow(dead_code)]
#[tauri::command] pub fn pause(player: State<'_, AudioPlayer>) { player.pause(); }

#[allow(dead_code)]
#[tauri::command] pub fn resume(player: State<'_, AudioPlayer>) { player.resume(); }

#[allow(dead_code)]
#[tauri::command] pub fn stop_track(player: State<'_, AudioPlayer>) { player.stop(); }

#[allow(dead_code)]
#[tauri::command] pub fn set_volume(volume: f32, player: State<'_, AudioPlayer>) { player.set_volume(volume); }

#[allow(dead_code)]
#[tauri::command] pub fn seek_track(seconds: f32, player: State<'_, AudioPlayer>) { player.seek(seconds); }

#[allow(dead_code)]
#[tauri::command] pub fn get_position(player: State<'_, AudioPlayer>) -> f32 { player.get_position_secs() }

#[allow(dead_code)]
#[tauri::command] pub fn get_playback_state(player: State<'_, AudioPlayer>) -> PlaybackState { player.get_playback_state() }