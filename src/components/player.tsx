import { playerStore } from '../store/playerStore';
import SongInfo from './player_components/song-info';
import Controls from './player_components/controls';
import Volume from './player_components/volume';

export default function Player() {
  const { 
    isPlaying, volume, isMuted, 
    songTitle, artistName, albumCover, 
    duration, 
    // currentTime,           ← remove this from destructuring
    displayTime,             // ← add this!
    
    togglePlay, setVolumeLevel, toggleMute, 
    seek, skip, loadAndPlay, 
    previewSeek, commitSeek, // ← add commitSeek!
    setIsDragging,
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

        {/* Middle - main change is here */}
        <Controls 
          isPlaying={isPlaying()}
          // currentTime={currentTime()}     ← remove / replace
          currentTime={displayTime()}       // ← use displayTime instead!
          duration={duration()}
          
          onPlayPause={togglePlay}
          onPreviewSeek={previewSeek}       // during drag
          onSeek={commitSeek}               // ← changed! use commitSeek on release
          
          onStartDrag={() => setIsDragging(true)}
          onEndDrag={() => {
            setIsDragging(false);
            // Some people also call commitSeek(displayTime()) here as safety net
          }}
          
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