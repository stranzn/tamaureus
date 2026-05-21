import { useNavigate, useParams } from "@solidjs/router";
import { createMemo, createSignal, onMount, Show } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { playerStore } from "../store/playerStore";
import PlaylistHeader from "../components/playlist/PlaylistHeader";
import PlaylistTrackList from "../components/playlist/PlaylistTrackList";
import LibraryPicker from "../components/playlist/LibraryPicker";

export default function Playlist() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadAndPlay } = playerStore;

  // ── Loading ──────────────────────────────────────────────────
  const [isLoading, setIsLoading] = createSignal(true);

  // ── Mode ─────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = createSignal(false);

  // ── Committed state (source of truth in view mode) ───────────
  // const [playlistId, setPlaylistId] = createSignal<number | null>(null);
  const [playlistName, setPlaylistName] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [coverPath, setCoverPath] = createSignal<string | null>(null);
  const [coverAssetUrl, setCoverAssetUrl] = createSignal<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = createSignal<any[]>([]);

  // ── Draft state (mutated during editing, discarded on Cancel) ─
  const [draftName, setDraftName] = createSignal("");
  const [draftDescription, setDraftDescription] = createSignal("");
  const [draftCoverPath, setDraftCoverPath] = createSignal<string | null>(null);
  const [draftCoverAssetUrl, setDraftCoverAssetUrl] = createSignal<string | null>(null);
  const [draftTracks, setDraftTracks] = createSignal<any[]>([]);

  // ── Library + search ─────────────────────────────────────────
  const [libraryTracks, setLibraryTracks] = createSignal<any[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");

  // ── Drag state ────────────────────────────────────────────────
  const [dragIndex, setDragIndex] = createSignal<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = createSignal<number | null>(null);

  // ── Save state ────────────────────────────────────────────────
  const [isSaving, setIsSaving] = createSignal(false);
  const [saveSuccess, setSaveSuccess] = createSignal(false);

  // ── Derived ───────────────────────────────────────────────────
  // Cover grid uses draft tracks in edit mode, committed tracks in view mode
  const activeTracks = createMemo(() =>
    isEditing() ? draftTracks() : playlistTracks()
  );

  const coverTracks = createMemo(() =>
    activeTracks().filter((t) => t.thumbnail_base64).slice(0, 4)
  );

  const totalDuration = createMemo(() => {
    const ms = activeTracks().reduce((sum, t) => sum + (t.duration_ms ?? 0), 0);
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  });

  const filteredLibrary = createMemo(() =>
    libraryTracks().filter(
      (t) =>
        !draftTracks().some((pt) => pt.file_path === t.file_path) &&
        (t.title?.toLowerCase().includes(searchQuery().toLowerCase()) ||
          t.artist_name?.toLowerCase().includes(searchQuery().toLowerCase()))
    )
  );

  // ── Mount: load data ──────────────────────────────────────────
  onMount(async () => {
    setIsLoading(true);
    try {
      // Always load the full library in parallel
      const [libraryData, playlist, tracks] = await Promise.all([
        invoke<any[]>("get_tracks_with_names"),
        invoke<any>("get_playlist", { id: Number(params.id) }),
        invoke<any[]>("get_playlist_tracks", { playlistId: Number(params.id) }),
      ]);

      setLibraryTracks(libraryData);
      // setPlaylistId(playlist.id);
      setPlaylistName(playlist.name);
      setDescription(playlist.description ?? "");
      setPlaylistTracks(tracks);

      if (playlist.cover_path) {
        setCoverPath(playlist.cover_path);
        try {
          const base64 = await invoke<string>("read_file_as_base64", { path: playlist.cover_path });
          const ext = playlist.cover_path.split('.').pop()?.toLowerCase();
          const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
          setCoverAssetUrl(`data:${mime};base64,${base64}`);
        } catch (err) {
          console.error("Failed to load cover:", err);
        }
      }

      // Fresh playlists (created with default name) start in edit mode
      const isBrandNew = playlist.name === "New Playlist" && tracks.length === 0;
      if (isBrandNew) {
        await openEditMode(playlist.name, playlist.description ?? "", playlist.cover_path, tracks);
      } else {
        setIsEditing(false);
      }
    } catch (err) {
      console.error("Failed to load playlist:", err);
    } finally {
      setIsLoading(false);
    }
  });

  // ── Mode transitions ──────────────────────────────────────────
  async function openEditMode(
    name: string,
    desc: string,
    cp: string | null,
    tracks: any[]
  ) {
    setDraftName(name);
    setDraftDescription(desc);
    setDraftCoverPath(cp);
    setDraftTracks([...tracks]);

    if (cp) {
      try {
        const base64 = await invoke<string>("read_file_as_base64", { path: cp });
        const ext = cp.split('.').pop()?.toLowerCase();
        const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        setDraftCoverAssetUrl(`data:${mime};base64,${base64}`);
      } catch (err) {
        console.error("Failed to load cover:", err);
        setDraftCoverAssetUrl(null);
      }
    } else {
      setDraftCoverAssetUrl(null);
      console.log("No cover path provided, using default thumbnail");
    }

    setIsEditing(true);
  }

  const handleEdit = () =>
    openEditMode(playlistName(), description(), coverPath(), playlistTracks());

  const handleCancel = () => {
    setIsEditing(false);
    setSearchQuery("");
  };

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await invoke("update_playlist", {
        id: Number(params.id), // ← was playlistId()
        name: draftName(),
        description: draftDescription() || null,
        coverPath: draftCoverPath() || null,
        trackIds: draftTracks().map((t) => t.id),
      });

      // Commit drafts → real state
      setPlaylistName(draftName());
      setDescription(draftDescription());
      setCoverPath(draftCoverPath());
      setCoverAssetUrl(draftCoverAssetUrl());
      setPlaylistTracks([...draftTracks()]);

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
        setSearchQuery("");
      }, 1200);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Cover ─────────────────────────────────────────────────────
  const handleCoverClick = async () => {
    console.log("handleCoverClick fired");
    if (!isEditing()) return;
    const path = await open({
      multiple: false,
      title: "Select Cover Image",
      filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp"] }],
    });
    if (path && typeof path === "string") {
      setDraftCoverPath(path);
      try {
        const base64 = await invoke<string>("read_file_as_base64", { path });
        // detect mime type from extension
        const ext = path.split('.').pop()?.toLowerCase();
        const mime = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
        setDraftCoverAssetUrl(`data:${mime};base64,${base64}`);
      } catch (err) {
        console.error("Failed to read cover image:", err);
      }
    }
  };

  // ── Track operations ──────────────────────────────────────────
  const addTrack = (track: any) => setDraftTracks((p) => [...p, track]);
  const removeTrack = (fp: string) =>
    setDraftTracks((p) => p.filter((t) => t.file_path !== fp));

  // ── Drag & drop ───────────────────────────────────────────────
  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: DragEvent, i: number) => {
    e.preventDefault();
    setDragOverIndex(i);
  };
  const handleDrop = () => {
    const from = dragIndex(), to = dragOverIndex();
    if (from !== null && to !== null && from !== to) {
      const arr = [...draftTracks()];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      setDraftTracks(arr);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  // ── Playing songs ──────────────────────────────────────────────────
  const handlePlayHeader = () => {
    const first = playlistTracks()[0];
    if (first) loadAndPlay(first.file_path, first.title, first.artist_name, first.thumbnail_base64, first.thumbnail_mime);
  };

  const handlePlay = (track?: any) => {
    const toPlay = track ?? playlistTracks()[0];
    if (toPlay) loadAndPlay(toPlay.file_path, toPlay.title, toPlay.artist_name, toPlay.thumbnail_base64, toPlay.thumbnail_mime);
  };


  // Does a simple shuffle but we probably have to change it when we implement our queue ****
  const handleShuffle = () => {
    const shuffled = [...playlistTracks()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const first = shuffled[0];
    if (first) loadAndPlay(first.file_path, first.title, first.artist_name, first.thumbnail_base64, first.thumbnail_mime);
  };


  // Remove playlist cover
  const handleCoverRemove = () => {
    setDraftCoverPath(null);
    setDraftCoverAssetUrl(null);
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <Show
      when={!isLoading()}
      fallback={
        <div class="h-full flex items-center justify-center text-gray-500 text-sm">
          Loading…
        </div>
      }
    >
      <main class="h-full flex flex-col overflow-hidden">

        <PlaylistHeader
          name={isEditing() ? draftName() : playlistName()}
          description={isEditing() ? draftDescription() : description()}
          coverAssetUrl={isEditing() ? draftCoverAssetUrl() : coverAssetUrl()}
          coverTracks={coverTracks()}
          trackCount={activeTracks().length}
          totalDuration={totalDuration()}
          isEditing={isEditing()}
          isSaving={isSaving()}
          saveSuccess={saveSuccess()}
          onBack={() => navigate("/")}
          onEdit={handleEdit}
          onSave={handleSave}
          onCancel={handleCancel}
          onCoverClick={handleCoverClick}
          onNameChange={setDraftName}
          onDescriptionChange={setDraftDescription}
          onPlay={handlePlayHeader}
          onShuffle={handleShuffle}
          onCoverRemove={handleCoverRemove}
        />

        <div class="h-px bg-white/5 mx-6 shrink-0" />

        <Show
          when={isEditing()}
          fallback={
            <PlaylistTrackList
              tracks={playlistTracks()}
              isEditing={false}
              onPlay={handlePlay}
            />
          }
        >
          <div class="flex flex-1 min-h-0">
            <PlaylistTrackList
              tracks={draftTracks()}
              isEditing={true}
              dragOverIndex={dragOverIndex()}
              onRemove={removeTrack}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
            <div class="w-px bg-white/5 my-4 shrink-0" />
            <LibraryPicker
              tracks={filteredLibrary()}
              searchQuery={searchQuery()}
              onSearchChange={setSearchQuery}
              onAdd={addTrack}
            />
          </div>
        </Show>

      </main>
    </Show>
  );
}