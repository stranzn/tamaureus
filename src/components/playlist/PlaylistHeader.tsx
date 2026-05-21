import { Show } from "solid-js";
import { ArrowLeft, Music2, Camera, Pencil, Check, Play, Shuffle } from "lucide-solid";
import PlaylistCover from "./PlaylistCover";

interface Props {
  name: string;
  description: string;
  coverAssetUrl: string | null;
  coverTracks: any[];
  trackCount: number;
  totalDuration: string;
  isEditing: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  onBack: () => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onCoverClick: () => void;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onPlay: () => void;
  onShuffle: () => void;
  onCoverRemove: () => void;
}

export default function PlaylistHeader(props: Props) {
  return (
    <div class="px-6 pt-5 pb-6 shrink-0">

      {/* Top bar */}
      <div class="flex items-center justify-between mb-6">
        <button
          onclick={props.onBack}
          class="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[var(--color-primary)] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Library
        </button>

        <div class="flex items-center gap-2">
          <Show when={!props.isEditing}>
            <button
              onclick={props.onEdit}
              class="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition-all"
            >
              <Pencil size={13} />
              Edit
            </button>
          </Show>

          <Show when={props.isEditing}>
            <button
              onclick={props.onCancel}
              class="px-4 py-1.5 rounded-full text-sm text-gray-400 hover:text-white hover:bg-white/8 transition-all"
            >
              Cancel
            </button>
            <button
              disabled={props.isSaving}
              onclick={props.onSave}
              class={`flex items-center gap-1.5 px-5 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                props.saveSuccess
                  ? "bg-green-500 text-white"
                  : "bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95"
              }`}
            >
              <Show when={props.saveSuccess}><Check size={14} /></Show>
              {props.isSaving ? "Saving…" : props.saveSuccess ? "Saved" : "Save"}
            </button>
          </Show>
        </div>
      </div>

      {/* Hero row */}
      <div class="flex items-end gap-7">

        {/* Cover art */}
        <button
          type="button"
          onclick={props.onCoverClick}
          disabled={!props.isEditing}
          class={`relative w-44 h-44 rounded-xl overflow-hidden shrink-0 group ${
            props.isEditing ? "cursor-pointer" : "cursor-default"
          }`}
          style="box-shadow: 0 20px 60px rgba(0,0,0,0.5); padding: 0; border: none; background: none;"
        >
          <PlaylistCover
            coverUrl={props.coverAssetUrl}
            thumbnails={props.coverTracks
              .filter((t) => t.thumbnail_base64)
              .map((t) => ({ base64: t.thumbnail_base64, mime: t.thumbnail_mime }))}
            class="w-full h-full"
          />

          {/* Edit hover overlay — pointer-events-none on the bg, but buttons need pointer events */}
            <Show when={props.isEditing}>
              <div class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                <Camera size={26} class="text-white" />
                <span class="text-white text-xs font-medium">Change cover</span>

                {/* Remove button — only shown when a custom cover is set */}
                <Show when={props.coverAssetUrl}>
                  <button
                    type="button"
                    onclick={(e) => {
                      e.stopPropagation(); // don't trigger onCoverClick
                      props.onCoverRemove();
                    }}
                    class="mt-1 text-[11px] text-red-400 hover:text-red-300 transition-colors pointer-events-auto"
                  >
                    Remove cover
                  </button>
                </Show>
              </div>
            </Show>
        </button>

        {/* Metadata */}
        <div class="flex-1 min-w-0 pb-1">
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-3">
            Playlist
          </p>

          {/* Name */}
          <Show
            when={props.isEditing}
            fallback={
              <h1 class="text-[2rem] font-bold leading-tight text-[var(--color-content)] mb-2">
                {props.name}
              </h1>
            }
          >
            <div class="flex items-center gap-2 mb-2">
              <input
                class="text-[2rem] font-bold leading-tight bg-transparent border-b-2 border-[var(--color-primary)] text-[var(--color-content)] outline-none flex-1 min-w-0"
                value={props.name}
                onInput={(e) => props.onNameChange(e.currentTarget.value)}
              />
              <Pencil size={15} class="text-gray-500 shrink-0" />
            </div>
          </Show>

          {/* Description */}
          <Show
            when={props.isEditing}
            fallback={
              <Show when={props.description}>
                <p class="text-sm text-gray-400 mb-4">{props.description}</p>
              </Show>
            }
          >
            <div class="flex items-start gap-2 mb-5">
              <textarea
                rows={2}
                class="text-sm bg-transparent border-b border-[var(--color-primary)]/60 text-gray-300 outline-none resize-none flex-1 placeholder-gray-600"
                value={props.description}
                onInput={(e) => props.onDescriptionChange(e.currentTarget.value)}
                placeholder="Add a description…"
              />
              <Pencil size={13} class="text-gray-600 shrink-0 mt-1" />
            </div>
          </Show>

          {/* Stats + Play + Shuffle */}
          <div class="flex items-center gap-3">
            <Show when={!props.isEditing && props.trackCount > 0}>
              {/* Play button */}
              <button
                onclick={props.onPlay}
                class="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--color-primary)] text-white font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
              >
                <Play size={16} fill="currentColor" />
                Play
              </button>

              {/* Shuffle button */}
              <button
                onclick={props.onShuffle}
                class="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-gray-300 border border-white/10 hover:border-white/25 hover:text-white active:scale-95 transition-all"
              >
                <Shuffle size={16} />
                Shuffle
              </button>
            </Show>

            <p class="text-xs text-gray-500">
              {props.trackCount} {props.trackCount === 1 ? "song" : "songs"}
              <Show when={props.trackCount > 0}> · {props.totalDuration}</Show>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}