import { createSignal, createRoot } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { onCleanup } from "solid-js";

function createPlayerStore() {
  // --- State ---
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [volume, setVolume] = createSignal([65]); // UI scale 0-100
  const [isMuted, setIsMuted] = createSignal(false);
  const [currentPath, setCurrentPath] = createSignal<string | null>(null);

  const [isDragging, setIsDragging] = createSignal(false);
  
  // Metadata (Usually updated when a new track is loaded)
  const [songTitle, setSongTitle] = createSignal("Song Title");
  const [artistName, setArtistName] = createSignal("Artist Name");
  const [albumCover, setAlbumCover] = createSignal("https://i.imgur.com/5rqnfP8.png");
  const [duration, setDuration] = createSignal(0);
  const [currentTime, setCurrentTime] = createSignal(0);

  // --- Logic Helpers ---

  // Converts 0-100 UI value to 0.0-1.0 Rust f32
  const normalizeVolume = (val: number) => val / 100;

  // --- Actions ---

  const togglePlay = async () => {
    // If we have nothing loaded, we can't play/resume
    if (!currentPath()) return;

    const currentlyPaused = !isPlaying();
    
    try {
      if (currentlyPaused) {
        // Rust command: pub fn resume(...)
        await invoke('resume');
        setIsPlaying(true);
      } else {
        // Rust command: pub fn pause(...)
        await invoke('pause');
        setIsPlaying(false);
      }
    } catch (e) {
      console.error("Playback toggle failed", e);
    }
  };

  /**
   * Call this when a user clicks a song in a list
   * Rust command: pub fn play_track(path: String, ...)
   */
    const loadAndPlay = async (path: string, title: string, artist: string) => {
    try {
      // Adding <number> here tells TS that the Rust Result<f64, String> 
      // will arrive as a TypeScript number
      const realDuration = await invoke<number>('play_track', { path });
      
      setCurrentPath(path);
      setSongTitle(title || "Unknown");
      setArtistName(artist || "");
      
      // Now realDuration is typed as 'number', so this won't error
      setDuration(realDuration); 
      
      setCurrentTime(0);
      setIsPlaying(true);
    } catch (e) {
      console.error("Failed to load track:", e);
    }
  };

  const setVolumeLevel = async (val: number[]) => {
    setVolume(val);
    const numericVolume = val[0];
    
    if (numericVolume > 0) setIsMuted(false);
    
    // Rust command: pub fn set_volume(volume: f32, ...)
    await invoke('set_volume', { volume: normalizeVolume(numericVolume) });
  };

  const toggleMute = async () => {
    const prevVolume = volume()[0];
    if (!isMuted()) {
      // Muting
      setIsMuted(true);
      await invoke('set_volume', { volume: 0.0 });
    } else {
      // Unmuting
      setIsMuted(false);
      await invoke('set_volume', { volume: normalizeVolume(prevVolume) });
    }
  };

  // DUMMY FUNCTION
  const skip = async (direction: 'next' | 'prev') => {
    console.log(`Skipping ${direction}...`);

    try {
      // 1. Tell Rust to stop the current audio
      await invoke('stop_track');

      // 2. Dummy Logic: Update UI with placeholder "Next" data
      // In a real app, you'd fetch the next song from a list/database
      const dummyTrack = direction === 'next' 
        ? { title: "Next Track", artist: "Future Artist", path: "dummy_path_next" }
        : { title: "Previous Track", artist: "Past Artist", path: "dummy_path_prev" };

      setSongTitle(dummyTrack.title);
      setArtistName(dummyTrack.artist);
      setCurrentTime(0);
      
      // We set isPlaying to false because stop_track clears the sink
      setIsPlaying(false);

      // Note: We don't call play_track here because the 'path' is fake,
      // but this allows your UI to reflect that a skip happened.
      
    } catch (e) {
      console.error("Skip failed", e);
    }
  };

   const previewSeek = (seconds: number) => {
      setCurrentTime(seconds);
  };

  const seek = async (seconds: number) => {
    // Optional guard (can be removed if seek doesn't need currentPath anymore)
    if (!currentPath()) return;

    // Optimistic UI update
    setCurrentTime(seconds);

    try {
      // Modern version – no path anymore!
      await invoke("seek_track", { seconds });
    } catch (err) {
      console.error("Seek failed:", err);
      // You could revert here if you want:
      // const realPos = await invoke<number>('get_position');
      // setCurrentTime(realPos);
    }
  }


  // Pause polling during drag to prevent fighting with preview
  const startPositionPolling = () => {
    const interval = setInterval(async () => {
      // Skip update when user is dragging the slider
      if (!isPlaying() || isDragging()) return;

      try {
        const pos = await invoke<number>('get_position');
        setCurrentTime(pos);
      } catch (e) {
        console.error("Position fetch failed", e);
      }
    }, 400); // ← 400ms is usually a good compromise

    onCleanup(() => clearInterval(interval));
  };

  startPositionPolling();

  return {
    isPlaying, volume, isMuted, songTitle, artistName, 
    albumCover, duration, currentTime,
    togglePlay, setVolumeLevel, toggleMute, seek, previewSeek, loadAndPlay, skip, currentPath, isDragging, setIsDragging,
  };
}

export const playerStore = createRoot(createPlayerStore);