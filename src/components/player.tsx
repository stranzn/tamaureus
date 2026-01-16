import { playerStore } from '../store/playerStore';
import SongInfo from './player_components/song-info';
import Controls from './player_components/controls';
import Volume from './player_components/volume';

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
      class="w-full shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] px-4 py-3 border-t border-white/5" 
      style={{ "background-color": 'var(--color-surface)' }}
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
            onPrev={() => skip('prev')}
            onNext={() => skip('next')}
          />
        </div>

        {/* Right: Width 30% - Aligned End */}
        <div class="flex justify-end w-[30%] min-w-[180px]">
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