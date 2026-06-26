export interface Track {
  id: number;
  file_path: string;
  title: string;
  artist_name: string;
  thumbnail_base64: string | null;
  thumbnail_mime: string | null;
}

export interface Playlist {
  id: number;
  name: string;
  track_count: number;
  cover_path: string | null;
  cover_url: string | null;
  thumb1_base64: string | null;
  thumb1_mime: string | null;
  thumb2_base64: string | null;
  thumb2_mime: string | null;
  thumb3_base64: string | null;
  thumb3_mime: string | null;
  thumb4_base64: string | null;
  thumb4_mime: string | null;
  thumbnails: { base64: string; mime: string }[];
}