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
    <div class="flex items-center gap-2">
      <button
        onClick={props.onToggleMute}
        class="p-2 rounded-full hover:bg-white/10 transition-colors"
        style={{ color: 'var(--color-tertiary)' }}
        aria-label={props.isMuted ? 'Unmute' : 'Mute'}
      >
        {props.isMuted || props.volume[0] === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
      
      <Slider.Root
        value={props.isMuted ? [0] : props.volume}
        onChange={props.onVolumeChange}
        maxValue={100}
        step={1}
        class="group relative flex items-center select-none touch-none w-24 h-5 cursor-pointer"
      >
        <Slider.Track class="relative grow rounded-full h-1 overflow-hidden" style={{ "background-color": 'var(--color-secondary)' }}>
          <Slider.Fill class="absolute rounded-full h-full group-hover:bg-[var(--color-accent)] transition-colors" style={{ "background-color": 'var(--color-primary)' }} />
        </Slider.Track>
        <Slider.Thumb
          class="block w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity focus:outline-none"
        />
      </Slider.Root>
    </div>
  );
};

export default Volume;