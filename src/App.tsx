import { Router, Route, Navigate } from "@solidjs/router";
import { Component, lazy, createSignal, onMount, Show, createContext, useContext, JSX } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import RootLayout from "./layouts/root-layout";
import TitleBar from "./components/title-bar";

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
const Playlist = lazy(() => import("./pages/Playlist"));
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
    <div class="flex h-screen flex-col overflow-hidden">
      <TitleBar />
      <Show
        fallback={<div class="flex flex-1 items-center justify-center">Loading...</div>}
        when={isReady()}
      >
        <Router root={RootLayout}>
          <Route path="/setup" component={Setup} />
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
          <Route
            path="/playlist/:id"
            component={() => (hasMusicDir() ? <Playlist /> : <Navigate href="/setup" />)}
          />
        </Router>
      </Show>
    </div>
  );
};

const App: Component = () => (
  <AppStateProvider>
    <AppContent />
  </AppStateProvider>
);

export default App;