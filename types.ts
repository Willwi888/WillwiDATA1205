
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

export interface SongTranslation {
  title?: string;
  lyrics?: string;
  description?: string;
}

export interface Song {
  id: string;
  title: string;
  versionLabel?: string; 
  coverUrl: string;
  language: Language;
  projectType: ProjectType;
  releaseCategory?: ReleaseCategory;
  releaseCompany?: string; 
  publisher?: string; 
  releaseDate: string;
  isEditorPick: boolean;
  isInteractiveActive: boolean;
  isrc?: string;
  upc?: string;
  spotifyLink?: string;
  appleMusicLink?: string;
  youtubeUrl?: string;
  soundcloudUrl?: string;
  audioUrl?: string;
  dropboxUrl?: string;
  lyrics?: string;
  credits?: string;
  origin?: 'local' | 'cloud';
  description?: string;
  // The Storyline Fields
  creativeNote?: string; // 創作筆記
  labLog?: string;      // 實驗室日誌
  // Multi-language translation support
  translations?: Record<string, SongTranslation>; 
}

export interface SongContextType {
  songs: Song[];
  addSong: (song: Song) => Promise<boolean>;
  updateSong: (id: string, updatedSong: Partial<Song>) => Promise<boolean>;
  deleteSong: (id: string) => Promise<void>;
  getSong: (id: string) => Song | undefined;
  bulkAddSongs: (songs: Song[]) => Promise<boolean>;
}
