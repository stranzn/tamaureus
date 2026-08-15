import ThemeToggle from "../components/theme-toggle";
import DeleteFilesToggle from "../components/delete-file-toggle";

export default function Settings() {
    
    return(
        <div class="pl-4">
            <h1 class="text-2xl font-bold pt-4 text-content">Settings</h1>
            <ThemeToggle />
            <DeleteFilesToggle />
        </div>
    );
}