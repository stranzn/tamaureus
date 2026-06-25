import { Search, Plus, Play, Pause } from "lucide-solid";
import { musicUpload } from "../components/modals/music_upload";
import PlaylistCover from "../components/playlist/PlaylistCover";
import { useNavigate } from "@solidjs/router";
import { open, ask } from "@tauri-apps/plugin-dialog";
import ContextMenu from "../components/context-menu";
import { createMemo, createSignal, onCleanup, onMount, Show, For } from "solid-js";
import { invoke } from '@tauri-apps/api/core';
import { playerStore } from "../store/playerStore";

interface Track {
  id: number;
  file_path: string;
  title: string;
  artist_name: string;
  thumbnail_base64: string | null;
  thumbnail_mime: string | null;
}

interface Playlist {
  id: number;
  name: string;
  track_count: number;
  cover_path: string | null;
  cover_url: string | null;
  thumb1_base64: string | null;
  thumb1_mime: string | null;
  thumb2_base64: string | null;
  thumb2_mime: string | null;
  thumb3_base64: string | null;
  thumb3_mime: string | null;
  thumb4_base64: string | null;
  thumb4_mime: string | null;
  thumbnails: { base64: string; mime: string }[];
}

export default function Library() {
  const { loadAndPlay, currentPath, isPlaying, pauseAudio, resumeAudio } = playerStore;
  const [tracks, setTracks] = createSignal<Track[]>([]);
  const [playlists, setPlaylists] = createSignal<Playlist[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const { Modal, openModal } = musicUpload();
  const [currentUploadPath, setCurrentUploadPath] = createSignal("");
  const [meta, setMeta] = createSignal({
    title: "", artist: "", album: "", fileFormat: "",
    fileSize: 0, duration: 0, dateAdded: 0,
    thumbBase64: "", thumbMime: ""
  });

  const navigate = useNavigate();

  // for track context menu
  const [contextMenu, setContextMenu] = createSignal({
    show: false, x: 0, y: 0, track: null as Track | null
  });

  // for playlist context menu
  const [playlistContextMenu, setPlaylistContextMenu] = createSignal({
    show: false, x: 0, y: 0, playlist: null as Playlist | null
  });

  const filteredTracks = createMemo(() =>
    tracks().filter(t => t.title?.toLowerCase().includes(searchQuery().toLowerCase()))
  );

  // close menu on outside click
  const handleGlobalClick = () => {
    if (contextMenu().show) setContextMenu({ ...contextMenu(), show: false });
    if (playlistContextMenu().show) setPlaylistContextMenu({ ...playlistContextMenu(), show: false });
  };

  // this is an event listener that will close the context menu when clicking outside
  onMount(() => document.addEventListener("click", handleGlobalClick));
  onCleanup(() => document.removeEventListener("click", handleGlobalClick));

  // i think saving the file path is probably chud. we should just save base64 in the db
  onMount(async () => {
    try {
      const [trackData, playlistData] = await Promise.all([
        invoke<Track[]>("get_tracks_with_names"),
        invoke<any[]>("get_playlists_with_previews"),
      ]);
      setTracks(trackData);

      // Convert any cover_path to a base64 data URL (actually chud)
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

          // Build thumbnails array from the flat fields
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

  // actually deletes the track from the database, file system and the UI
  const handleDelete = async () => {
    const track = contextMenu().track;
    setContextMenu({ ...contextMenu(), show: false });

    console.log("Attempting to delete track:", track);
    if (!track) return;

    // ask the user if they are sure they want to delete
    // this uses the os dialog but like we could make our own modal if we wanted to *************
    const confirm = await ask(
      `Are you sure you want to delete "${track.title}"?\nThis will delete the file from your system.`,
      { title: 'Delete Track', kind: 'warning' }
    );

    if (confirm) {
      try {
        // calling the backend function that deletes the track from the database and the users song folder 
        await invoke("remove_track", { trackId: track.id });
        setTracks((prev) => prev.filter((t) => t.file_path !== track.file_path));
      } catch (err) {
        console.error("Failed to delete:", err);
      }
    }
  };

  // Playlist deletion
  const handleDeletePlaylist = async () => {
    const playlist = playlistContextMenu().playlist;
    setPlaylistContextMenu({ ...playlistContextMenu(), show: false });
    if (!playlist) return;

    const confirm = await ask(
      `Are you sure you want to delete "${playlist.name}"?\nThis cannot be undone.`,
      { title: 'Delete Playlist', kind: 'warning' }
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
      title: 'Select Music Tracks',
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }]
    });

    if (srcPath && typeof srcPath === 'string') {
      setCurrentUploadPath(srcPath);
      try {
        const metadata = await invoke<any>("get_track_metadata", { path: srcPath });
        setMeta({
          title: metadata.title, artist: metadata.artist, album: metadata.album,
          fileFormat: metadata.file_format, fileSize: metadata.file_size,
          duration: metadata.duration_ms, dateAdded: metadata.date_added,
          thumbBase64: metadata.thumbnail_base64, thumbMime: metadata.thumbnail_mime
        });
        openModal();
      } catch (err) { console.error(err); }
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

  return (
    <main class="h-full flex flex-col px-6 py-5 overflow-y-auto pb-32">

      {/* Header */}
      <h1 class="text-[var(--color-content)] text-2xl font-bold">Library</h1>

      {/* Search Bar */}
      <div class="relative mt-5">
        <Search size={14} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search songs..."
          class="w-full pl-8 pr-4 py-2 rounded-lg bg-[var(--color-secondary)] text-sm text-[var(--color-content)] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
        />
      </div>

      {/* ── Playlists ─────────────────────────────────────────── */}
      <div class="flex items-center justify-between mt-10 mb-3">
        <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">Playlists</p>
        <button
          onClick={createPlaylist}
          class="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:opacity-70 transition-opacity duration-150"
        >
          <Plus size={12} />
          New
        </button>
      </div>

      <Show
        when={playlists().length > 0}
        fallback={<p class="text-sm text-gray-400">No playlists yet.</p>}
      >
        <div class="flex flex-wrap gap-4">
          {/* Existing playlists */}
          <For each={playlists()}>
            {(playlist) => (
              <div class="flex flex-col group w-32">
                <div
                  onClick={() => navigate(`/playlist/${playlist.id}`)}
                  onContextMenu={(e) => handlePlaylistContextMenu(e, playlist)}
                  class="w-32 h-32 rounded-xl bg-[var(--color-secondary)] overflow-hidden relative cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <PlaylistCover
                    coverUrl={playlist.cover_url ?? null}
                    thumbnails={playlist.thumbnails}
                    class="w-full h-full transition-transform duration-300 group-hover:scale-105"
                  />
                  <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    <Play size={20} fill="white" class="text-white ml-0.5" />
                  </div>
                </div>
                <div class="mt-2 w-full">
                  <h3 class="font-medium truncate text-sm text-[var(--color-content)]">
                    {playlist.name}
                  </h3>
                  <p class="text-xs text-gray-400 truncate mt-0.5">
                    {playlist.track_count} {playlist.track_count === 1 ? "song" : "songs"}
                  </p>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* Grid of Tracks */}
      <div class="flex items-center justify-between mt-12 mb-3">
        <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">Songs</p>
        <button
          onClick={selectAudioFiles}
          class="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:opacity-70 transition-opacity duration-150"
        >
          <Plus size={12} />
          Add
        </button>
      </div>

      <Show
        when={filteredTracks().length > 0}
        fallback={
          <p class="text-sm text-gray-400">
            {searchQuery() ? "No songs match your search." : "No songs yet."}
          </p>
        }
      >
        <div class="flex flex-wrap gap-4">
          <For each={filteredTracks()}>
            {(track) => (
              <div class="flex flex-col group w-32">
                <div
                  onClick={() => {
                    if (currentPath() === track.file_path) {
                      isPlaying() ? pauseAudio() : resumeAudio();
                    } else {
                      loadAndPlay(track.file_path, track.title, track.artist_name, track.thumbnail_base64 ?? "", track.thumbnail_mime ?? "");
                    }
                  }}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                  class={`w-32 h-32 rounded-lg bg-[var(--color-secondary)] overflow-hidden relative cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 ${currentPath() === track.file_path ? 'ring-2 ring-[var(--color-primary)]' : ''}`}
                >
                  {track.thumbnail_base64 ? (
                    <img
                      src={`data:${track.thumbnail_mime};base64,${track.thumbnail_base64}`}
                      class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div class="w-full h-full flex items-center justify-center bg-[var(--color-secondary)]">
                      <span class="text-3xl text-[var(--color-content)] opacity-20 font-bold select-none">
                        {track.title ? track.title.charAt(0).toUpperCase() : "?"}
                      </span>
                    </div>
                  )}

                  <div class={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${currentPath() === track.file_path ? 'bg-black/50 opacity-100' : 'bg-black/40 opacity-0 group-hover:opacity-100'}`}>
                    {currentPath() === track.file_path && isPlaying()
                      ? <Pause size={20} fill="white" class="text-white" />
                      : <Play size={20} fill="white" class="text-white ml-0.5" />
                    }
                  </div>
                </div>

                <div class="mt-2 w-full">
                  <h3 class={`font-medium truncate text-sm ${currentPath() === track.file_path ? 'text-[var(--color-primary)]' : 'text-[var(--color-content)]'}`}>
                    {track.title || "Unknown Title"}
                  </h3>
                  <p class="text-xs text-gray-400 truncate mt-0.5">
                    {track.artist_name || "Unknown Artist"}
                  </p>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>

      {/* context menu for right clicking tracks */}
      <ContextMenu
        show={contextMenu().show}
        x={contextMenu().x}
        y={contextMenu().y}
        title={contextMenu().track?.title}
        onClose={() => setContextMenu({ ...contextMenu(), show: false })}
        onDelete={handleDelete}
      />

      {/* context menu for right clicking playlists */}
      <ContextMenu
        show={playlistContextMenu().show}
        x={playlistContextMenu().x}
        y={playlistContextMenu().y}
        title={playlistContextMenu().playlist?.name}
        deleteLabel="Delete Playlist"
        onClose={() => setPlaylistContextMenu({ ...playlistContextMenu(), show: false })}
        onDelete={handleDeletePlaylist}
      />

      <Modal
        filePath={currentUploadPath()}
        title={meta().title}
        artist={meta().artist}
        album={meta().album}
        fileFormat={meta().fileFormat}
        fileSize={meta().fileSize}
        durationMs={meta().duration}
        dateAdded={meta().dateAdded}
        thumbnailBase64={meta().thumbBase64}
        thumbnailMime={meta().thumbMime}
      />
    </main>
  );
}