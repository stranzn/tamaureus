import { ParentComponent, Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import Menu from "../components/menu";
import Player from "../components/player";
import QueueSidebar from "../components/QueueSidebar";
import { mountTheme } from "../components/theme-toggle";
import "./index.css";

const RootLayout: ParentComponent = (props) => {
    mountTheme();
    
    const location = useLocation();
    
    // Check if the current route is the setup page
    const isSetup = () => location.pathname === "/setup";

    return (
        <div class="h-screen flex flex-col overflow-hidden">
            
            <div class="flex flex-1 flex-row transition-colors duration-300 overflow-hidden">
                {/* 1. Hide the Menu if we are in Setup */}
                <Show when={!isSetup()}>
                    <Menu />
                </Show>
                
                <main 
                    class="flex-1 bg-[var(--color-background)] text-[var(--color-content)] transition-colors duration-300 overflow-y-auto"
                    classList={{
                        "pl-6 pt-6": !isSetup(),
                        "flex items-center justify-center": isSetup() // Center the setup content
                    }}
                >
                    {props.children}
                </main>

                {/* Queue sidebar — hidden in Setup, renders nothing when closed */}
                <Show when={!isSetup()}>
                    <QueueSidebar />
                </Show>
            </div>

            {/* 3. Hide the Player if we are in Setup */}
            <Show when={!isSetup()}>
                <div>
                    <Player />
                </div>
            </Show>

        </div>
    );
}

export default RootLayout;