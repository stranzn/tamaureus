import { For, Show, createSignal } from "solid-js";
import { queueStore } from "../store/queueStore";

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function QueueSidebar() {
  const { items, currentPosition, isOpen, setIsOpen, removeFromQueue, moveTrack, playAtPosition } =
    queueStore;

  const [dragPos, setDragPos] = createSignal<number | null>(null);
  const [dragOverPos, setDragOverPos] = createSignal<number | null>(null);

  const currentTrack = () => items()[currentPosition()] ?? null;

  // skipNext walks position DOWN one at a time (current - 1, current - 2, ...),
  // so "next up" is lower indices, shown nearest-first — i.e. reverse array order.
  const upcoming = () => {
    const list = items();
    const out: typeof list = [];
    for (let i = currentPosition() - 1; i >= 0; i--) out.push(list[i]);
    return out;
  };

  // skipPrev walks position UP one at a time (current + 1, current + 2, ...),
  // so "history" is higher indices, nearest-first in ascending array order.
  const history = () => items().filter((_, i) => i > currentPosition());

  const handleDrop = (targetPosition: number) => {
    const from = dragPos();
    if (from === null || from === targetPosition) {
      setDragPos(null);
      setDragOverPos(null);
      return;
    }
    const item = items()[from];
    if (item) moveTrack(item.queue_item_id, targetPosition);
    setDragPos(null);
    setDragOverPos(null);
  };

  return (
    <Show when={isOpen()}>
      <div class="flex flex-col h-full w-[360px] shrink-0 border-l border-[var(--color-muted)] overflow-hidden bg-[var(--color-surface)]">
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-[var(--color-muted)] shrink-0">
          <h2 class="text-sm font-semibold tracking-wide text-[var(--color-primary)]">
            Queue
          </h2>
          <button
            class="text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-colors p-1"
            onClick={() => setIsOpen(false)}
            aria-label="Close queue"
          >
            ✕
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-2 py-3">
          {/* Now playing */}
          <Show when={currentTrack()}>
            <div class="mb-4">
              <p class="text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wide px-2 mb-2">
                Now playing
              </p>
              <TrackRow track={currentTrack()!} active />
            </div>
          </Show>

          {/* Upcoming */}
          <Show when={upcoming().length > 0}>
            <p class="text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wide px-2 mb-2">
              Next in queue
            </p>
            <div class="flex flex-col">
              <For each={upcoming()}>
                {(track) => {
                  // must resolve against the real items() array — display order
                  // here is intentionally reversed relative to array index
                  const absolutePos = () => items().findIndex((t) => t.queue_item_id === track.queue_item_id);
                  return (
                    <div
                      draggable
                      onDragStart={() => setDragPos(absolutePos())}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverPos(absolutePos());
                      }}
                      onDragLeave={() => setDragOverPos(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDrop(absolutePos());
                      }}
                      onDragEnd={() => {
                        setDragPos(null);
                        setDragOverPos(null);
                      }}
                      class="rounded-md"
                      classList={{
                        "outline outline-1 outline-[var(--color-accent)]": dragOverPos() === absolutePos(),
                        "opacity-40": dragPos() === absolutePos(),
                      }}
                    >
                      <TrackRow
                        track={track}
                        onClick={() => playAtPosition(absolutePos())}
                        onRemove={() => removeFromQueue(track.queue_item_id)}
                      />
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>

          {/* Empty state */}
          <Show when={items().length === 0}>
            <div class="flex flex-col items-center justify-center text-center py-16 px-6">
              <p class="text-sm text-[var(--color-secondary)]">Queue is empty</p>
            </div>
          </Show>

          {/* History (collapsed by default) */}
          <Show when={history().length > 0}>
            <details class="mt-4 group">
              <summary class="text-xs font-medium text-[var(--color-secondary)] uppercase tracking-wide px-2 mb-2 cursor-pointer select-none list-none">
                Previously played ({history().length})
              </summary>
              <div class="flex flex-col mt-1">
                <For each={history()}>
                  {(track) => {
                    const absolutePos = () => items().findIndex((t) => t.queue_item_id === track.queue_item_id);
                    return (
                      <TrackRow
                        track={track}
                        dimmed
                        onClick={() => playAtPosition(absolutePos())}
                        onRemove={() => removeFromQueue(track.queue_item_id)}
                      />
                    );
                  }}
                </For>
              </div>
            </details>
          </Show>
        </div>
      </div>
    </Show>
  );
}

function TrackRow(props: {
  track: {
    queue_item_id: number;
    title: string;
    artist_name: string;
    duration_ms: number;
    thumbnail_base64: string | null;
    thumbnail_mime: string | null;
  };
  active?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  const cover = () =>
    props.track.thumbnail_base64
      ? `data:${props.track.thumbnail_mime};base64,${props.track.thumbnail_base64}`
      : "https://media.tenor.com/ifD1GaekwpoAAAAi/uma-musume-agnes-tachyon.gif";

  return (
    <div
      class="group/row flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors hover:bg-[var(--color-muted)]"
      classList={{ "bg-[var(--color-card)]": props.active }}
      onClick={props.onClick}
    >
      <img
        src={cover()}
        class="w-10 h-10 rounded object-cover shrink-0"
        classList={{ "opacity-50": props.dimmed }}
      />
      <div class="flex-1 min-w-0">
        <p
          class="text-sm truncate"
          classList={{ "font-medium": props.active }}
          style={{
            color: props.active
              ? "var(--color-tertiary)"
              : props.dimmed
              ? "var(--color-secondary)"
              : "var(--color-content)",
          }}
        >
          {props.track.title}
        </p>
        <p class="text-xs text-[var(--color-secondary)] truncate">
          {props.track.artist_name}
        </p>
      </div>
      <span class="text-xs text-[var(--color-secondary)] shrink-0">
        {formatDuration(props.track.duration_ms)}
      </span>
      <Show when={props.onRemove}>
        <button
          class="opacity-0 group-hover/row:opacity-100 text-[var(--color-secondary)] hover:text-[var(--color-primary)] transition-opacity shrink-0 p-1"
          onClick={(e) => {
            e.stopPropagation();
            props.onRemove?.();
          }}
          aria-label="Remove from queue"
        >
          ✕
        </button>
      </Show>
    </div>
  );
}