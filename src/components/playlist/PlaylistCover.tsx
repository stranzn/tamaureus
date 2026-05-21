import { For } from "solid-js";
import { Music2 } from "lucide-solid";

interface Thumb {
  base64: string;
  mime: string;
}

interface Props {
  coverUrl: string | null;
  thumbnails: Thumb[];
  class?: string;
}

export default function PlaylistCover(props: Props) {
  // Custom uploaded cover always wins
  if (props.coverUrl) {
    return (
      <div class={`overflow-hidden ${props.class ?? ""}`}>
        <img src={props.coverUrl} class="w-full h-full object-cover" />
      </div>
    );
  }

  // Always build exactly 4 slots, fill with thumbs then null for empties
  const slots = () => {
    const filled: (Thumb | null)[] = [...props.thumbnails.slice(0, 4)];
    while (filled.length < 4) filled.push(null);
    return filled;
  };

  return (
    <div class={`overflow-hidden ${props.class ?? ""}`}>
      <div class="grid grid-cols-2 grid-rows-2 w-full h-full">
        <For each={slots()}>
          {(thumb) => (
            <div class="w-full h-full overflow-hidden">
              {thumb ? (
                <img
                  src={`data:${thumb.mime};base64,${thumb.base64}`}
                  class="w-full h-full object-cover"
                />
              ) : (
                <div class="w-full h-full flex items-center justify-center bg-gray-800 border border-gray-900/50">
                  <Music2 size={16} class="text-gray-700" />
                </div>
              )}
            </div>
          )}
        </For>
      </div>
    </div>
  );
}