import { For, Show } from "solid-js";
import { Search, Plus } from "lucide-solid";
import ThumbCell from "./ThumbCell";

interface Props {
  tracks: any[];
  searchQuery: string;
  onSearchChange: (v: string) => void;
  onAdd: (track: any) => void;
}

export default function LibraryPicker(props: Props) {
  return (
    <div class="flex-1 flex flex-col min-h-0 px-5 py-4">
      <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-3 shrink-0">
        Your library
      </p>

      <div class="relative mb-3 shrink-0">
        <input
          type="text"
          placeholder="Search tracks…"
          class="w-full px-3 py-2 pr-9 text-sm rounded-lg bg-white/5 border border-white/8 text-[var(--color-content)] placeholder-gray-600 focus:outline-none focus:border-[var(--color-primary)]/40 transition-colors"
          value={props.searchQuery}
          onInput={(e) => props.onSearchChange(e.currentTarget.value)}
        />
        <Search
          size={13}
          class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none"
        />
      </div>

      <div class="flex-1 overflow-y-auto space-y-px pr-1">
        <Show
          when={props.tracks.length > 0}
          fallback={
            <p class="text-sm text-gray-600 text-center mt-10">All tracks added!</p>
          }
        >
          <For each={props.tracks}>
            {(track) => (
              <button
                onclick={() => props.onAdd(track)}
                class="w-full group flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <ThumbCell
                  thumbnail_base64={track.thumbnail_base64}
                  thumbnail_mime={track.thumbnail_mime}
                  title={track.title}
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-[var(--color-content)] truncate">
                    {track.title || "Unknown"}
                  </p>
                  <p class="text-xs text-gray-500 truncate">
                    {track.artist_name || "Unknown Artist"}
                  </p>
                </div>
                <Plus
                  size={15}
                  class="text-gray-700 group-hover:text-[var(--color-primary)] transition-colors shrink-0"
                />
              </button>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}