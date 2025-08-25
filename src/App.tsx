import { Router, Route } from "@solidjs/router";
import { Component, lazy } from "solid-js";
import RootLayout from "./layouts/root-layout";

// Lazy load your components for better performance
const Library = lazy(() => import("./pages/Library"));
const Listen = lazy(() => import("./pages/Listen"));

const App: Component = () => {
  return (
    <Router root={RootLayout}>
      <Route path="/" component={Library} />
      <Route path="/listen" component={Listen} />
    </Router>
  );
};

export default App;