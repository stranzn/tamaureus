import { createSignal } from 'solid-js';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-solid';
import { Slider } from '@kobalte/core';

export default function Player() {
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [volume, setVolume] = createSignal([65]);
  const [isMuted, setIsMuted] = createSignal(false);

  // Variables for metadata
  // Most of these will use information from the database

  const [songTitle, setSongTitle] = createSignal("Song Title");
  const [artistName, setArtistName] = createSignal("Artist Name");
  const [albumCover, setAlbumCover] = createSignal("https://i.imgur.com/5rqnfP8.png"); // has a default image if there is nothing provided
  const [duration, setDuration] = createSignal(225);
  const [currentTime, setCurrentTime] = createSignal(0);

  // Just a helper function that formats the time from seconds to mm:ss
  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }


  return (
    <div class="w-full shadow-lg p-6" style={{ "background-color": 'var(--color-surface)' }}>
      <div class="flex items-center gap-30">
        {/* Thumbnail - Left */}
        <div class="flex flex-row items-center gap-4 p-2">
            <div class="flex-shrink-0">
                <img
                src={albumCover()}
                alt="Album Cover"
                class="w-16 h-16 rounded-md object-cover shadow-sm"
                />
            </div>

            <div class="flex flex-col justify-center min-w-0">
                <h3 
                class="font-semibold truncate text-base" 
                style={{ color: 'var(--color-content)' }}
                >
                {songTitle()}
                </h3>
                <p 
                class="text-sm truncate" 
                style={{ color: 'var(--color-tertiary)' }}
                >
                {artistName()}
                </p>
            </div>
        </div>

        {/* Controls - Middle */}
        <div class="flex-1 flex flex-col gap-4">

          {/* Progress Bar */}
          <div class="flex items-center gap-3">
            <span class="text-xs w-10 text-right tabular-nums text-[var(--color-tertiary)]">
                {formatTime(currentTime())}
            </span>

            <Slider.Root
                value={[currentTime()]}
                onChange={(value) => setCurrentTime(value[0])}
                maxValue={duration()}
                step={1}
                // "group" goes here to trigger the thumb on hover
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
                {formatTime(duration())}
            </span>
            </div>

          {/* Playback Controls */}
          <div class="flex items-center justify-center gap-4">
            <button
              onClick={() => {}}
              class="transition-transform duration-150 hover:scale-105"
              style={{ color: 'var(--color-accent)' }}
              aria-label="Previous track"
            >
              <SkipBack size={20} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying())}
              class="rounded-full p-3 text-white transition-transform duration-150 hover:scale-105"
              style={{ "background-color": 'var(--color-primary)' }}
              aria-label={isPlaying() ? 'Pause' : 'Play'}
            >
              {isPlaying() ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={() => {}}
              class="transition-transform duration-150 hover:scale-105"
              style={{ color: 'var(--color-accent)' }}
              aria-label="Next track"
            >
              <SkipForward size={20} />
            </button>
          </div>
        </div>

        {/* Volume Control - Right */}
        <div class="flex-shrink-0 flex items-center gap-3 w-32">
          <button
            onClick={() => setIsMuted(!isMuted())}
            class="transition-transform duration-150 hover:scale-105"
            style={{ color: 'var(--color-accent)' }}
            aria-label={isMuted() ? 'Unmute' : 'Mute'}
          >
            {isMuted() || volume()[0] === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <Slider.Root
            value={isMuted() ? [0] : volume()}
            onChange={(value) => {
              setVolume(value);
              if (value[0] > 0) setIsMuted(false);
            }}
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
      </div>
    </div>
  );
}