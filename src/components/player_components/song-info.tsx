import { Component } from 'solid-js';

interface SongInfoProps {
  cover: string;
  title: string;
  artist: string;
}

const SongInfo: Component<SongInfoProps> = (props) => {
  return (
    <div class="flex flex-row items-center gap-4 p-2">
      <div class="flex-shrink-0">
        <img
          src={props.cover}
          alt="Album Cover"
          class="w-16 h-16 rounded-md object-cover shadow-sm"
        />
      </div>

      <div class="flex flex-col justify-center min-w-0">
        <h3
          class="font-semibold truncate text-base"
          style={{ color: 'var(--color-content)' }}
        >
          {props.title}
        </h3>
        <p
          class="text-sm truncate"
          style={{ color: 'var(--color-tertiary)' }}
        >
          {props.artist}
        </p>
      </div>
    </div>
  );
};

export default SongInfo;