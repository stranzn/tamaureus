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
      console;
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
    </div>
  );
}
