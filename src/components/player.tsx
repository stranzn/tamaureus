import { createSignal } from 'solid-js';
import SongInfo from './player_components/song-info';
import Controls from './player_components/controls';
import Volume from './player_components/volume';

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

  // Handlers
  const handleVolumeChange = (value: number[]) => {
    setVolume(value);
    if (value[0] > 0) setIsMuted(false);
  };

  return (
    <div class="w-full shadow-lg p-6" style={{ "background-color": 'var(--color-surface)' }}>
      <div class="flex items-center gap-30">
        
        {/* Left: Song Info */}
        <SongInfo 
          cover={albumCover()} 
          title={songTitle()} 
          artist={artistName()} 
        />

        {/* Middle: Controls */}
        <Controls 
          isPlaying={isPlaying()}
          currentTime={currentTime()}
          duration={duration()}
          onPlayPause={() => setIsPlaying(!isPlaying())}
          onSeek={(val) => setCurrentTime(val)}
          onPrev={() => {}}
          onNext={() => {}}
        />

        {/* Right: Volume */}
        <Volume 
          volume={volume()}
          isMuted={isMuted()}
          onVolumeChange={handleVolumeChange}
          onToggleMute={() => setIsMuted(!isMuted())}
        />

      </div>
    </div>
  );
}