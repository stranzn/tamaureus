import { render, Portal } from "solid-js/web";
import { Component, createSignal, Show, onCleanup } from "solid-js";
// @ts-expect-error
import ColorThief from "colorthief";

interface ModalProps {
  title?: string;
  artist?: string;
  album?: string;
  fileFormat?: string;
  fileSize?: string;
  duration?: string;
  dateAdded?: string;
}

export function musicUpload() {
  const [open, setOpen] = createSignal(false);
  const [isReady, setIsReady] = createSignal(false);
  const [accentColor, setAccentColor] = createSignal([161, 161, 170]);

  const openModal = () => {
    setIsReady(false);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
  };

  const rgbString = () => `rgb(${accentColor().join(",")})`;
  const rgbaString = (alpha: number) => `rgba(${accentColor().join(",")}, ${alpha})`;

  const getBrightness = () => {
    const [r, g, b] = accentColor();
    return (r * 299 + g * 587 + b * 114) / 1000;
  };

  const getUiColor = () => {
    return getBrightness() < 60 ? "rgb(255, 255, 255)" : rgbString();
  };

  const getTextContrastClass = () => {
    return getBrightness() > 128 ? "text-black" : "text-white";
  };

  const handleImageLoad = (e: Event) => {
    const img = e.target as HTMLImageElement;
    const colorThief = new ColorThief();
    if (img.complete) {
      try {
        const color = colorThief.getColor(img);
        setAccentColor(color);
        setIsReady(true);
      } catch (err) {
        setIsReady(true);
      }
    }
  };

  const Modal: Component<ModalProps> = (props) => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    
    document.addEventListener("keydown", onKeyDown);
    onCleanup(() => document.removeEventListener("keydown", onKeyDown));

    return (
      <Portal>
        <Show when={open()}>
          <div
            onClick={closeModal}
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ 
                "--accent": rgbString(),
                "--accent-ui": getUiColor(), 
                "--accent-dim": rgbaString(0.2) 
              }}
              class={`
                w-full max-w-3xl overflow-hidden rounded-2xl 
                bg-background text-content shadow-2xl 
                border border-muted
                md:grid md:grid-cols-[280px_1fr]
                transition-all duration-500 ease-out
                ${isReady() ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}
              `}
            >
              <div class="flex flex-col gap-6 bg-surface p-6 md:border-r md:border-muted relative overflow-hidden">
                <div 
                  class="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none blur-3xl"
                  style={{ background: `radial-gradient(circle at center, var(--accent), transparent 70%)` }}
                />

                <div class="relative z-10 aspect-square w-full overflow-hidden rounded-lg shadow-lg shadow-black/50">
                  <img 
                    crossOrigin="anonymous" 
                    src="https://i.scdn.co/image/ab67616d0000b273053491131955d059d22a97d7"
                    alt="cover" 
                    onLoad={handleImageLoad}
                    class="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>

                <div class="relative z-10 space-y-2 text-xs font-medium text-secondary">
                  <div class="flex justify-between border-b border-muted pb-2">
                    <span>Size</span><span class="text-content">{props.fileSize || "unknown"}</span>
                  </div>
                  <div class="flex justify-between border-b border-muted pb-2">
                    <span>Length</span><span class="text-content">{props.duration || "-:--"}</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Format</span><span class="text-content">{props.fileFormat || "unknown"}</span>
                  </div>
                </div>
              </div>

              <div class="flex flex-col justify-between p-6 md:p-8 relative">
                <div class="space-y-6">
                  <h2 class="text-xl font-bold tracking-tight text-content mb-6">Edit Metadata</h2>
                  
                  <div class="group space-y-1">
                    <label 
                       class="text-[10px] uppercase tracking-wider text-secondary font-bold ml-1"
                    >
                      Title
                    </label>
                    <input 
                      type="text" 
                      value={props.title ?? "" }
                      placeholder="Add title..."
                      class="w-full rounded-lg bg-black/20 border border-muted px-4 py-3 text-sm text-content placeholder-secondary focus:bg-black/40 focus:outline-none transition-all duration-300 focus:ring-1"
                      style={{ "--tw-ring-color": "var(--accent-ui)", "border-color": "var(--accent-ui)" }}
                    />
                  </div>

                  <div class="space-y-1">
                    <label class="text-[10px] uppercase tracking-wider text-secondary font-bold ml-1">Artist</label>
                    <input 
                      type="text" 
                      value={props.artist ?? "" }
                      placeholder="Add artist..."
                      class="w-full rounded-lg bg-black/20 border border-muted px-4 py-3 text-sm text-content placeholder-secondary focus:bg-black/40 focus:outline-none transition-all duration-300 focus:ring-1"
                      style={{ "--tw-ring-color": "var(--accent-ui)", "border-color": "var(--accent-ui)" }}
                    />
                  </div>

                  <div class="space-y-1">
                    <label class="text-[10px] uppercase tracking-wider text-secondary font-bold ml-1">Album</label>
                    <input 
                      type="text" 
                      value={props.album ?? "" }
                      placeholder="Add album..." 
                      class="w-full rounded-lg bg-black/20 border border-muted px-4 py-3 text-sm text-content placeholder-secondary focus:bg-black/40 focus:outline-none transition-all duration-300 focus:ring-1"
                      style={{ "--tw-ring-color": "var(--accent-ui)", "border-color": "var(--accent-ui)" }}
                    />
                  </div>
                </div>

                <div class="mt-10 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    class="rounded-full px-6 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-muted hover:text-content"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={closeModal}
                    style={{ 
                      "background-color": "var(--accent)",
                      "box-shadow": "0 10px 30px -10px var(--accent)" 
                    }}
                    class={`
                      rounded-full px-8 py-2.5 text-sm font-bold
                      transition-all hover:scale-105 hover:brightness-110
                      ${getTextContrastClass()} 
                    `}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </Portal>
    );
  };

  return { Modal, openModal, closeModal };
}