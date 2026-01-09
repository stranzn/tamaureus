import { Component } from 'solid-js';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-solid';
import { Slider } from '@kobalte/core';

interface ControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onSeek: (value: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

const Controls: Component<ControlsProps> = (props) => {
  // Helper function formats time from seconds to mm:ss
  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  return (
    <div class="flex-1 flex flex-col gap-4">
      {/* Progress Bar */}
      <div class="flex items-center gap-3">
        <span class="text-xs w-10 text-right tabular-nums text-[var(--color-tertiary)]">
          {formatTime(props.currentTime)}
        </span>

        <Slider.Root
          value={[props.currentTime]}
          onChange={(value) => props.onSeek(value[0])}
          maxValue={props.duration}
          step={1}
          class="group relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
        >
          <Slider.Track
            class="relative grow rounded-full h-1"
            style={{ "background-color": 'var(--color-secondary)' }}
          >
            <Slider.Fill
              class="absolute rounded-full h-full"
              style={{ "background-color": 'var(--color-primary)' }}
            />

            <Slider.Thumb
              class="block w-3 h-3 rounded-full shadow-md top-1/2 -translate-y-1/2 
                     bg-[var(--color-primary)] transition-opacity focus:outline-none
                     opacity-0 
                     group-hover:opacity-100 
                     focus-visible:opacity-100 
                     active:opacity-100"
              style={{
                "--tw-ring-color": 'var(--color-accent)'
              }}
            />
          </Slider.Track>
        </Slider.Root>

        <span class="text-xs w-10 tabular-nums text-[var(--color-tertiary)]">
          {formatTime(props.duration)}
        </span>
      </div>

      {/* Playback Buttons */}
      <div class="flex items-center justify-center gap-4">
        <button
          onClick={props.onPrev}
          class="transition-transform duration-150 hover:scale-105"
          style={{ color: 'var(--color-accent)' }}
          aria-label="Previous track"
        >
          <SkipBack size={20} />
        </button>
        <button
          onClick={props.onPlayPause}
          class="rounded-full p-3 text-white transition-transform duration-150 hover:scale-105"
          style={{ "background-color": 'var(--color-primary)' }}
          aria-label={props.isPlaying ? 'Pause' : 'Play'}
        >
          {props.isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          onClick={props.onNext}
          class="transition-transform duration-150 hover:scale-105"
          style={{ color: 'var(--color-accent)' }}
          aria-label="Next track"
        >
          <SkipForward size={20} />
        </button>
      </div>
    </div>
  );
};

export default Controls;