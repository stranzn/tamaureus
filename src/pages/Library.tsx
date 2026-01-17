import { Menu, Search, Plus, Play, Pause } from "lucide-solid";
import { musicUpload } from "../components/modals/music_upload";
import { open } from "@tauri-apps/plugin-dialog";
import { createEffect, createSignal } from "solid-js";
import { invoke } from '@tauri-apps/api/core';
import { playerStore } from "../store/playerStore";

// TODO ---------------------------------------------------------------------------------------------------- AHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
// WE DONT HAVE ARTIST AND ALBUM IN THE GET TRACKS FUNCTION YET
// WE GOTTA MAKE SURE THAT THE FUNCTION RETURNS IT WITH THOSE INSTEAD OF THE ID'S

export default function Library() {
  const { loadAndPlay, currentPath, isPlaying } = playerStore;
  const [tracks, setTracks] = createSignal<any[]>([]);
  const [searchQuery, setSearchQuery] = createSignal("");
  const { Modal, openModal } = musicUpload();
  const [currentUploadPath, setCurrentUploadPath] = createSignal("");
  const [meta, setMeta] = createSignal({
    title: "", artist: "", album: "", fileFormat: "", 
    fileSize: 0, duration: 0, dateAdded: 0, 
    thumbBase64: "", thumbMime: ""
  });

  const getTracks = async () => {
    try {
      const tracks = await invoke<any[]>("get_tracks");
      return tracks;
    } catch (err) {
      return [];
    }
  };

  createEffect(async () => {
    const data = await getTracks();
    setTracks(data);
  });

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
          title: metadata.title,
          artist: metadata.artist,
          album: metadata.album,
          fileFormat: metadata.file_format,
          fileSize: metadata.file_size,
          duration: metadata.duration_ms,
          dateAdded: metadata.date_added,
          thumbBase64: metadata.thumbnail_base64,
          thumbMime: metadata.thumbnail_mime
        });
        
        openModal();
      } catch (err) {
        console.error(err);
      }
    }
  }

  return (
    <main class="h-full flex flex-col p-4 overflow-y-auto pb-32">
      <div>
        <p class="text-[var(--color-content)] text-2xl font-bold mb-4">Library</p>
      </div>
      <div class="flex flex-row items-center gap-4 mt-5">
        <div class="relative flex-1">
          <input
            type="text"
            placeholder="Search your library..."
            class="w-full p-2 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
          <Search
            size={20}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>
        <Menu class="mr-10" size={40} />
      </div>

      <div class="mt-8 flex flex-col items-center w-fit">
        <div class="w-32 h-32 border-2 border-dashed border-[var(--color-secondary)] rounded-md flex items-center justify-center cursor-pointer hover:border-[var(--color-primary)] transition-colors duration-300">
          <Plus
            size={43}
            class="text-gray-400 hover:text-[var(--color-primary)] transition-colors duration-300"
          />
        </div>
        <p class="text-gray-500 mt-2 text-center">Create New Playlist</p>
      </div>

      <hr class="w-[95%] mt-8" />

      <div class="flex flex-wrap gap-8 mt-8">
        <div class="flex flex-col items-center w-32">
          <button onclick={selectAudioFiles}>
            <div class="w-32 h-32 border-2 border-dashed border-[var(--color-secondary)] rounded-md flex items-center justify-center cursor-pointer hover:border-[var(--color-primary)] transition-colors duration-300">
              <Plus
                size={43}
                class="text-gray-400 hover:text-[var(--color-primary)] transition-colors duration-300"
              />
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
                  onClick={() => loadAndPlay(track.file_path, track.title, track.artist, track.thumbnail_base64, track.thumbnail_mime)}
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
                    {track.artist || "Unknown Artist"}
                  </p>
                </div>
              </div>
            );
          })}
      </div>

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
