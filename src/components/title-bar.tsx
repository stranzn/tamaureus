import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { getCurrentWindow } from "@tauri-apps/api/window";

export default function TitleBar() {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = createSignal(false);

  async function syncMaximized() {
    setIsMaximized(await appWindow.isMaximized());
  }

  onMount(async () => {
    await syncMaximized();
    const unlisten = await appWindow.onResized(syncMaximized);
    onCleanup(unlisten);
  });

  return (
    <div class="relative flex h-9 shrink-0 items-center border-b border-muted bg-surface select-none">
      
      {/* 1. Dedicated Drag Region spanning the background */}
      <div data-tauri-drag-region class="absolute inset-0" />

      {/* Title Text */}
      <span class="pointer-events-none absolute inset-x-0 text-center text-[10px] font-semibold tracking-[0.22em] uppercase text-secondary">
        Tamaureus
      </span>

      {/* 2. Buttons container with relative positioning and z-10 to sit ON TOP of the drag region */}
      <div class="relative z-10 ml-auto flex items-center gap-0.5 pr-1.5">
        <button
          class="flex h-7 w-8 items-center justify-center rounded text-secondary transition-colors duration-[120ms] hover:bg-muted hover:text-content"
          onClick={() => appWindow.minimize()}
          title="Minimize"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <line x1=".5" y1="5" x2="9.5" y2="5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>

        <button
          class="flex h-7 w-8 items-center justify-center rounded text-secondary transition-colors duration-[120ms] hover:bg-muted hover:text-content"
          onClick={() => appWindow.toggleMaximize()}
          title={isMaximized() ? "Restore" : "Maximize"}
        >
          <Show
            when={isMaximized()}
            fallback={
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x=".5" y=".5" width="9" height="9" rx=".5" stroke="currentColor" stroke-width="1.2" />
              </svg>
            }
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <rect x="2" y="0" width="8" height="8" rx=".5" stroke="currentColor" stroke-width="1.2" />
              <rect x="0" y="2" width="8" height="8" rx=".5" fill="var(--color-surface)" stroke="currentColor" stroke-width="1.2" />
            </svg>
          </Show>
        </button>

        <button
          class="flex h-7 w-8 items-center justify-center rounded text-secondary transition-colors duration-[120ms] hover:bg-red-500 hover:text-white"
          onClick={() => appWindow.close()}
          title="Close"
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <line x1=".5" y1=".5" x2="8.5" y2="8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <line x1="8.5" y1=".5" x2=".5" y2="8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}