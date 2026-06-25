import { A, useLocation } from "@solidjs/router";
import { createSignal } from "solid-js";
import { LibraryBig, Headphones, Settings, ChevronLeft, ChevronRight, Disc3 } from "lucide-solid";

export default function Sidebar() {
  const [collapsed, setCollapsed] = createSignal(false);
  const location = useLocation();

  const links = [
    { href: "/", label: "Library", icon: LibraryBig },
    { href: "/listen", label: "Listen", icon: Headphones },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      class={`h-full bg-[var(--color-surface)] border-r border-[var(--color-muted)]/40
        transition-[width] duration-200 ease-in-out overflow-hidden flex flex-col
        ${collapsed() ? "w-14" : "w-56"}`}
    >
      {/* Header: identity on the left, toggle on the right */}
      <div class={`flex items-center px-3 py-3 shrink-0
        ${collapsed() ? "justify-center" : "justify-between"}`}
      >
        {!collapsed() && (
          <div class="flex items-center gap-2">
            {/* <Disc3 size={16} class="text-[var(--color-tertiary)]" /> */}
            <span class="text-sm font-semibold text-[var(--color-content)] whitespace-nowrap">
              Menu
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed())}
          class="p-1.5 rounded-lg shrink-0 text-[var(--color-content)]/40
            hover:text-[var(--color-content)]/70 hover:bg-[var(--color-muted)]/50
            transition-colors"
        >
          {collapsed() ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
      <nav class="flex-1 flex flex-col gap-0.5 px-2 pt-1">
        {links.map(({ href, label, icon: Icon }) => (
          <A
            href={href}
            class={`flex items-center gap-3 py-2.5 rounded-lg text-sm transition-colors duration-150
              ${collapsed() ? "justify-center px-0" : "px-3"}
              ${location.pathname === href
                ? "bg-[var(--color-tertiary)]/10 text-[var(--color-tertiary)] font-medium"
                : "text-[var(--color-content)]/65 hover:text-[var(--color-content)] hover:bg-[var(--color-muted)]/50"
              }`}
          >
            <Icon size={18} class="shrink-0" />
            {!collapsed() && <span class="leading-none">{label}</span>}
          </A>
        ))}
      </nav>
    </aside>
  );
}





