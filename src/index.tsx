/* @refresh reload */
import { render } from "solid-js/web";
import { mountTheme } from "./components/theme-toggle";
import App from "./App";

mountTheme();
render(() => <App />, document.getElementById("root") as HTMLElement);
