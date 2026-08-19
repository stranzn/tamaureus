import { onMount, type Component } from "solid-js";
import { deleteFilesOnRemove, toggleDeleteFilesOnRemove, loadSettings } from "../store/settingsStore";

// switch controlling whether removing a song from the library also
// deletes the underlying file from disk. backed by rust settings.txt.
const DeleteFilesToggle: Component = () => {
  onMount(() => {
    loadSettings();
  });

  return (
    <label class="flex items-center justify-between gap-4 py-2 cursor-pointer">
      <span class="flex flex-col gap-0.5">
        <span class="text-sm font-medium text-white">
          Delete files from disk on removal
        </span>
        <span class="text-xs text-gray-400">
          When enabled, removing a song from your library also deletes the
          file from the filesystem. This cannot be undone.
        </span>
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={deleteFilesOnRemove()}
        aria-label="Delete files from disk on removal"
        onClick={toggleDeleteFilesOnRemove}
        class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
        classList={{
          "bg-[var(--color-accent)]": deleteFilesOnRemove(),
          "bg-gray-700": !deleteFilesOnRemove(),
        }}
      >
        <span
          class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
          classList={{
            "translate-x-6": deleteFilesOnRemove(),
            "translate-x-1": !deleteFilesOnRemove(),
          }}
        />
      </button>
    </label>
  );
};

export default DeleteFilesToggle;