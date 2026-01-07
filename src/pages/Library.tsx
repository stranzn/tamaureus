import { Menu, Search, Plus } from 'lucide-solid';


export default function Library() {

    // Im assuming that I will get a list of and playlists from the database
    // hopefully playlists and songs will be formatted in json

    // 
    


    return(
        <main>
            <div>
                <p class="text-[var(--color-content)] text-2xl">Library</p>
            </div>
            <div class="flex flex-row items-center gap-4 mt-5">
                <div class="relative flex-1"> 
                    <input 
                    type="text"
                    placeholder="Search your library..."
                    class="w-full p-2 pr-10 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" 
                    />
                    <Search 
                    size={20}
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    />
                </div>
                <Menu class="mr-10" size={40}/>
            </div>

            {/* CREATE PLAYLISTS BUTTON */}
            <div class="mt-8 flex flex-col items-center w-fit">
                <div 
                    class="w-32 h-32 border-2 border-dashed border-[var(--color-secondary)] rounded-md flex items-center justify-center cursor-pointer hover:border-[var(--color-primary)] transition-colors duration-300"
                >
                    <Plus 
                    size={43} 
                    class="text-gray-400 hover:text-[var(--color-primary)] transition-colors duration-300"
                    />
                </div>

                <p class="text-gray-500 mt-2 text-center">Create New Playlist</p>
            </div>


            {/* HERE I WILL ADD PLAYLIST BASED ON AN ARRAY OF PLAYLISTS */}

            <hr class="w-[95%] mt-8"/>


            {/* ADD SONG BUTTON */}
            <div class="mt-8 flex flex-col items-center w-fit">
                <div 
                    class="w-32 h-32 border-2 border-dashed border-[var(--color-secondary)] rounded-md flex items-center justify-center cursor-pointer hover:border-[var(--color-primary)] transition-colors duration-300"
                >
                    <Plus 
                    size={43} 
                    class="text-gray-400 hover:text-[var(--color-primary)] transition-colors duration-300"
                    />
                </div>

                <p class="text-gray-500 mt-2 text-center">Add New Song</p>
            </div>

            {/* SAME THING (LIST SONGS BASED ON AN ARRAY OF SONGS) */}








        </main>
    
    );
}