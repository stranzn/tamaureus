import { Router, Route, Navigate } from "@solidjs/router";
import { Component, lazy, createSignal, onMount, Show, createContext, useContext, JSX } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import RootLayout from "./layouts/root-layout";

// --- Global State Context ---
const AppStateContext = createContext<{
  hasMusicDir: () => boolean;
  setHasMusicDir: (val: boolean) => void;
}>();

export function AppStateProvider(props: { children: JSX.Element }) {
  const [hasMusicDir, setHasMusicDir] = createSignal(false);
  return (
    <AppStateContext.Provider value={{ hasMusicDir, setHasMusicDir }}>
      {props.children}
    </AppStateContext.Provider>
  );
}

export const useAppState = () => useContext(AppStateContext)!;

// --- Lazy Pages ---
const Library = lazy(() => import("./pages/Library"));
const Listen = lazy(() => import("./pages/Listen"));
const Settings = lazy(() => import("./pages/Settings"));
const Setup = lazy(() => import("./pages/Setup"));

const AppContent: Component = () => {
  const { hasMusicDir, setHasMusicDir } = useAppState();
  const [isReady, setIsReady] = createSignal(false);

  onMount(async () => {
    try {
      const dir = await invoke<string | null>("load_music_dir");
      setHasMusicDir(!!dir);
    } catch (err) {
      console.error("Failed to check music directory:", err);
    } finally {
      setIsReady(true);
    }
  });

  return (
    <Show fallback={<div class="h-screen flex items-center justify-center">Loading...</div>} when={isReady()}>
      <Router root={RootLayout}>
        {/* We use a simple path here; Setup handles its own internal redirect logic */}
        <Route path="/setup" component={Setup} />

        {/* Protected App Routes */}
        <Route
          path="/"
          component={() => (hasMusicDir() ? <Library /> : <Navigate href="/setup" />)}
        />
        <Route
          path="/listen"
          component={() => (hasMusicDir() ? <Listen /> : <Navigate href="/setup" />)}
        />
        <Route
          path="/settings"
          component={() => (hasMusicDir() ? <Settings /> : <Navigate href="/setup" />)}
        />
      </Router>
    </Show>
  );
};

const App: Component = () => (
  <AppStateProvider>
    <AppContent />
  </AppStateProvider>
);

export default App;