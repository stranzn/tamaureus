import { createSignal, onMount } from "solid-js";

export default function ThemeToggle() {
  const [dark, setDark] = createSignal(false);

  onMount(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setDark(true);
      document.documentElement.classList.add("dark");
    } else if (saved === "light") {
      setDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setDark(prefersDark);
      if (prefersDark) document.documentElement.classList.add("dark");
    }
  });

  const toggleTheme = () => {
    const html = document.documentElement;
    if (dark()) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDark(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDark(true);
    }
  };

  return (
    <button
      onClick={toggleTheme}
      class="p-2 rounded-md bg-[var(--color-secondary)] text-[var(--color-content)] transition-colors duration-300"
    >
      {dark() ? "🌙 Dark Mode" : "☀️ Light Mode"}
    </button>
  );
}


export function mountTheme() {
    onMount(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else if (saved === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) document.documentElement.classList.add("dark");
    }
  });
}
  




