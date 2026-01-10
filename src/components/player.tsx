import { playerStore } from '../store/playerStore';
import SongInfo from './player_components/song-info';
import Controls from './player_components/controls';
import Volume from './player_components/volume';

export default function Player() {
  // Destructure for easier usage
  const { 
    isPlaying, volume, isMuted, 
    songTitle, artistName, albumCover, duration, currentTime,
    togglePlay, setVolumeLevel, toggleMute, seek, skip, loadAndPlay, previewSeek, setIsDragging,
  } = playerStore;

  return (
    <div class="w-full shadow-lg p-6" style={{ "background-color": 'var(--color-surface)' }}>
      <div class="flex items-center gap-30">
        
        {/* Left */}
        <SongInfo 
          cover={albumCover()} 
          title={songTitle()} 
          artist={artistName()} 
        />

        {/* Middle */}
        <Controls 
          isPlaying={isPlaying()}
          currentTime={currentTime()}
          duration={duration()}
          onPlayPause={togglePlay}
          onPreviewSeek={previewSeek}           // ← required for live preview
          onSeek={seek}
          onStartDrag={() => setIsDragging(true)}
          onEndDrag={() => setIsDragging(false)}
          onPrev={() => skip('prev')}
          onNext={() => skip('next')}
        />

        {/* Right */}
        <Volume 
          volume={volume()}
          isMuted={isMuted()}
          onVolumeChange={setVolumeLevel}
          onToggleMute={toggleMute}
        />

      </div>
    </div>
  );
}