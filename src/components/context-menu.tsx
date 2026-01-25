import { Show } from "solid-js";
import { Trash } from "lucide-solid";

interface ContextMenuProps {
  show: boolean;
  x: number;
  y: number;
  title?: string;
  onClose: () => void;
  onDelete: () => void;
}

export default function ContextMenu(props: ContextMenuProps) {
  return (
    <Show when={props.show}>
      <div 
        class="fixed z-50 min-w-[160px] bg-[var(--color-surface)] border border-[var(--color-muted)] rounded-lg shadow-2xl py-1 flex flex-col"
        style={{ 
          top: `${props.y}px`, 
          left: `${props.x}px`,
          // Ensure it doesn't go off-screen if opened near the bottom/right
          "max-width": "200px" 
        }}
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Menu Header */}
        <div class="px-4 py-2 text-xs font-semibold text-[var(--color-tertiary)] border-b border-[var(--color-muted)] truncate">
          {props.title || "Options"}
        </div>

        {/* Delete Action */}
        <button 
          onClick={() => {
            props.onDelete();
            props.onClose();
          }}
          class="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer outline-none"
        >
          <Trash size={16} />
          <span class="font-medium">Delete Track</span>
        </button>
      </div>
    </Show>
  );
}