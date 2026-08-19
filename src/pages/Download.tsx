import { createSignal, Show, For } from "solid-js";
import { ytdlpStore, type ExtractedTrack } from "../store/ytdlpStore";
// adjust this import path to wherever musicUpload.tsx actually lives
import { musicUpload } from "../components/modals/music_upload";

interface HistoryItem {
  key: string;
  url: string;
  title: string;
  status: "pending-review" | "done" | "duplicate" | "discarded" | "error";
  error?: string;
}

export default function DownloadPage() {
  const [url, setUrl] = createSignal("");
  const [history, setHistory] = createSignal<HistoryItem[]>([]);
  const [localError, setLocalError] = createSignal<string | null>(null);
  const [pending, setPending] = createSignal<ExtractedTrack | null>(null);

  const { Modal, openModal } = musicUpload();

  const updateHistory = (key: string, patch: Partial<HistoryItem>) => {
    setHistory((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  };

  const handleDownload = async (e: SubmitEvent) => {
    e.preventDefault();
    setLocalError(null);

    const link = url().trim();
    if (!link) return;

    const key = crypto.randomUUID();
    setHistory((prev) => [{ key, url: link, title: "", status: "pending-review" }, ...prev]);
    setUrl("");

    try {
      const extracted = await ytdlpStore.downloadSong(link);
      setPending(extracted);
      updateHistory(key, { title: extracted.title });
      openModal();

      // stash the key on the pending signal via closure for the callbacks below
      currentKey = key;
    } catch (err) {
      const message = String(err);
      setLocalError(message);
      updateHistory(key, { status: "error", error: message });
    }
  };

  // tracks which history row the currently-open modal corresponds to
  let currentKey = "";

  const handleConfirmed = (result: { id: number; duplicate: boolean }) => {
    if (currentKey) {
      updateHistory(currentKey, { status: result.duplicate ? "duplicate" : "done" });
    }
    setPending(null);
  };

  const handleCancelled = () => {
    if (currentKey) {
      updateHistory(currentKey, { status: "discarded" });
    }
    setPending(null);
  };

  const statusLabel = (status: HistoryItem["status"]) => {
    switch (status) {
      case "pending-review":
        return "reviewing...";
      case "done":
        return "added";
      case "duplicate":
        return "already in library";
      case "discarded":
        return "discarded";
      case "error":
        return "failed";
    }
  };

  const statusColor = (status: HistoryItem["status"]) => {
    switch (status) {
      case "done":
        return "text-emerald-400";
      case "duplicate":
        return "text-yellow-400";
      case "discarded":
        return "text-secondary";
      case "error":
        return "text-red-400";
      default:
        return "text-secondary";
    }
  };

  return (
    <div class="max-w-xl mx-auto p-6 space-y-6">
      <Show when={pending()}>
        {(track) => (
          <Modal
            filePath={track().file_path}
            title={track().title}
            artist={track().artist}
            album={track().album}
            fileFormat={track().file_format}
            fileSize={track().file_size}
            durationMs={track().duration_ms}
            dateAdded={track().date_added ?? 0}
            thumbnailBase64={track().thumbnail_base64 ?? ""}
            thumbnailMime={track().thumbnail_mime ?? ""}
            source="download"
            onConfirmed={handleConfirmed}
            onCancelled={handleCancelled}
          />
        )}
      </Show>

      <div class="rounded-2xl bg-surface border border-muted p-6 space-y-6">
        <h1 class="text-xl font-bold tracking-tight text-content">Download</h1>

        <Show when={ytdlpStore.state.status === "missing"}>
          <div class="rounded-lg bg-black/20 border border-yellow-600/40 p-4 space-y-2">
            <p class="text-sm text-content">yt-dlp is not installed yet.</p>
            <button
              class="rounded-full px-5 py-2 text-sm font-bold text-white transition-all hover:scale-105 hover:brightness-110"
              style={{ "background-color": "var(--color-accent)" }}
              onClick={() => ytdlpStore.downloadBinary()}
            >
              Install yt-dlp
            </button>
          </div>
        </Show>

        <Show when={ytdlpStore.state.status === "update-available"}>
          <div class="rounded-lg bg-black/20 border border-muted p-4 space-y-2">
            <p class="text-sm text-secondary">
              update available:{" "}
              <span class="text-content">{ytdlpStore.state.version}</span> →{" "}
              <span class="text-content">{ytdlpStore.state.latestVersion}</span>
            </p>
            <button
              class="rounded-full px-5 py-2 text-sm font-bold text-white transition-all hover:scale-105 hover:brightness-110"
              style={{ "background-color": "var(--color-accent)" }}
              onClick={() => ytdlpStore.downloadBinary()}
            >
              Update
            </button>
          </div>
        </Show>

        <Show when={ytdlpStore.state.status === "downloading"}>
          <div class="rounded-lg bg-black/20 border border-muted p-4 space-y-2">
            <p class="text-sm text-secondary">downloading yt-dlp...</p>
            <Show when={ytdlpStore.state.progress.total > 0}>
              <div class="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  class="h-1.5 rounded-full transition-all"
                  style={{
                    "background-color": "var(--color-accent)",
                    width: `${(ytdlpStore.state.progress.downloaded / ytdlpStore.state.progress.total) * 100}%`,
                  }}
                />
              </div>
            </Show>
          </div>
        </Show>

        <Show when={ytdlpStore.state.status === "error"}>
          <div class="rounded-lg bg-black/20 border border-red-600/40 p-4">
            <p class="text-sm text-red-400">{ytdlpStore.state.error}</p>
          </div>
        </Show>

        <form onSubmit={handleDownload} class="space-y-1">
          <label class="text-[10px] uppercase tracking-wider text-secondary font-bold ml-1">
            Link
          </label>
          <div class="flex gap-2">
            <input
              type="text"
              value={url()}
              onInput={(e) => setUrl(e.currentTarget.value)}
              placeholder="paste a link..."
              disabled={ytdlpStore.state.status !== "ready"}
              class="flex-1 rounded-lg bg-black/20 border border-muted px-4 py-3 text-sm text-content placeholder-secondary focus:bg-black/40 focus:outline-none transition-all duration-300"
            />
            <button
              type="submit"
              disabled={ytdlpStore.state.status !== "ready" || ytdlpStore.state.downloadingSong}
              class="rounded-full px-6 py-2.5 text-sm font-bold text-white transition-all hover:scale-105 hover:brightness-110 disabled:opacity-40 disabled:hover:scale-100"
              style={{ "background-color": "var(--color-accent)" }}
            >
              {ytdlpStore.state.downloadingSong ? "Downloading..." : "Download"}
            </button>
          </div>
        </form>

        <Show when={localError()}>
          <p class="text-sm text-red-400">{localError()}</p>
        </Show>
      </div>

      <Show when={history().length > 0}>
        <div class="rounded-2xl bg-surface border border-muted p-6 space-y-3">
          <h2 class="text-[10px] uppercase tracking-wider text-secondary font-bold ml-1">
            History
          </h2>
          <ul class="space-y-2">
            <For each={history()}>
              {(item) => (
                <li class="flex items-center justify-between rounded-lg bg-black/20 border border-muted px-4 py-3">
                  <span class="text-sm text-content truncate">{item.title || item.url}</span>
                  <span class={`text-xs font-medium ${statusColor(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
    </div>
  );
}