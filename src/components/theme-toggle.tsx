import { createSignal, createEffect, onMount, For } from "solid-js";

// 1. CONFIGURATION
const THEME_OPTIONS = [
  { value: "system", label: "System Default" },
  { value: "light", label: "Light Mode" },
  { value: "dark", label: "Dark Mode" },
  { value: "midnight", label: "Midnight" },
] as const;

// 2. TYPES
// This creates a type: "system" | "light" | "dark" | "midnight"
type ThemeValue = typeof THEME_OPTIONS[number]["value"];

// Helper to extract just the theme values (excluding system) for cleanup
const THEME_CLASSES = THEME_OPTIONS
  .map((t) => t.value)
  .filter((v): v is Exclude<ThemeValue, "system"> => v !== "system");

/**
 * Shared helper to resolve 'system' into 'light' or 'dark'
 */
const getEffectiveThemeClass = (selectedTheme: ThemeValue): string => {
  if (selectedTheme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return selectedTheme;
};

export default function ThemeToggle() {
  const [theme, setTheme] = createSignal<ThemeValue>("system");

  const updateDOM = (selectedTheme: ThemeValue) => {
    const html = document.documentElement;
    const effectiveClass = getEffectiveThemeClass(selectedTheme);

    // DYNAMIC CLEANUP: Remove any class that exists in our configuration
    html.classList.remove(...THEME_CLASSES);

    // Add the new class (unless it's 'light', which is default)
    if (effectiveClass !== "light") {
      html.classList.add(effectiveClass);
    }
  };

  onMount(() => {
    const saved = localStorage.getItem("theme") as ThemeValue | null;
    if (saved && THEME_OPTIONS.some(t => t.value === saved)) {
      setTheme(saved);
    }
  });

  createEffect(() => {
    const current = theme();
    localStorage.setItem("theme", current);
    updateDOM(current);
  });

  onMount(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      if (theme() === "system") updateDOM("system");
    };
    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  });

  return (
    <div class="pt-10"> 
      
      {/* 2. Component Container: Keeps the SVG anchored to the Select */}
      <div class="relative inline-block">
        <select
          value={theme()}
          onChange={(e) => setTheme(e.currentTarget.value as ThemeValue)}
          class="
            appearance-none cursor-pointer w-full
            p-2 pr-10 rounded-md 
            bg-[var(--color-secondary)] 
            text-[var(--color-content)] 
            border border-[var(--color-muted)]
            focus:ring-2 focus:ring-[var(--color-accent)] focus:outline-none
            transition-colors duration-300
          "
        >
          <For each={THEME_OPTIONS}>
            {(item) => <option value={item.value}>{item.label}</option>}
          </For>
        </select>
        
        {/* 3. The Icon: Stays pinned to the right edge of the Select */}
        <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-content)]">
          <svg class="h-4 w-4 fill-current opacity-70" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>

    </div>
  );
}

/**
 * OPTIMIZED MOUNT FUNCTION
 */
export function mountTheme() {
  const saved = localStorage.getItem("theme") as ThemeValue | null;
  const html = document.documentElement;

  let mode: ThemeValue = "system";
  if (saved && THEME_OPTIONS.some((t) => t.value === saved)) {
    mode = saved;
  }

  const effectiveClass = getEffectiveThemeClass(mode);

  html.classList.remove(...THEME_CLASSES);
  if (effectiveClass !== "light" && THEME_CLASSES.includes(effectiveClass as any)) {
    html.classList.add(effectiveClass);
  }
}
  




