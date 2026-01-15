import { A, useLocation } from "@solidjs/router";
import { createSignal } from "solid-js";
import { LibraryBig , Headphones, Settings, ChevronLeft, ChevronRight, Menu } from "lucide-solid"; // icons

export default function Sidebar() {
  const [collapsed, setCollapsed] = createSignal(false);
  const location = useLocation(); // get current route

  const links = [
    { href: "/", label: "Library", icon: LibraryBig },
    { href: "/listen", label: "Listen", icon: Headphones },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside
      class={`h-full bg-[var(--color-surface)] border-r border-[var(--color-muted)] 
        transition-all duration-300 flex flex-col
        ${collapsed() ? "w-20" : "w-64"}`}
    >
      {/* Header with collapse button */}
      <div class="flex items-center justify-between p-4 border-b border-[var(--color-muted)]">
        {!collapsed() && (
          <h1 class="text-lg font-bold text-[var(--color-content)]">Menu</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed())}
          class="p-2 rounded hover:bg-[var(--color-muted)] text-[var(--color-content)]"
        >
          {collapsed() ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* Nav links */}
      <nav class="flex-1 py-4 flex flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = location.pathname === href;
          return (
            <A
              href={href}
              class={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors
                ${active
                  ? "bg-[var(--color-tertiary)] text-white"
                  : "text-[var(--color-content)] hover:bg-[var(--color-muted)]"}`}
            >
              <Icon class="w-5 h-5" />
              {!collapsed() && <span>{label}</span>}
            </A>
          );
        })}
      </nav>
    </aside>
  );
}





