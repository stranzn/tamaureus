import { A } from "@solidjs/router";
import { createSignal } from "solid-js";

export default function Menu() {
  const [isOpen, setIsOpen] = createSignal(false);

  const toggleMenu = () => setIsOpen(!isOpen());
  const closeMenu = () => setIsOpen(false);

  return (
    <>
      {/* Burger button */}
      <button
        class="fixed top-5 left-5 z-50 bg-transparent border-none cursor-pointer w-8 h-8 flex flex-col justify-around p-0"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span
          class={`w-6 h-0.5 bg-[var(--color-content)] transition-all duration-300 origin-center ${
            isOpen() ? "rotate-45 translate-x-1.5 translate-y-1.5" : ""
          }`}
        ></span>
        <span
          class={`w-6 h-0.5 bg-[var(--color-content)] transition-all duration-300 origin-center ${
            isOpen() ? "opacity-0" : ""
          }`}
        ></span>
        <span
          class={`w-6 h-0.5 bg-[var(--color-content)] transition-all duration-300 origin-center ${
            isOpen() ? "-rotate-45 translate-x-1.5 -translate-y-1.5" : ""
          }`}
        ></span>
      </button>

      {/* Overlay */}
      <div
        class={`fixed inset-0 bg-[var(--color-background)]/50 z-40 transition-all duration-300 ${
          isOpen() ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={closeMenu}
      ></div>

      {/* Menu */}
      <nav
        class={`fixed top-0 left-0 w-72 h-screen bg-[var(--color-surface)] shadow-lg z-40 flex flex-col transition-transform duration-300 ${
          isOpen() ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div class="flex justify-between items-center p-5 border-b border-[var(--color-muted)] bg-[var(--color-surface)]">
          <h2 class="m-0 text-lg text-[var(--color-content)]">Menu</h2>
          <button
            class="bg-none border-none text-2xl cursor-pointer text-[var(--color-content)] p-0 w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-200 hover:bg-[var(--color-muted)]"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        {/* Links */}
        <div class="flex-1 py-5">
          <A
            href="/"
            onClick={closeMenu}
            class="block py-4 px-5 text-[var(--color-content)] text-base no-underline border-l-4 border-transparent transition-all duration-200 hover:bg-[var(--color-muted)] hover:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
          >
            Library
          </A>
          <A
            href="/listen"
            onClick={closeMenu}
            class="block py-4 px-5 text-[var(--color-content)] text-base no-underline border-l-4 border-transparent transition-all duration-200 hover:bg-[var(--color-muted)] hover:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
          >
            Listen
          </A>
          <A
            href="/settings"
            onClick={closeMenu}
            class="block py-4 px-5 text-[var(--color-content)] text-base no-underline border-l-4 border-transparent transition-all duration-200 hover:bg-[var(--color-muted)] hover:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-inset"
          >
            Settings
          </A>
        </div>
      </nav>
    </>
  );
}




