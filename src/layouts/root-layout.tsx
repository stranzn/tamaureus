import { ParentComponent } from "solid-js";
import Menu from "../components/menu";
import { mountTheme } from "../components/theme-toggle";
import "./index.css";


const RootLayout: ParentComponent = (props) => {
    mountTheme();
    return (
        <div class="min-h-screen flex flex-row">
            <Menu />
            {/* Main content area with padding to account for burger button */}
            <main class="flex-1 bg-[var(--color-background)] text-[var(--color-content)]">
                {props.children}
            </main>
        </div>
    );
}

export default RootLayout;