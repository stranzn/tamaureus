import { For, Show } from "solid-js";
import { GripVertical, X, Music2, Play } from "lucide-solid";
import ThumbCell from "./ThumbCell";

interface Props {
  tracks: any[];
  isEditing: boolean;
  dragOverIndex?: number | null;
  onPlay?: (track: any) => void;
  onRemove?: (filePath: string) => void;
  onDragStart?: (index: number) => void;
  onDragOver?: (e: DragEvent, index: number) => void;
  onDrop?: () => void;
}

export default function PlaylistTrackList(props: Props) {
  return (
    <div class="flex-1 flex flex-col min-h-0 px-5 py-4 overflow-hidden">
      <Show when={props.isEditing}>
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-3 shrink-0">
          In this playlist
        </p>
      </Show>

      <Show
        when={props.tracks.length > 0}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center text-center">
            <Music2 size={34} class="text-gray-700 mb-3" />
            <p class="text-sm text-gray-600">No songs yet</p>
            <Show when={props.isEditing}>
              <p class="text-xs text-gray-700 mt-1">Add from your library →</p>
            </Show>
          </div>
        }
      >
        <div class="flex-1 overflow-y-auto space-y-px pr-1">
          <For each={props.tracks}>
            {(track, index) => (
              <div
                draggable={props.isEditing}
                onDragStart={() => props.onDragStart?.(index())}
                onDragOver={(e) => props.onDragOver?.(e as DragEvent, index())}
                onDrop={() => props.onDrop?.()}
                onclick={() => !props.isEditing && props.onPlay?.(track)}
                class={`group flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150 ${
                  props.isEditing
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-pointer"
                } ${
                  props.dragOverIndex === index()
                    ? "bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/20"
                    : "hover:bg-white/5"
                }`}
              >
                {/* Drag handle — edit mode only */}
                <Show when={props.isEditing}>
                  <GripVertical
                    size={14}
                    class="text-gray-700 group-hover:text-gray-500 transition-colors shrink-0"
                  />
                </Show>

                <span class="text-[11px] text-gray-600 w-4 text-right shrink-0 tabular-nums">
                  {index() + 1}
                </span>

                <ThumbCell
                  thumbnail_base64={track.thumbnail_base64}
                  thumbnail_mime={track.thumbnail_mime}
                  title={track.title}
                />

                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-[var(--color-content)] truncate">
                    {track.title || "Unknown Title"}
                  </p>
                  <p class="text-xs text-gray-500 truncate">
                    {track.artist_name || "Unknown Artist"}
                  </p>
                </div>

                {/* View mode: play hint */}
                <Show when={!props.isEditing}>
                  <Play
                    size={13}
                    fill="currentColor"
                    class="text-gray-700 group-hover:text-[var(--color-primary)] transition-colors shrink-0"
                  />
                </Show>

                {/* Edit mode: remove button */}
                <Show when={props.isEditing}>
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      props.onRemove?.(track.file_path);
                    }}
                    class="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-400/10 text-gray-700 hover:text-red-400 transition-all shrink-0"
                  >
                    <X size={13} />
                  </button>
                </Show>
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}