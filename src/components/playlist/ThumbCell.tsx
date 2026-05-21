import { Show } from "solid-js";

interface Props {
  thumbnail_base64?: string | null;
  thumbnail_mime?: string | null;
  title?: string;
  size?: string;
}

export default function ThumbCell(props: Props) {
  return (
    <div class={`${props.size ?? "w-9 h-9"} rounded-md overflow-hidden shrink-0 bg-gray-800`}>
      <Show
        when={props.thumbnail_base64}
        fallback={
          <div class="w-full h-full flex items-center justify-center">
            <span class="text-xs font-bold text-gray-600">
              {props.title?.charAt(0).toUpperCase() ?? "?"}
            </span>
          </div>
        }
      >
        <img
          src={`data:${props.thumbnail_mime};base64,${props.thumbnail_base64}`}
          class="w-full h-full object-cover"
        />
      </Show>
    </div>
  );
}