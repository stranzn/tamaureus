import { Component, createSignal, createEffect } from 'solid-js';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-solid';
import { Slider } from '@kobalte/core';

interface ControlsProps {
  isPlaying: boolean;
  currentTime: number;                      // now receives displayTime() from parent
  duration: number;
  onPlayPause: () => void;
  onPreviewSeek: (value: number) => void;
  onSeek: (value: number) => void;          // now receives commitSeek
  onPrev?: () => void;
  onNext?: () => void;
  onStartDrag?: () => void;
  onEndDrag?: () => void;
}

const Controls: Component<ControlsProps> = (props) => {
  const [localValue, setLocalValue] = createSignal(props.currentTime);
  const [isInternalDragging, setIsInternalDragging] = createSignal(false);

  // Sync local value with props.currentTime (displayTime) ONLY when not dragging
  createEffect(() => {
    if (!isInternalDragging()) {
      setLocalValue(props.currentTime);
    }
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div class="flex-1 flex flex-col gap-4">
      <div class="flex items-center gap-3">
        <span class="text-xs w-10 text-right tabular-nums text-[var(--color-tertiary)]">
          {formatTime(localValue())}
        </span>

        <Slider.Root
          value={[localValue()]}
          minValue={0}
          maxValue={props.duration || 120}
          step={0.1}
          disabled={props.duration <= 0}
          
          // Drag start
          onPointerDown={() => {
            setIsInternalDragging(true);
            props.onStartDrag?.();
          }}
          
          // Live preview during drag
          onChange={(val: number[]) => {
            const newValue = val[0];
            setLocalValue(newValue);
            props.onPreviewSeek(newValue);
          }}
          
          // Drag end/release
          onChangeEnd={(val: number[]) => {
            const finalValue = val[0];
            props.onSeek(finalValue);               // this calls commitSeek
            setIsInternalDragging(false);
            props.onEndDrag?.();
            setTimeout(() => setLocalValue(props.currentTime), 50);
          }}
          
          class="group relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
        >
          <Slider.Track
            class="relative grow rounded-full h-1"
            style={{ 'background-color': 'var(--color-secondary)' }}
          >
            <Slider.Fill
              class="absolute rounded-full h-full"
              style={{ 'background-color': 'var(--color-primary)' }}
            />
            <Slider.Thumb
              class="block w-3 h-3 rounded-full shadow-md top-1/2 -translate-y-1/2 
                     bg-[var(--color-primary)] transition-opacity focus:outline-none
                     opacity-0 group-hover:opacity-100 focus-visible:opacity-100 active:opacity-100"
              style={{ '--tw-ring-color': 'var(--color-accent)' }}
            />
          </Slider.Track>
        </Slider.Root>

        <span class="text-xs w-10 tabular-nums text-[var(--color-tertiary)]">
          {formatTime(props.duration)}
        </span>
      </div>

      <div class="flex items-center justify-center gap-4">
        <button 
          onClick={props.onPrev} 
          class="transition-transform duration-150 hover:scale-105" 
          style={{ color: 'var(--color-accent)' }}
        >
          <SkipBack size={20} />
        </button>

        <button
          onClick={props.onPlayPause}
          class="rounded-full p-3 text-white transition-transform duration-150 hover:scale-105"
          style={{ 'background-color': 'var(--color-primary)' }}
        >
          {props.isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>

        <button 
          onClick={props.onNext} 
          class="transition-transform duration-150 hover:scale-105" 
          style={{ color: 'var(--color-accent)' }}
        >
          <SkipForward size={20} />
        </button>
      </div>
    </div>
  );
};

export default Controls;
