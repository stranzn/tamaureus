import { invoke } from "@tauri-apps/api/core";
import { createSignal } from "solid-js";

export default function Library() {
  const [artistName, setArtistName] = createSignal("");

  const addArtist = async (): Promise<void> => {
    try {
      const rowid = await invoke<number>("add_artist", {
        name: artistName(),
      });
      console.log("Artist added with rowid:", rowid);
    } catch (error) {
      console.log(error);
    }
  };

  const playSong = async (): Promise<void> => {
    try {
        const song = await invoke<void>("play_track", { path: "C:/Users/Nik6s/Videos/slop.mp3"});
        console.log("Song Playing!");
    } catch (error) {
      console.error(error);
    }
  };

  const handleInput = (e: InputEvent & { currentTarget: HTMLInputElement }) => {
    setArtistName(e.currentTarget.value);
  };

  return (
    <div>
      <h1 class="text-emerald-400 text-2xl">Listen</h1>
      <input
        type="text"
        value={artistName()}
        onInput={handleInput}
        placeholder="Enter artists name here!"
      />
      <button onClick={addArtist}>Add Artist</button>
      <button class="m-2 p-2" onClick={playSong}>Play Song!</button>
    </div>
  );
}
