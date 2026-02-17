import { useNavigate } from "@solidjs/router";
import {ArrowLeft} from "lucide-solid";

export default function Playlist() {
    const navigate = useNavigate();


    return (
        <div>
            <button 
                class="text-[var(--color-primary)] mb-4" 
                onclick={() => navigate("/")}
            >
                <ArrowLeft size={16} class="mr-2 inline" />
                Back to Library
            </button>
            <h1 class="text-2xl font-bold">New Playlist</h1>
            {/* Your playlist creation form goes here */}
        </div>
    );

}