import { Component } from 'solid-js';

interface SongInfoProps {
  cover: string;
  title: string;
  artist: string;
}

const SongInfo: Component<SongInfoProps> = (props) => {
  return (
    <>
      <style>
        {`
          @keyframes scroll-text {
            0%, 15% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
          .hover-scroll:hover .scroll-inner {
            display: inline-block;
            animation: scroll-text 8s linear infinite alternate;
          }
        `}
      </style>

      {/* Using Grid: [Image] [Text] 
         grid-cols-[auto_1fr] ensures the text takes only remaining space 
         and strictly respects the parent width.
      */}
      <div class="grid grid-cols-[auto_1fr] items-center gap-3 w-full max-w-full overflow-hidden">
        
        {/* Cover Art */}
        <div class="relative flex-shrink-0">
          <img
            src={props.cover}
            alt={props.title}
            class="w-14 h-14 rounded-md shadow-sm object-cover"
          />
        </div>

        {/* Text Container */}
        <div class="flex flex-col justify-center min-w-0 overflow-hidden">
          
          {/* Song Title: Scrolls on hover if too long */}
          <div 
            class="hover-scroll relative w-full overflow-hidden whitespace-nowrap mask-linear-fade"
            title={props.title} // Native browser tooltip as backup
          >
            <h3 
              class="scroll-inner font-semibold text-sm cursor-default"
              style={{ color: 'var(--color-content)' }}
            >
              {props.title}
            </h3>
          </div>

          {/* Artist Name */}
          <p
            class="text-xs truncate hover:underline cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--color-tertiary)' }}
          >
            {props.artist}
          </p>
        </div>
      </div>
    </>
  );
};

export default SongInfo;