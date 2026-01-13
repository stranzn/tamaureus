import { render, Portal } from "solid-js/web";
import { createSignal, Show, onCleanup } from "solid-js";

// @ts-expect-error
import ColorThief from "colorthief";

export function musicUpload() {
  const [open, setOpen] = createSignal(false);
  
  // Default color (Pink) before image loads
  const [accentColor, setAccentColor] = createSignal([236, 72, 153]);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  // Helper to format RGB array into CSS string
  const rgbString = () => `rgb(${accentColor().join(",")})`;
  const rgbaString = (alpha: number) => `rgba(${accentColor().join(",")}, ${alpha})`;

  const handleImageLoad = (e: Event) => {
    const img = e.target as HTMLImageElement;
    const colorThief = new ColorThief();
    
    // Ensure image is loaded enough to read data
    if (img.complete) {
      try {
        // getColor returns [r, g, b]
        const color = colorThief.getColor(img); 
        setAccentColor(color);
      } catch (err) {
        console.warn("Could not extract color", err);
      }
    }
  };

  const Modal = () => {
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
            {/* DYNAMIC STYLE WRAPPER:
                We inject the extracted color as a CSS variable (--accent) here.
                This lets us use it anywhere inside the modal effortlessly.
            */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ 
                "--accent": rgbString(),
                "--accent-dim": rgbaString(0.2) 
              }}
              class="
                w-full max-w-3xl overflow-hidden rounded-2xl 
                bg-[#18181b] text-gray-100 shadow-2xl 
                border border-white/10
                md:grid md:grid-cols-[280px_1fr]
                transition-colors duration-700
              "
            >
              
              {/* LEFT COLUMN */}
              <div class="flex flex-col gap-6 bg-[#202023] p-6 md:border-r md:border-white/5 relative overflow-hidden">
                
                {/* Subtle ambient background glow based on album color */}
                <div 
                  class="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none blur-3xl"
                  style={{ background: `radial-gradient(circle at center, ${rgbString()}, transparent 70%)` }}
                />

                <div class="relative z-10 aspect-square w-full overflow-hidden rounded-lg shadow-lg shadow-black/50">
                  <img 
                    // IMPORTANT: crossOrigin is needed to read image data from external URLs
                    crossOrigin="anonymous" 
                    src="https://i.ytimg.com/vi/LPVDIDUQJdE/maxresdefault.jpg" 
                    alt="song cover" 
                    onLoad={handleImageLoad}
                    class="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>

                <div class="relative z-10 space-y-2 text-xs font-medium text-gray-400">
                  <div class="flex justify-between border-b border-white/5 pb-2">
                    <span>Size</span>
                    <span class="text-gray-200">6.09 MB</span>
                  </div>
                  <div class="flex justify-between border-b border-white/5 pb-2">
                    <span>Length</span>
                    <span class="text-gray-200">2:38</span>
                  </div>
                  <div class="flex justify-between">
                    <span>Format</span>
                    <span class="text-gray-200">MP3</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div class="flex flex-col justify-between p-6 md:p-8 relative">
                
                <div class="space-y-6">
                  <h2 class="text-xl font-bold tracking-tight text-white mb-6">Edit Metadata</h2>
                  
                  {/* Dynamic Inputs 
                      We use style attributes for the focus color because Tailwind 
                      arbitrary values with variables can sometimes be tricky with 'focus:'.
                  */}
                  <div class="group space-y-1">
                    <label 
                       class="text-[10px] uppercase tracking-wider font-bold ml-1 transition-colors duration-300"
                       style={{ color: "var(--accent)" }}
                    >
                      Title
                    </label>
                    <input 
                      type="text" 
                      value="Cry For Me"
                      class="w-full rounded-lg bg-black/20 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:bg-black/40 focus:outline-none transition-all duration-300"
                      style={{ "border-color": "var(--accent)", "box-shadow": "0 0 0 1px var(--accent)" }}
                    />
                  </div>

                  <div class="space-y-1">
                    <label class="text-[10px] uppercase tracking-wider text-gray-500 font-bold ml-1">Artist</label>
                    <input 
                      type="text" 
                      placeholder="Add artist..."
                      class="w-full rounded-lg bg-black/20 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:bg-black/40 focus:outline-none transition-all duration-300 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>

                  <div class="space-y-1">
                    <label class="text-[10px] uppercase tracking-wider text-gray-500 font-bold ml-1">Album</label>
                    <input 
                      type="text" 
                      placeholder="Add album..."
                      class="w-full rounded-lg bg-black/20 border border-white/10 px-4 py-3 text-sm text-white placeholder-gray-600 focus:bg-black/40 focus:outline-none transition-all duration-300 focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div class="mt-10 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    class="rounded-full px-6 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={closeModal}
                    // Dynamic background color!
                    style={{ 
                      "background-color": "var(--accent)",
                      "box-shadow": "0 10px 30px -10px var(--accent)" 
                    }}
                    class="
                      rounded-full px-8 py-2.5 text-sm font-bold text-black
                      transition-all hover:scale-105 hover:brightness-110
                    "
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