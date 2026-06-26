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

export default function TrackList(props: Props) {
  return (
    <div class="flex flex-col">
      <For each={props.tracks}>
        {(track) => (
          <div
            onClick={() => props.onTrackClick(track)}
            onContextMenu={(e) => props.onContextMenu(e, track)}
            class={`flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer group transition-colors duration-150 ${
              props.currentPath() === track.file_path
                ? "bg-[var(--color-muted)]/50"
                : "hover:bg-[var(--color-muted)]/30"
            }`}
          >
            {/* Thumbnail */}
            <div class="relative flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-[var(--color-secondary)]">
              {track.thumbnail_base64 ? (
                <img
                  src={`data:${track.thumbnail_mime};base64,${track.thumbnail_base64}`}
                  class="w-full h-full object-cover"
                />
              ) : (
                <div class="w-full h-full flex items-center justify-center">
                  <span class="text-sm font-bold text-[var(--color-content)] opacity-20 select-none">
                    {track.title ? track.title.charAt(0).toUpperCase() : "?"}
                  </span>
                </div>
              )}
              <div class={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-150 ${
                props.currentPath() === track.file_path
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100"
              }`}>
                {props.currentPath() === track.file_path && props.isPlaying()
                  ? <Pause size={12} fill="white" class="text-white" />
                  : <Play size={12} fill="white" class="text-white ml-0.5" />
                }
              </div>
            </div>

            {/* Track info */}
            <div class="flex-1 min-w-0">
              <p class={`text-sm font-medium truncate leading-tight ${
                props.currentPath() === track.file_path
                  ? "text-[var(--color-tertiary)]"
                  : "text-[var(--color-content)]"
              }`}>
                {track.title || "Unknown Title"}
              </p>
              <p class="text-xs text-[var(--color-secondary)] truncate mt-0.5">
                {track.artist_name || "Unknown Artist"}
              </p>
            </div>
          </div>
        )}
      </For>
    </div>
  );
}