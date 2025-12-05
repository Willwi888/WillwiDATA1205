
export enum Language {
  Mandarin = '華語',
  Taiwanese = '台語',
  Japanese = '日語',
  Korean = '韓語',
  English = '英語',
  Thai = '泰語',
  Italian = '義大利語',
  French = '法語',
  Instrumental = '純音樂'
}

export enum ProjectType {
  Indie = '獨立發行',
  PaoMien = '泡麵聲學院'
}

export interface Song {
  id: string;
  title: string;
  versionLabel?: string; // e.g., "Acoustic Ver.", "Remix"
  coverUrl: string;
  language: Language;
  projectType: ProjectType;
  releaseDate: string;
  isEditorPick: boolean;
  
  // Metadata
  isrc?: string;
  upc?: string;
  spotifyId?: string; // for embedding
  musicBrainzId?: string; // New field
  
  // External Links
  youtubeUrl?: string; // Lyric Video / MV
  musixmatchUrl?: string;
  youtubeMusicUrl?: string;
  spotifyLink?: string; // Direct link
  appleMusicLink?: string;
  
  // Content
  lyrics?: string;
  description?: string;
  credits?: string; // Producer, Arranger, etc.
}

export interface SongContextType {
  songs: Song[];
  addSong: (song: Song) => Promise<boolean>; 
  updateSong: (id: string, updatedSong: Partial<Song>) => Promise<boolean>; 
  deleteSong: (id: string) => Promise<void>;
  getSong: (id: string) => Song | undefined;
}

// Helper for UI Colors (Spotify for Artists style)
export const getLanguageColor = (lang: string) => {
  switch (lang) {
    case Language.Mandarin: return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]'; // Red/Rose
    case Language.Taiwanese: return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]'; // Orange
    case Language.Japanese: return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]'; // Blue
    case Language.Korean: return 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]'; // Pink
    case Language.English: return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]'; // Green
    case Language.French: return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]'; // Purple
    case Language.Thai: return 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]'; // Cyan
    case Language.Italian: return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]'; // Yellow
    case Language.Instrumental: return 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]'; // Slate
    default: return 'bg-slate-500';
  }
};