import { Component } from 'solid-js';
import { Volume2, VolumeX } from 'lucide-solid';
import { Slider } from '@kobalte/core';

interface VolumeProps {
  volume: number[];
  isMuted: boolean;
  onVolumeChange: (value: number[]) => void;
  onToggleMute: () => void;
}

const Volume: Component<VolumeProps> = (props) => {
  return (
    <div class="flex-shrink-0 flex items-center gap-3 w-32">
      <button
        onClick={props.onToggleMute}
        class="transition-transform duration-150 hover:scale-105"
        style={{ color: 'var(--color-accent)' }}
        aria-label={props.isMuted ? 'Unmute' : 'Mute'}
      >
        {props.isMuted || props.volume[0] === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>
      
      <Slider.Root
        value={props.isMuted ? [0] : props.volume}
        onChange={props.onVolumeChange}
        maxValue={100}
        step={1}
        class="group relative flex items-center select-none touch-none flex-1 h-5"
      >
        <Slider.Track class="relative grow rounded-full h-1" style={{ "background-color": 'var(--color-secondary)' }}>
          <Slider.Fill class="absolute rounded-full h-full" style={{ "background-color": 'var(--color-accent)' }} />
          <Slider.Thumb
            class="block w-3 h-3 rounded-full shadow-md top-1/2 -translate-y-1/2 
                     bg-[var(--color-primary)] transition-opacity focus:outline-none
                     opacity-0 
                     group-hover:opacity-100 
                     focus-visible:opacity-100 
                     active:opacity-100"
            style={{
              "background-color": 'var(--color-accent)',
              "--tw-ring-color": 'var(--color-accent)'
            }}
          />
        </Slider.Track>
      </Slider.Root>
    </div>
  );
};

export default Volume;