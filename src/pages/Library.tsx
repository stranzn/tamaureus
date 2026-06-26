import { Show } from "solid-js";
import { Search, Plus, LayoutGrid, List } from "lucide-solid";
import ContextMenu from "../components/context-menu";
import PlaylistGrid from "../components/library/PlaylistGrid";
import TrackGrid from "../components/library/TrackGrid";
import TrackList from "../components/library/TrackList";
import { useLibrary } from "../types/useLibrary";

export default function Library() {
  const {
    playlists, filteredTracks,
    searchQuery, setSearchQuery,
    viewMode, setViewMode,
    currentPath, isPlaying,
    contextMenu, setContextMenu,
    playlistContextMenu, setPlaylistContextMenu,
    handleContextMenu, handlePlaylistContextMenu,
    handleDelete, handleDeletePlaylist,
    handleTrackClick, selectAudioFiles, createPlaylist,
    Modal, currentUploadPath, meta,
    navigate,
  } = useLibrary();

  // Segmented control button class — active state lifts to card bg, inactive is muted
  const toggleBtnClass = (mode: "grid" | "list") =>
    `flex items-center justify-center w-5 h-5 rounded transition-all duration-150 ${
      viewMode() === mode
        ? "bg-[var(--color-card)] text-[var(--color-content)] shadow-sm"
        : "text-[var(--color-secondary)] hover:text-[var(--color-content)]"
    }`;

  return (
    <main class="h-full flex flex-col px-6 py-5 overflow-y-auto pb-32">

      {/* Header */}
      <h1 class="text-[var(--color-content)] text-2xl font-bold">Library</h1>

      {/* Search Bar */}
      <div class="relative mt-5">
        <Search
          size={14}
          class="absolute left-3 top-1/2 -translate-y-1/2
            text-[var(--color-content)]/35 pointer-events-none"
        />
        <input
          type="text"
          placeholder="Search songs..."
          class="w-full bg-[var(--color-card)] border border-[var(--color-muted)]
            rounded-lg pl-9 pr-4 py-2.5 text-sm text-[var(--color-content)]
            placeholder:text-[var(--color-content)]/30
            focus:outline-none focus:border-[var(--color-tertiary)]/50
            transition-colors"
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
        <PlaylistGrid
          playlists={playlists()}
          onNavigate={(id) => navigate(`/playlist/${id}`)}
          onContextMenu={handlePlaylistContextMenu}
        />
      </Show>

      {/* ── Songs ─────────────────────────────────────────────── */}
      <div class="flex items-center justify-between mt-12 mb-3">
        <p class="text-xs font-semibold uppercase tracking-widest text-gray-400">Songs</p>

        <div class="flex items-center gap-3">
          {/* View mode toggle — scoped to songs only, playlists are always grid */}
          <div class="flex items-center bg-[var(--color-muted)] rounded-md p-0.5 gap-0.5">
            <button onClick={() => setViewMode("grid")} title="Grid view" class={toggleBtnClass("grid")}>
              <LayoutGrid size={11} />
            </button>
            <button onClick={() => setViewMode("list")} title="List view" class={toggleBtnClass("list")}>
              <List size={11} />
            </button>
          </div>

          <button
            onClick={selectAudioFiles}
            class="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:opacity-70 transition-opacity duration-150"
          >
            <Plus size={12} />
            Add
          </button>
        </div>
      </div>

      <Show
        when={filteredTracks().length > 0}
        fallback={
          <p class="text-sm text-gray-400">
            {searchQuery() ? "No songs match your search." : "No songs yet."}
          </p>
        }
      >
        {/* ── Grid view ── */}
        <Show when={viewMode() === "grid"}>
          <TrackGrid
            tracks={filteredTracks()}
            currentPath={currentPath}
            isPlaying={isPlaying}
            onTrackClick={handleTrackClick}
            onContextMenu={handleContextMenu}
          />
        </Show>

        {/* ── List view ── */}
        <Show when={viewMode() === "list"}>
          <TrackList
            tracks={filteredTracks()}
            currentPath={currentPath}
            isPlaying={isPlaying}
            onTrackClick={handleTrackClick}
            onContextMenu={handleContextMenu}
          />
        </Show>
      </Show>

      {/* Context menu for tracks */}
      <ContextMenu
        show={contextMenu().show}
        x={contextMenu().x}
        y={contextMenu().y}
        title={contextMenu().track?.title}
        onClose={() => setContextMenu({ ...contextMenu(), show: false })}
        onDelete={handleDelete}
      />

      {/* Context menu for playlists */}
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