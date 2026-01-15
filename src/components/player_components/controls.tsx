import { Component, createSignal, createEffect } from 'solid-js';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-solid';
import { Slider } from '@kobalte/core';

interface ControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onPreviewSeek: (value: number) => void;
  onSeek: (value: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  onStartDrag?: () => void;
  onEndDrag?: () => void;
}

const Controls: Component<ControlsProps> = (props) => {
  const [localValue, setLocalValue] = createSignal(props.currentTime);
  const [isInternalDragging, setIsInternalDragging] = createSignal(false);

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
    <div class="flex flex-col items-center justify-center w-full gap-2">
      
      {/* Top Row: Buttons */}
      <div class="flex items-center justify-center gap-6">
        <button 
          onClick={props.onPrev} 
          class="text-[var(--color-tertiary)] hover:text-[var(--color-content)] transition-colors"
          aria-label="Previous"
        >
          <SkipBack size={20} fill="currentColor" />
        </button>

        <button
          onClick={props.onPlayPause}
          class="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black hover:scale-105 transition-transform"
          // Note: using explicit white/black for the main button usually looks best, 
          // but you can revert to your vars if preferred:
           style={{ 'background-color': 'var(--color-primary)', color: 'var(--color-surface)' }}
        >
          {props.isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" class="ml-0.5" />}
        </button>

        <button 
          onClick={props.onNext} 
          class="text-[var(--color-tertiary)] hover:text-[var(--color-content)] transition-colors"
          aria-label="Next"
        >
          <SkipForward size={20} fill="currentColor" />
        </button>
      </div>

      {/* Bottom Row: Scrubber */}
      <div class="flex items-center w-full gap-2 text-xs font-medium text-[var(--color-tertiary)]">
        <span class="w-10 text-right tabular-nums">
          {formatTime(localValue())}
        </span>

        <Slider.Root
          value={[localValue()]}
          minValue={0}
          maxValue={props.duration || 1} // Prevent divide by zero issues
          step={0.1}
          disabled={props.duration <= 0}
          onPointerDown={() => {
            setIsInternalDragging(true);
            props.onStartDrag?.();
          }}
          onChange={(val: number[]) => {
            setLocalValue(val[0]);
            props.onPreviewSeek(val[0]);
          }}
          onChangeEnd={(val: number[]) => {
            props.onSeek(val[0]);
            setIsInternalDragging(false);
            props.onEndDrag?.();
            setTimeout(() => setLocalValue(props.currentTime), 50);
          }}
          class="group relative flex items-center select-none touch-none w-full h-4 cursor-pointer"
        >
          <Slider.Track class="relative grow rounded-full h-1 overflow-hidden" style={{ 'background-color': 'var(--color-secondary)' }}>
            <Slider.Fill class="absolute h-full rounded-full group-hover:bg-[var(--color-accent)] transition-colors" style={{ 'background-color': 'var(--color-primary)' }} />
          </Slider.Track>
          {/* Thumb only visible on hover for that 'clean' look */}
          <Slider.Thumb 
            class="block w-3 h-3 rounded-full shadow-md bg-white opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus-visible:opacity-100"
          />
        </Slider.Root>

        <span class="w-10 tabular-nums">
          {formatTime(props.duration)}
        </span>
      </div>

    </div>
  );
};

export default Controls;
