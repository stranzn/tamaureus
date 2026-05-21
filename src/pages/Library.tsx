import { Menu as MenuIcon, Search, Plus, Play, Pause, ListMusic } from "lucide-solid";
import { musicUpload } from "../components/modals/music_upload";
import PlaylistCover from "../components/playlist/PlaylistCover";
import { useNavigate } from "@solidjs/router";
import { open, ask } from "@tauri-apps/plugin-dialog";
import ContextMenu from "../components/context-menu";
import { createSignal, onCleanup, onMount, Show, For } from "solid-js";
import { invoke } from '@tauri-apps/api/core';
import { playerStore } from "../store/playerStore";

export default function Library() {
  const { loadAndPlay, currentPath, isPlaying } = playerStore;
  const [tracks, setTracks] = createSignal<any[]>([]);
  const [playlists, setPlaylists] = createSignal<any[]>([]);
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
    show: false, x: 0, y: 0, track: null as any
  });

  // for playlist context menu
  const [playlistContextMenu, setPlaylistContextMenu] = createSignal({
    show: false, x: 0, y: 0, playlist: null as any
  });

  // close menu on outside click
  const handleGlobalClick = () => {
    if (contextMenu().show) setContextMenu({ ...contextMenu(), show: false });
    if (playlistContextMenu().show) setPlaylistContextMenu({ ...playlistContextMenu(), show: false });
  };

  // this is an event listener that will close the context menu when clicking outside
  document.addEventListener("click", handleGlobalClick);
  onCleanup(() => document.removeEventListener("click", handleGlobalClick));

  // i think saving the file path is probably chud. we should just save base64 in the db
  onMount(async () => {
    try {
      const [trackData, playlistData] = await Promise.all([
        invoke<any[]>("get_tracks_with_names"),
        invoke<any[]>("get_playlists_with_previews"),
      ]);
      setTracks(trackData);

      // Convert any cover_path to a base64 data URL (actually chud)
      const playlistsWithCovers = await Promise.all(
        playlistData.map(async (p) => {
          if (p.cover_path) {
            try {
              const base64 = await invoke<string>("read_file_as_base64", { path: p.cover_path });
              const ext = p.cover_path.split('.').pop()?.toLowerCase();
              const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
              return { ...p, cover_url: `data:${mime};base64,${base64}` };
            } catch {
              return { ...p, cover_url: null };
            }
          }
          return { ...p, cover_url: null };
        })
      );
      setPlaylists(playlistsWithCovers);

    } catch (err) {
      console.error("Failed to load library:", err);
    }
  });

  const handleContextMenu = (e: MouseEvent, track: any) => {
    e.preventDefault();
    setContextMenu({ show: true, x: e.pageX, y: e.pageY, track });
  };

  const handlePlaylistContextMenu = (e: MouseEvent, playlist: any) => {
    e.preventDefault();
    setPlaylistContextMenu({ show: true, x: e.pageX, y: e.pageY, playlist });
  };

  // actually deletes the track from the database, file system and the UI
  const handleDelete = async () => {
    const track = contextMenu().track;
    setContextMenu({ ...contextMenu(), show: false }); // Close menu

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
        await invoke("delete_track", { filePath: track.file_path });
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
    <main class="h-full flex flex-col p-4 overflow-y-auto pb-32">

      {/* Header */}
      <div><p class="text-[var(--color-content)] text-2xl font-bold mb-4">Library</p></div>

      {/* Search Bar */}
      <div class="flex flex-row items-center gap-4 mt-5">
        <div class="relative flex-1">
          <input
            type="text"
            placeholder="Search your library..."
            class="w-full p-2 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <Search size={20} class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <MenuIcon class="mr-10" size={40} />
      </div>

      {/* ── Playlists ─────────────────────────────────────────── */}
      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 mt-8 mb-4">
        Playlists
      </p>

      <div class="flex flex-wrap gap-8">
        {/* Create new playlist */}
        <div class="flex flex-col items-center w-32">
          <button onclick={createPlaylist}>
            <div class="w-32 h-32 border-2 border-dashed border-[var(--color-secondary)] rounded-xl flex items-center justify-center cursor-pointer hover:border-[var(--color-primary)] transition-colors duration-300">
              <Plus size={43} class="text-gray-400 hover:text-[var(--color-primary)] transition-colors duration-300" />
            </div>
          </button>
          <p class="text-gray-500 mt-2 text-center text-sm">New Playlist</p>
        </div>

        {/* Existing playlists */}
        <For each={playlists()}>
          {(playlist) => {
            // Build thumbnails array from the flat fields
            const thumbnails = [
              playlist.thumb1_base64 ? { base64: playlist.thumb1_base64, mime: playlist.thumb1_mime } : null,
              playlist.thumb2_base64 ? { base64: playlist.thumb2_base64, mime: playlist.thumb2_mime } : null,
              playlist.thumb3_base64 ? { base64: playlist.thumb3_base64, mime: playlist.thumb3_mime } : null,
              playlist.thumb4_base64 ? { base64: playlist.thumb4_base64, mime: playlist.thumb4_mime } : null,
            ].filter(Boolean) as { base64: string; mime: string }[];

            return (
              <div class="flex flex-col group relative w-32">
                <div
                  onclick={() => navigate(`/playlist/${playlist.id}`)}
                  onContextMenu={(e) => handlePlaylistContextMenu(e, playlist)}
                  class="w-32 h-32 rounded-xl bg-[var(--color-secondary)] overflow-hidden relative cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <PlaylistCover
                    coverUrl={playlist.cover_url ?? null}  // <- was playlist.cover_path
                    thumbnails={thumbnails}
                    class="w-full h-full transition-transform duration-500 group-hover:scale-110"
                  />

                  <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                    <Play size={24} fill="currentColor" class="text-white ml-1" />
                  </div>
                </div>

                <div class="mt-2 w-full">
                  <h3 class="font-bold truncate text-sm text-[var(--color-content)]">
                    {playlist.name}
                  </h3>
                  <p class="text-xs text-gray-500 truncate mt-0.5">
                    {playlist.track_count} {playlist.track_count === 1 ? "song" : "songs"}
                  </p>
                </div>
              </div>
            );
          }}
        </For>
      </div>

      <hr class="w-[95%] mt-8" />

      {/* Grid of Tracks */}
      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 mt-8 mb-4">
        Songs
      </p>

      <div class="flex flex-wrap gap-8">
        <div class="flex flex-col items-center w-32">
          <button onclick={selectAudioFiles}>
            <div class="w-32 h-32 border-2 border-dashed border-[var(--color-secondary)] rounded-xl flex items-center justify-center cursor-pointer hover:border-[var(--color-primary)] transition-colors duration-300">
              <Plus size={43} class="text-gray-400 hover:text-[var(--color-primary)] transition-colors duration-300" />
            </div>
          </button>
          <p class="text-gray-500 mt-2 text-center text-sm">Add New Song</p>
        </div>

        {tracks()
          .filter(t => t.title?.toLowerCase().includes(searchQuery().toLowerCase()))
          .map((track) => {
            const isActive = currentPath() === track.file_path;
            return (
              <div class="flex flex-col group relative w-32">
                <div
                  onClick={() => loadAndPlay(track.file_path, track.title, track.artist_name, track.thumbnail_base64, track.thumbnail_mime)}
                  onContextMenu={(e) => handleContextMenu(e, track)}
                  class="w-32 h-32 rounded-xl bg-[var(--color-secondary)] overflow-hidden relative cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {track.thumbnail_base64 ? (
                    <img
                      src={`data:${track.thumbnail_mime};base64,${track.thumbnail_base64}`}
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div class="w-full h-full flex items-center justify-center bg-gray-800">
                      <span class="text-4xl text-gray-600 font-bold select-none">
                        {track.title ? track.title.charAt(0).toUpperCase() : "?"}
                      </span>
                    </div>
                  )}

                  <div class={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button class="bg-[var(--color-primary)] text-white rounded-full p-3 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      {isActive && isPlaying() ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" class="ml-1" />}
                    </button>
                  </div>
                </div>

                <div class="mt-2 w-full">
                  <h3 class={`font-bold truncate text-sm ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-content)]'}`}>
                    {track.title || "Unknown Title"}
                  </h3>
                  <p class="text-xs text-gray-500 truncate mt-0.5">
                    {track.artist_name || "Unknown Artist"}
                  </p>
                </div>
              </div>
            );
          })}
      </div>

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