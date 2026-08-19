import { playerStore } from '../store/playerStore';
import SongInfo from './player_components/song-info';
import Controls from './player_components/controls';
import Volume from './player_components/volume';
import { Logs } from "lucide-solid";

import { queueStore } from '../store/queueStore';

export default function Player() {
  const { 
    isPlaying, volume, isMuted, 
    songTitle, artistName, albumCover, 
    duration, displayTime,
    togglePlay, setVolumeLevel, toggleMute, 
    seek, skip, 
    previewSeek, commitSeek,
    setIsDragging,
  } = playerStore;

  return (
    <div 
      class="w-full shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] px-4 py-3 border-t border-[var(--color-muted)] bg-[var(--color-surface)]" 
    >
      <div class="flex items-center justify-between w-full h-full max-w mx-auto">
        
        {/* Left: Width 30% - Aligned Start */}
        <div class="flex justify-start w-[30%] min-w-[180px] overflow-hidden">
          <SongInfo 
            cover={albumCover()} 
            title={songTitle()} 
            artist={artistName()} 
          />
        </div>

        {/* Middle: Width 40% - Aligned Center */}
        <div class="flex justify-center w-[40%] max-w-[722px]">
          <Controls 
            isPlaying={isPlaying()}
            currentTime={displayTime()}
            duration={duration()}
            onPlayPause={togglePlay}
            onPreviewSeek={previewSeek}
            onSeek={commitSeek}
            onStartDrag={() => setIsDragging(true)}
            onEndDrag={() => setIsDragging(false)}
            onPrev={() => queueStore.skipPrev()}
            onNext={() => queueStore.skipNext()}
          />
        </div>

        {/* Right: Width 30% - Aligned End */}
        <div class="flex justify-end items-center gap-3 w-[30%] min-w-[180px]">
          <button
            class="transition-colors p-1"
            classList={{
              "text-[var(--color-tertiary)]": queueStore.isOpen(),
              "text-[var(--color-secondary)] hover:text-[var(--color-primary)]": !queueStore.isOpen(),
            }}
            onClick={() => queueStore.setIsOpen(!queueStore.isOpen())}
            aria-label="Toggle queue"
          >
            <Logs size={18} />
          </button>
          <Volume 
            volume={volume()}
            isMuted={isMuted()}
            onVolumeChange={setVolumeLevel}
            onToggleMute={toggleMute}
          />
        </div>

      </div>
    </div>
  );
}