import { createStore } from "solid-js/store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type YtdlpStatus =
  | "checking"
  | "missing"
  | "update-available"
  | "ready"
  | "downloading"
  | "error";

export interface DownloadProgress {
  downloaded: number;
  total: number;
}

export interface UpdateStatus {
  current_version: string | null;
  latest_version: string;
  needs_update: boolean;
}

// mirrors the Rust ExtractedTrack struct — the un-confirmed, editable staging shape
export interface ExtractedTrack {
  file_path: string;
  title: string;
  artist: string;
  album: string;
  duration_ms: number;
  file_format: string;
  file_size: number;
  date_added: number | null;
  thumbnail_base64: string | null;
  thumbnail_mime: string | null;
}

interface YtdlpState {
  status: YtdlpStatus;
  version: string | null;
  latestVersion: string | null;
  progress: DownloadProgress;
  error: string | null;
  downloadingSong: boolean;
}

const [state, setState] = createStore<YtdlpState>({
  status: "checking",
  version: null,
  latestVersion: null,
  progress: { downloaded: 0, total: 0 },
  error: null,
  downloadingSong: false,
});

let initialized = false;

async function init(): Promise<void> {
  if (initialized) return;
  initialized = true;

  listen<DownloadProgress>("ytdlp-download-progress", (event) => {
    setState("progress", event.payload);
  });

  await refreshStatus();
}

async function refreshStatus(): Promise<void> {
  try {
    const installed = await invoke<string | null>("get_ytdlp_status");

    if (!installed) {
      setState({ status: "missing", version: null });
      return;
    }

    setState("version", installed);

    const update = await invoke<UpdateStatus>("check_ytdlp_update");
    setState({
      latestVersion: update.latest_version,
      status: update.needs_update ? "update-available" : "ready",
    });
  } catch (err) {
    setState({ status: "error", error: String(err) });
  }
}

async function downloadBinary(): Promise<void> {
  setState({ status: "downloading", error: null, progress: { downloaded: 0, total: 0 } });
  try {
    const newVersion = await invoke<string>("download_ytdlp");
    setState({ status: "ready", version: newVersion });
  } catch (err) {
    setState({ status: "error", error: String(err) });
  }
}

// runs yt-dlp and stages the file — does NOT touch the database.
// caller is expected to show the edit modal with the result, then call
// confirm_track_import / discard_pending_download via the modal itself.
async function downloadSong(url: string): Promise<ExtractedTrack> {
  if (state.status !== "ready") {
    throw new Error("yt-dlp is not ready yet");
  }

  setState({ downloadingSong: true, error: null });
  try {
    const extracted = await invoke<ExtractedTrack>("download_song", { url });
    return extracted;
  } catch (err) {
    setState({ error: String(err) });
    throw err;
  } finally {
    setState({ downloadingSong: false });
  }
}

init();

export const ytdlpStore = {
  state,
  refreshStatus,
  downloadBinary,
  downloadSong,
};