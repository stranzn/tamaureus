import { createSignal } from "solid-js";
import { invoke } from "@tauri-apps/api/core";

type Settings = {
  music_dir: string;
  delete_files_on_remove: boolean;
};

const [deleteFilesOnRemove, setDeleteFilesOnRemoveInternal] = createSignal(false);
const [settingsLoaded, setSettingsLoaded] = createSignal(false);

// pulls current settings from the rust-side settings.txt
async function loadSettings() {
  try {
    const settings = await invoke<Settings>("load_settings");
    setDeleteFilesOnRemoveInternal(settings.delete_files_on_remove);
  } catch (err) {
    console.error("failed to load settings:", err);
  } finally {
    setSettingsLoaded(true);
  }
}

// updates the signal immediately, then persists to disk via rust
async function setDeleteFilesOnRemove(value: boolean) {
  setDeleteFilesOnRemoveInternal(value);
  try {
    await invoke("save_delete_files_setting", { enabled: value });
  } catch (err) {
    console.error("failed to save delete_files_on_remove:", err);
    // roll back on failure so the ui reflects what's actually on disk
    setDeleteFilesOnRemoveInternal(!value);
  }
}

async function toggleDeleteFilesOnRemove() {
  await setDeleteFilesOnRemove(!deleteFilesOnRemove());
}

export {
  deleteFilesOnRemove,
  setDeleteFilesOnRemove,
  toggleDeleteFilesOnRemove,
  loadSettings,
  settingsLoaded,
};