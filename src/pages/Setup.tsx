import { createSignal, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useNavigate } from "@solidjs/router";
import { useAppState } from "../App"; // Adjust import path if AppContext is separate

export default function Setup() {
  const [directory, setDirectory] = createSignal("");
  const { hasMusicDir, setHasMusicDir } = useAppState();
  const navigate = useNavigate();

  // Guard: If user manually types /setup but is already configured
  onMount(() => {
    if (hasMusicDir()) {
      navigate("/", { replace: true });
    }
  });

  const chooseFolder = async () => {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: "Select Music Folder",
      });

      if (result && typeof result === "string") {
        setDirectory(result);
      }
    } catch (err) {
      console.error("Dialog error:", err);
    }
  };

  const continueApp = async () => {
    const path = directory();
    if (!path) return;

    try {
      // 1. Save to Rust backend
      await invoke("save_music_dir", { path });

      // 2. Update Global UI State
      setHasMusicDir(true);

      // 3. Navigate to Library
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save directory.");
    }
  };

  return (
    <div class="flex flex-col items-center justify-center text-center p-8">
      <h1 class="text-3xl font-bold mb-6">Welcome to Tamaureus</h1>
      <p class="mb-8 text-gray-400">Please select the folder where your music is stored to begin.</p>

      <div class="bg-black/20 p-6 rounded-lg border border-white/10 w-full max-w-md">
        <button 
          onClick={chooseFolder}
          class="bg-[var(--color-accent)] hover:bg-[var(--color-muted)] text-white px-6 py-2 rounded-md transition-colors"
        >
          {directory() ? "Change Folder" : "Select Folder"}
        </button>
        
        <p class="mt-4 text-sm truncate text-blue-400 italic">
          {directory() || "No folder selected"}
        </p>
      </div>

      <button
        onClick={continueApp}
        disabled={!directory()}
        class="mt-10 px-10 py-3 rounded-full font-bold transition-all"
        classList={{
          "bg-white text-black hover:scale-105": !!directory(),
          "bg-gray-700 text-gray-500 cursor-not-allowed": !directory()
        }}
      >
        Get Started
      </button>
    </div>
  );
}

