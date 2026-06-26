import { For } from "solid-js";
import { Play, Pause } from "lucide-solid";
import type { Track } from "../../types/library";

interface Props {
  tracks: Track[];
  // Passed as accessors so this component stays reactive to playback state changes
  currentPath: () => string | null;
  isPlaying: () => boolean;
  onTrackClick: (track: Track) => void;
  onContextMenu: (e: MouseEvent, track: Track) => void;
}

export default function TrackGrid(props: Props) {
  return (
    <div class="flex flex-wrap gap-4">
      <For each={props.tracks}>
        {(track) => (
          <div class="flex flex-col group w-32">
            <div
              onClick={() => props.onTrackClick(track)}
              onContextMenu={(e) => props.onContextMenu(e, track)}
              class={`w-32 h-32 rounded-lg bg-[var(--color-secondary)] overflow-hidden relative cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 ${
                props.currentPath() === track.file_path ? "ring-2 ring-[var(--color-primary)]" : ""
              }`}
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
              <div class={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                props.currentPath() === track.file_path
                  ? "bg-black/50 opacity-100"
                  : "bg-black/40 opacity-0 group-hover:opacity-100"
              }`}>
                {props.currentPath() === track.file_path && props.isPlaying()
                  ? <Pause size={20} fill="white" class="text-white" />
                  : <Play size={20} fill="white" class="text-white ml-0.5" />
                }
              </div>
            </div>

            <div class="mt-2 w-full">
              <h3 class={`font-medium truncate text-sm ${
                props.currentPath() === track.file_path
                  ? "text-[var(--color-primary)]"
                  : "text-[var(--color-content)]"
              }`}>
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
  );
}