
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

export enum ReleaseCategory {
  Single = 'Single (單曲)',
  EP = 'EP (迷你專輯)',
  Album = 'Album (專輯)'
}

export interface Song {
  id: string;
  title: string;
  versionLabel?: string; 
  coverUrl: string;
  coverOverlayText?: string; 
  language: Language;
  projectType: ProjectType;
  releaseCategory?: ReleaseCategory;
  releaseCompany?: string; 
  publisher?: string; 
  releaseDate: string;
  isEditorPick: boolean;
  isInteractiveActive: boolean; 
  isOfficialExclusive: boolean; 
  isrc?: string;
  upc?: string;
  spotifyId?: string;
  musicBrainzId?: string;
  youtubeUrl?: string;
  cloudVideoUrl?: string; 
  customAudioLink?: string; 
  musixmatchUrl?: string; 
  youtubeMusicUrl?: string;
  spotifyLink?: string;
  appleMusicLink?: string;
  smartLink?: string; 
  distrokidManageUrl?: string; 
  audioUrl?: string;
  lyrics?: string;
  description?: string;
  credits?: string;
}

export interface LyricConfig {
    layout: 'lyrics' | 'subtitles' | 'cover';
    format: 'social' | 'youtube';
    alignVertical: 'top' | 'middle' | 'bottom';
    alignHorizontal: 'left' | 'center' | 'right' | 'justify';
    textCase: 'uppercase' | 'lowercase' | 'capitalize';
    lyricStyle: 'none' | 'broken' | 'cutout' | 'layered';
    effect: 'none' | 'glow';
    motion: 'slide' | 'fade' | 'wipe' | 'static' | 'popup' | 'mask' | 'expand' | 'fill' | 'bubbling';
    motionTweaks: 'none' | 'floating';
    syncMode: 'line' | 'word';
    fontSize: 'small' | 'medium' | 'large';
}

export interface SongContextType {
  songs: Song[];
  addSong: (song: Song) => Promise<boolean>;
  updateSong: (id: string, updatedSong: Partial<Song>) => Promise<boolean>;
  deleteSong: (id: string) => Promise<void>;
  getSong: (id: string) => Song | undefined;
  bulkAddSongs: (songs: Song[]) => Promise<boolean>;
}

export const getLanguageColor = (lang: string) => {
  switch (lang) {
    case Language.Mandarin: return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
    case Language.Taiwanese: return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
    case Language.Japanese: return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]';
    case Language.Korean: return 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]';
    case Language.English: return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
    case Language.French: return 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]';
    case Language.Thai: return 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]';
    case Language.Italian: return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]';
    case Language.Instrumental: return 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]';
    default: return 'bg-slate-500';
  }
};
