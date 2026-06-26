import { For } from "solid-js";
import { Play } from "lucide-solid";
import PlaylistCover from "../playlist/PlaylistCover";
import type { Playlist } from "../../types/library";

interface Props {
  playlists: Playlist[];
  onNavigate: (id: number) => void;
  onContextMenu: (e: MouseEvent, playlist: Playlist) => void;
}

export default function PlaylistGrid(props: Props) {
  return (
    <div class="flex flex-wrap gap-4">
      <For each={props.playlists}>
        {(playlist) => (
          <div class="flex flex-col group w-32">
            <div
              onClick={() => props.onNavigate(playlist.id)}
              onContextMenu={(e) => props.onContextMenu(e, playlist)}
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
  );
}