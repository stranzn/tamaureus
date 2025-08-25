import { ParentComponent } from "solid-js";
import Menu from "../components/menu";
import "./index.css";


const RootLayout: ParentComponent = (props) => {
    return (
        <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Menu />
            {/* Main content area with padding to account for burger button */}
            <main class="pl-4 pt-16 pr-4 pb-4">
                {props.children}
            </main>
        </div>
    );
}

export default RootLayout;