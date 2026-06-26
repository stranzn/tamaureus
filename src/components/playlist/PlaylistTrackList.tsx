import { For, Show } from "solid-js";
import { GripVertical, X, Music2, Play, Pause } from "lucide-solid";
import ThumbCell from "./ThumbCell";

interface Props {
  tracks: any[];
  isEditing: boolean;
  currentPath?: string | null;
  isPlaying?: boolean;
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
        <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-secondary)] mb-3 shrink-0">
          In this playlist
        </p>
      </Show>

      <Show
        when={props.tracks.length > 0}
        fallback={
          <div class="flex-1 flex flex-col items-center justify-center text-center">
            <Music2 size={34} class="text-[var(--color-secondary)]/40 mb-3" />
            <p class="text-sm text-[var(--color-secondary)]">No songs yet</p>
            <Show when={props.isEditing}>
              <p class="text-xs text-[var(--color-secondary)]/60 mt-1">Add from your library →</p>
            </Show>
          </div>
        }
      >
        <div class="flex-1 overflow-y-auto space-y-px pr-1">
          <For each={props.tracks}>
            {(track, index) => {
              const isActive = () => props.currentPath === track.file_path;
              const isThisPlaying = () => isActive() && props.isPlaying;

              return (
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
                      ? "bg-[var(--color-tertiary)]/10 ring-1 ring-[var(--color-tertiary)]/30"
                      : isActive()
                      ? "bg-[var(--color-muted)]/50"
                      : "hover:bg-[var(--color-muted)]/30"
                  }`}
                >
                  {/* Drag handle — edit mode only */}
                  <Show when={props.isEditing}>
                    <GripVertical
                      size={14}
                      class="text-[var(--color-secondary)]/40 group-hover:text-[var(--color-secondary)] transition-colors shrink-0"
                    />
                  </Show>

                  <div class="relative w-4 h-[13px] shrink-0 flex items-center justify-end">
                    {/* Track number: fades out on hover (view mode) or when this track is active */}
                    <span class={`text-[11px] tabular-nums leading-none transition-opacity duration-100 text-[var(--color-secondary)] ${
                      isActive()
                        ? "opacity-0"
                        : !props.isEditing ? "group-hover:opacity-0" : ""
                    }`}>
                      {index() + 1}
                    </span>

                    {/* Play/pause: fades in on hover or permanently when this track is active */}
                    <Show when={!props.isEditing}>
                      <span class={`absolute inset-0 flex items-center justify-end transition-opacity duration-100 ${
                        isActive() ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}>
                        <Show
                          when={isThisPlaying()}
                          fallback={<Play size={11} fill="currentColor" class="text-[var(--color-tertiary)]" />}
                        >
                          <Pause size={11} fill="currentColor" class="text-[var(--color-tertiary)]" />
                        </Show>
                      </span>
                    </Show>
                  </div>

                  <ThumbCell
                    thumbnail_base64={track.thumbnail_base64}
                    thumbnail_mime={track.thumbnail_mime}
                    title={track.title}
                  />

                  <div class="flex-1 min-w-0">
                    <p class={`text-sm font-medium truncate ${
                      isActive() ? "text-[var(--color-tertiary)]" : "text-[var(--color-content)]"
                    }`}>
                      {track.title || "Unknown Title"}
                    </p>
                    <p class="text-xs text-[var(--color-secondary)] truncate">
                      {track.artist_name || "Unknown Artist"}
                    </p>
                  </div>

                  {/* Edit mode: remove button */}
                  <Show when={props.isEditing}>
                    <button
                      onclick={(e) => {
                        e.stopPropagation();
                        props.onRemove?.(track.file_path);
                      }}
                      class="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-400/10 text-[var(--color-secondary)] hover:text-red-400 transition-all shrink-0"
                    >
                      <X size={13} />
                    </button>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
    </div>
  );
}