import { createSignal, createRoot } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { playerStore } from "./playerStore";

// ── types ──────────────────────────────────────────────────────────────────

interface QueueTrack {
  queue_item_id: number;
  position: number;
  track_id: number;
  title: string;
  file_path: string;
  duration_ms: number;
  artist_name: string;
  album_title: string;
  cover_path: string | null;
  thumbnail_base64: string | null;
  thumbnail_mime: string | null;
}

interface QueueState {
  items: QueueTrack[];
  current_position: number;
  repeat_mode: "none" | "one" | "all";
  shuffle_enabled: boolean;
}

// ── store ──────────────────────────────────────────────────────────────────

function createQueueStore() {
  const [items, setItems] = createSignal<QueueTrack[]>([]);
  const [currentPosition, setCurrentPosition] = createSignal(0);
  const [repeatMode, setRepeatMode] = createSignal<"none" | "one" | "all">(
    "none",
  );
  const [shuffleEnabled, setShuffleEnabled] = createSignal(false);
  const [isOpen, setIsOpen] = createSignal(false);

  // ── sync from backend ────────────────────────────────────────────────────

  const syncFromBackend = async () => {
    try {
      const state = await invoke<QueueState>("queue_get");
      setItems(state.items);
      setCurrentPosition(state.current_position);
      setRepeatMode(state.repeat_mode);
      setShuffleEnabled(state.shuffle_enabled);
    } catch (e) {
      console.error("Failed to sync queue:", e);
    }
  };

  // load queue state on startup
  syncFromBackend();

  // ── internal helpers ─────────────────────────────────────────────────────

  const currentTrack = () => items()[currentPosition()] ?? null;

  const playTrackAtPosition = async (position: number) => {
    const track = items()[position];
    if (!track) return;

    try {
      await invoke("queue_set_position", { position });
      setCurrentPosition(position);
      await playerStore.loadAndPlay(
        track.file_path,
        track.title,
        track.artist_name,
        track.thumbnail_base64 ?? "",
        track.thumbnail_mime ?? "",
      );
    } catch (e) {
      console.error("Failed to play track at position:", e);
    }
  };

  // ── actions ──────────────────────────────────────────────────────────────

  const restoreFromQueue = async () => {
    await syncFromBackend();
    const track = queueStore.currentTrack();
    if (track) {
      try {
        const duration = await invoke<number>("load_track", {
          path: track.file_path,
        });
        playerStore.setCurrentPath(track.file_path);
        playerStore.setSongTitle(track.title);
        playerStore.setArtistName(track.artist_name);
        playerStore.setAlbumCover(
          track.thumbnail_base64
            ? `data:${track.thumbnail_mime};base64,${track.thumbnail_base64}`
            : "https://media.tenor.com/ifD1GaekwpoAAAAi/uma-musume-agnes-tachyon.gif",
        );
        playerStore.setDuration(duration);
        playerStore.setIsPlaying(false);
      } catch (e) {
        console.error("Failed to restore queue: ", e);
      }
    }
  };

  // play a track immediately — inserts at current position and starts playing
  const playNow = async (track: {
    track_id: number;
    file_path: string;
    title: string;
    artist_name: string;
    thumbnail_base64: string | null;
    thumbnail_mime: string | null;
  }) => {
    try {
      await invoke("queue_play_now", { trackId: track.track_id });
      await syncFromBackend();
      await playerStore.loadAndPlay(
        track.file_path,
        track.title,
        track.artist_name,
        track.thumbnail_base64 ?? "",
        track.thumbnail_mime ?? "",
      );
    } catch (e) {
      console.error("Failed to play now:", e);
    }
  };

  // add track to end of queue without interrupting playback
  const addToQueue = async (trackId: number) => {
    try {
      await invoke("queue_add_track", { trackId });
      await syncFromBackend();
    } catch (e) {
      console.error("Failed to add to queue:", e);
    }
  };

  const removeFromQueue = async (queueItemId: number) => {
    try {
      await invoke("queue_remove_track", { queueItemId });
      await syncFromBackend();
    } catch (e) {
      console.error("Failed to remove from queue:", e);
    }
  };

  const clearQueue = async () => {
    try {
      await invoke("queue_clear");
      await syncFromBackend();
    } catch (e) {
      console.error("Failed to clear queue:", e);
    }
  };

  const skipNext = async () => {
    const queue = items();
    if (queue.length === 0) return;

    const current = currentPosition();

    if (repeatMode() === "one") {
      // replay current track
      await playTrackAtPosition(current);
      return;
    }

    const nextPos = current + 1;

    if (nextPos >= queue.length) {
      if (repeatMode() === "all") {
        await playTrackAtPosition(0);
      }
      // repeat none — do nothing, end of queue
      return;
    }

    await playTrackAtPosition(nextPos);
  };

  const skipPrev = async () => {
    const queue = items();
    if (queue.length === 0) return;

    const current = currentPosition();

    // if more than 3 seconds in, restart current track instead of going back
    if (playerStore.currentTime() > 3) {
      await playerStore.seek(0);
      return;
    }

    const prevPos = current - 1;

    if (prevPos < 0) {
      if (repeatMode() === "all") {
        await playTrackAtPosition(queue.length - 1);
      } else {
        await playerStore.seek(0);
      }
      return;
    }

    await playTrackAtPosition(prevPos);
  };

  const cycleRepeat = async () => {
    const next =
      repeatMode() === "none" ? "all" : repeatMode() === "all" ? "one" : "none";
    try {
      await invoke("queue_set_repeat", { mode: next });
      setRepeatMode(next);
    } catch (e) {
      console.error("Failed to set repeat:", e);
    }
  };

  const toggleShuffle = async () => {
    try {
      const newVal = await invoke<boolean>("queue_toggle_shuffle");
      setShuffleEnabled(newVal);
    } catch (e) {
      console.error("Failed to toggle shuffle:", e);
    }
  };

  const moveTrack = async (queueItemId: number, newPosition: number) => {
    try {
      await invoke("queue_move_track", { queueItemId, newPosition });
      await syncFromBackend();
    } catch (e) {
      console.error("Failed to move track:", e);
    }
  };

  return {
    // state
    items,
    currentPosition,
    repeatMode,
    shuffleEnabled,
    isOpen,
    currentTrack,

    // actions
    restoreFromQueue,
    setIsOpen,
    syncFromBackend,
    playNow,
    addToQueue,
    removeFromQueue,
    clearQueue,
    skipNext,
    skipPrev,
    cycleRepeat,
    toggleShuffle,
    moveTrack,
  };
}

export const queueStore = createRoot(createQueueStore);
