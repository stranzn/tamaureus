import { ParentComponent } from "solid-js";
import Menu from "../components/menu";
import Player from "../components/player";
import { mountTheme } from "../components/theme-toggle";
import "./index.css";

const RootLayout: ParentComponent = (props) => {
    mountTheme();
    
    return (
        <div class="h-screen flex flex-col overflow-hidden">
        
            <div class="flex flex-1 flex-row overflow-hidden">
                <Menu />
                
                <main class="flex-1 bg-[var(--color-background)] text-[var(--color-content)] overflow-y-auto">
                    {props.children}
                </main>
            </div>

            <div>
                <Player />
            </div>

        </div>
    );
}

export default RootLayout;