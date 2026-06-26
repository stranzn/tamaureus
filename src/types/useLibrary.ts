import { createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { invoke } from "@tauri-apps/api/core";
import { open, ask } from "@tauri-apps/plugin-dialog";
import { musicUpload } from "../components/modals/music_upload";
import { playerStore } from "../store/playerStore";
import type { Track, Playlist } from "../types/library";

export function useLibrary() {
  const { loadAndPlay, currentPath, isPlaying, pauseAudio, resumeAudio } = playerStore;
  const navigate = useNavigate();
  const { Modal, openModal } = musicUpload();

  const [tracks, setTracks] = createSignal<Track[]>([]);
  const [playlists, setPlaylists] = createSignal<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [viewMode, setViewMode] = createSignal<"grid" | "list">("grid");
  const [currentUploadPath, setCurrentUploadPath] = createSignal("");
  const [meta, setMeta] = createSignal({
    title: "", artist: "", album: "", fileFormat: "",
    fileSize: 0, duration: 0, dateAdded: 0,
    thumbBase64: "", thumbMime: ""
  });

  const [contextMenu, setContextMenu] = createSignal({
    show: false, x: 0, y: 0, track: null as Track | null
  });

  const [playlistContextMenu, setPlaylistContextMenu] = createSignal({
    show: false, x: 0, y: 0, playlist: null as Playlist | null
  });

  const filteredTracks = createMemo(() =>
    tracks().filter(t => t.title?.toLowerCase().includes(searchQuery().toLowerCase()))
  );

  const handleGlobalClick = () => {
    if (contextMenu().show) setContextMenu({ ...contextMenu(), show: false });
    if (playlistContextMenu().show) setPlaylistContextMenu({ ...playlistContextMenu(), show: false });
  };

  onMount(() => document.addEventListener("click", handleGlobalClick));
  onCleanup(() => document.removeEventListener("click", handleGlobalClick));

  onMount(async () => {
    try {
      const [trackData, playlistData] = await Promise.all([
        invoke<Track[]>("get_tracks_with_names"),
        invoke<any[]>("get_playlists_with_previews"),
      ]);
      setTracks(trackData);

      const playlistsWithCovers = await Promise.all(
        playlistData.map(async (p) => {
          let cover_url: string | null = null;
          if (p.cover_path) {
            try {
              const base64 = await invoke<string>("read_file_as_base64", { path: p.cover_path });
              const ext = p.cover_path.split('.').pop()?.toLowerCase();
              const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
              cover_url = `data:${mime};base64,${base64}`;
            } catch {
              cover_url = null;
            }
          }

          const thumbnails = [
            p.thumb1_base64 ? { base64: p.thumb1_base64, mime: p.thumb1_mime } : null,
            p.thumb2_base64 ? { base64: p.thumb2_base64, mime: p.thumb2_mime } : null,
            p.thumb3_base64 ? { base64: p.thumb3_base64, mime: p.thumb3_mime } : null,
            p.thumb4_base64 ? { base64: p.thumb4_base64, mime: p.thumb4_mime } : null,
          ].filter(Boolean) as { base64: string; mime: string }[];

          return { ...p, cover_url, thumbnails } as Playlist;
        })
      );
      setPlaylists(playlistsWithCovers);
    } catch (err) {
      console.error("Failed to load library:", err);
    }
  });

  const handleContextMenu = (e: MouseEvent, track: Track) => {
    e.preventDefault();
    setContextMenu({ show: true, x: e.pageX, y: e.pageY, track });
  };

  const handlePlaylistContextMenu = (e: MouseEvent, playlist: Playlist) => {
    e.preventDefault();
    setPlaylistContextMenu({ show: true, x: e.pageX, y: e.pageY, playlist });
  };

  const handleDelete = async () => {
    const track = contextMenu().track;
    setContextMenu({ ...contextMenu(), show: false });
    if (!track) return;

    const confirm = await ask(
      `Are you sure you want to delete "${track.title}"?\nThis will delete the file from your system.`,
      { title: "Delete Track", kind: "warning" }
    );
    if (confirm) {
      try {
        await invoke("remove_track", { trackId: track.id });
        setTracks((prev) => prev.filter((t) => t.file_path !== track.file_path));
      } catch (err) {
        console.error("Failed to delete:", err);
      }
    }
  };

  const handleDeletePlaylist = async () => {
    const playlist = playlistContextMenu().playlist;
    setPlaylistContextMenu({ ...playlistContextMenu(), show: false });
    if (!playlist) return;

    const confirm = await ask(
      `Are you sure you want to delete "${playlist.name}"?\nThis cannot be undone.`,
      { title: "Delete Playlist", kind: "warning" }
    );
    if (confirm) {
      try {
        await invoke("delete_playlist", { id: playlist.id });
        setPlaylists((prev) => prev.filter((p) => p.id !== playlist.id));
      } catch (err) {
        console.error("Failed to delete playlist:", err);
      }
    }
  };

  async function selectAudioFiles() {
    const srcPath = await open({
      multiple: false,
      title: "Select Music Tracks",
      filters: [{ name: "Audio Files", extensions: ["mp3", "wav", "ogg", "m4a", "flac"] }],
    });

    if (srcPath && typeof srcPath === "string") {
      setCurrentUploadPath(srcPath);
      try {
        const metadata = await invoke<any>("get_track_metadata", { path: srcPath });
        setMeta({
          title: metadata.title, artist: metadata.artist, album: metadata.album,
          fileFormat: metadata.file_format, fileSize: metadata.file_size,
          duration: metadata.duration_ms, dateAdded: metadata.date_added,
          thumbBase64: metadata.thumbnail_base64, thumbMime: metadata.thumbnail_mime,
        });
        openModal();
      } catch (err) {
        console.error(err);
      }
    }
  }

  const createPlaylist = async () => {
    try {
      const newId = await invoke<number>("save_playlist", {
        name: "New Playlist",
        description: null,
        coverPath: null,
        trackIds: [],
      });
      navigate(`/playlist/${newId}`);
    } catch (err) {
      console.error("Failed to create playlist:", err);
    }
  };

  // Extracted to avoid duplicating play/pause logic across both view modes
  const handleTrackClick = (track: Track) => {
    if (currentPath() === track.file_path) {
      isPlaying() ? pauseAudio() : resumeAudio();
    } else {
      loadAndPlay(
        track.file_path,
        track.title,
        track.artist_name,
        track.thumbnail_base64 ?? "",
        track.thumbnail_mime ?? ""
      );
    }
  };

  return {
    // State
    tracks, playlists,
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    filteredTracks,
    contextMenu, setContextMenu,
    playlistContextMenu, setPlaylistContextMenu,
    // Player accessors — passed as functions so children stay reactive
    currentPath, isPlaying,
    // Handlers
    handleContextMenu, handlePlaylistContextMenu,
    handleDelete, handleDeletePlaylist,
    handleTrackClick, selectAudioFiles, createPlaylist,
    // Upload modal
    Modal, currentUploadPath, meta,
    // Navigation
    navigate,
  };
}