import { playerStore } from "../store/playerStore";

export default function Library() {
  const { loadAndPlay, currentPath } = playerStore;

  const mySongs = [
    { id: 1, title: "Caesar EP - pinKing ｜ Zenless Zone Zero", artist: "Zenless Zone Zero", path: "C:\\Users\\aface\\Desktop\\songs\\Caesar EP - ＂pinKing＂ ｜ Zenless Zone Zero.mp3" },
    { id: 2, title: "Starboy", artist: "The Weeknd", path: "/path/to/song2.mp3" },
  ];

  return (
    <div class="p-8">
      <h1 class="text-2xl font-bold mb-4">My Library</h1>
      <div class="flex flex-col gap-2">
        {mySongs.map((song) => (
          <button
            onClick={() => loadAndPlay(song.path, song.title, song.artist)}
            class="flex items-center justify-between p-4 rounded-lg bg-[var(--color-secondary)] hover:bg-[var(--color-accent)] transition-colors group"
          >
            <div class="text-left">
              <div class="font-medium group-hover:text-white">{song.title}</div>
              <div class="text-sm opacity-70 group-hover:text-white">{song.artist}</div>
            </div>
            
            {/* Show 'Playing' indicator if this path matches the store's currentPath */}
            {currentPath() === song.path && (
              <span class="text-xs font-bold uppercase tracking-widest text-[var(--color-primary)] bg-white px-2 py-1 rounded">
                Playing
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
