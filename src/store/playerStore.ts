import { createSignal, createMemo, createRoot, onCleanup } from 'solid-js';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

function createPlayerStore() {
  // ── Core playback state ────────────────────────────────────────────────
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [currentPath, setCurrentPath] = createSignal<string | null>(null);
  const [duration, setDuration] = createSignal(0);
  const [currentTime, setCurrentTime] = createSignal(0);       // real backend time
  const [previewTime, setPreviewTime] = createSignal<number | null>(null); // during drag
  const [isDragging, setIsDragging] = createSignal(false);

  // UI-facing time (what the slider should show)
  const displayTime = createMemo(() => previewTime() ?? currentTime());

  // ── Other UI state ─────────────────────────────────────────────────────
  const [volume, setVolume] = createSignal([65]);
  const [isMuted, setIsMuted] = createSignal(false);

  const [songTitle, setSongTitle] = createSignal("Song Title");
  const [artistName, setArtistName] = createSignal("Artist Name");
  const [albumCover, setAlbumCover] = createSignal(
    "https://i.imgur.com/5rqnfP8.png"
  );

  // ── Versioning to prevent stale position updates after seek ────────────
  let localVersion = 0;

  // ── Backend position listener ──────────────────────────────────────────
  const setupListener = async () => {
    const unlisten = await listen<[number, number]>('audio_position', (event) => {
      const [pos, incomingVersion] = event.payload;

      // Only accept this update if:
      // 1. We're not currently dragging
      // 2. This is not an old/stale update from before our last seek
      if (!isDragging() && incomingVersion >= localVersion) {
        setCurrentTime(pos);
        localVersion = incomingVersion;
      }
    });

    onCleanup(() => unlisten());
  };

  setupListener();

  // ── Actions ─────────────────────────────────────────────────────────────

  const togglePlay = async () => {
    if (!currentPath()) return;
    const shouldPlay = !isPlaying();

    try {
      if (shouldPlay) {
        await invoke('resume');
      } else {
        await invoke('pause');
      }
      setIsPlaying(shouldPlay);
    } catch (e) {
      console.error("Playback toggle failed:", e);
    }
  };

  const loadAndPlay = async (path: string, title: string, artist: string) => {
    try {
      const realDuration = await invoke<number>('play_track', { path });

      // Reset sync state for new track
      localVersion = 0;
      setPreviewTime(null);

      setCurrentPath(path);
      setSongTitle(title || "Unknown");
      setArtistName(artist || "");
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

    await invoke('set_volume', { volume: numericVolume / 100 });
  };

  const toggleMute = async () => {
    const currentVol = volume()[0];
    if (!isMuted()) {
      setIsMuted(true);
      await invoke('set_volume', { volume: 0.0 });
    } else {
      setIsMuted(false);
      await invoke('set_volume', { volume: currentVol / 100 });
    }
  };

  const skip = async (direction: 'next' | 'prev') => {
    try {
      await invoke('stop_track');
      // TODO: implement actual next/prev track selection logic
      setIsPlaying(false);
      setCurrentTime(0);
      setPreviewTime(null);
    } catch (e) {
      console.error("Skip failed:", e);
    }
  };

  // Called continuously during drag (live preview)
  const previewSeek = (seconds: number) => {
    setPreviewTime(seconds);
  };

  // Called when user releases the slider (commit)
  const commitSeek = async (seconds: number) => {
    if (!currentPath()) return;

    setPreviewTime(null); // stop preview → show real time again
    setIsDragging(false);

    // Immediately increment version so stale backend messages are ignored
    localVersion++;
    setCurrentTime(seconds); // optimistic UI update

    try {
      await invoke("seek_track", { seconds });
    } catch (err) {
      console.error("Seek failed:", err);
      // Optional: could revert currentTime here if you want to be strict
    }
  };

  // For programmatic seeking (keyboard, buttons, etc) — no preview needed
  const seek = async (seconds: number) => {
    if (!currentPath()) return;

    localVersion++;
    setCurrentTime(seconds);
    setPreviewTime(null);

    try {
      await invoke("seek_track", { seconds });
    } catch (err) {
      console.error("Programmatic seek failed:", err);
    }
  };

  return {
    // State
    isPlaying,
    volume,
    isMuted,
    songTitle,
    artistName,
    albumCover,
    duration,
    currentTime,       // real backend time
    displayTime,       // ← what you should bind your slider to!
    currentPath,
    isDragging,

    // Actions
    setIsDragging,
    togglePlay,
    setVolumeLevel,
    toggleMute,
    previewSeek,
    commitSeek,
    seek,
    loadAndPlay,
    skip
  };
}

export const playerStore = createRoot(createPlayerStore);