
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Song, SongContextType, Language, ProjectType, ReleaseCategory } from '../types';
import { dbService } from '../services/db';
import { OFFICIAL_CATALOG } from './InitialData';

interface GlobalSettings {
    portraitUrl: string;
    qr_global_payment: string;
    qr_line: string;
    qr_production: string;
    qr_cinema: string;
    qr_support: string;
    accessCode: string;
    exclusiveYoutubeUrl?: string;
}

interface ExtendedSongContextType extends SongContextType {
    isSyncing: boolean;
    syncSuccess: boolean;
    syncProgress: number;
    refreshData: () => Promise<void>;
    uploadSongsToCloud: (data?: Song[]) => Promise<boolean>;
    uploadSettingsToCloud: (settings: GlobalSettings) => Promise<void>;
    bulkAppendSongs: (songs: Song[]) => Promise<boolean>;
    globalSettings: GlobalSettings;
    setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
    currentSong: Song | null;
    setCurrentSong: (song: Song | null) => void;
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
}

const DataContext = createContext<ExtendedSongContextType | undefined>(undefined);

const SUPABASE_URL = "https://rzxqseimxhbokrhcdjbi.supabase.co";
const SUPABASE_KEY = "sb_publishable_z_v9ig8SbqNnKHHTwEgOhw_S3g4yhba";

export const ASSETS = {
    willwiPortrait: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000",
    official1205Cover: "https://i.scdn.co/image/ab67616d0000b27346ea8a7ca41dfa894132e36c",
    defaultCover: "https://placehold.co/1000x1000/020617/fbbf24?text=Willwi+1205"
};

const SETTINGS_LOCAL_KEY = 'willwi_settings_backup';

export const normalizeIdentifier = (val: string) => (val || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

/**
 * 核心連結修復機制：將 Dropbox 連結強制轉換為音訊流
 */
export const resolveDirectLink = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();
    
    if (cleanUrl.includes('dropbox.com')) {
        let base = cleanUrl.split('?')[0];
        // 替換為內容直連伺服器
        base = base.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                   .replace('dropbox.com', 'dl.dropboxusercontent.com');
        
        // 保留 Dropbox 特有的 rlkey 參數
        const urlObj = new URL(cleanUrl);
        const rlkey = urlObj.searchParams.get('rlkey');
        
        if (rlkey) {
            return `${base}?rlkey=${rlkey}&raw=1`;
        }
        return `${base}?raw=1`;
    }
    
    return cleanUrl;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>(OFFICIAL_CATALOG);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(true);
  const [syncProgress, setSyncProgress] = useState(100);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
      const backup = localStorage.getItem(SETTINGS_LOCAL_KEY);
      if (backup) return JSON.parse(backup);
      return { 
          portraitUrl: ASSETS.willwiPortrait, qr_global_payment: '', qr_line: '', 
          qr_production: '', qr_cinema: '', qr_support: '', accessCode: '8520',
          exclusiveYoutubeUrl: ''
      };
  });

  const loadData = useCallback(async () => {
      setIsSyncing(true);
      setSyncProgress(10);
      
      const localSongs = await dbService.getAllSongs();
      if (localSongs.length > 0) {
          setSongs(localSongs.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      } else {
          await dbService.bulkAdd(OFFICIAL_CATALOG);
          setSongs(OFFICIAL_CATALOG.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      }

      try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*`, { 
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } 
          });
          if (res.ok) {
              const remote = await res.json();
              if (remote.length > 0) {
                  const cloudSongs = remote.filter((r:any) => r.id !== 'SYSTEM_CONFIG').map((s: any) => ({ 
                      ...s, 
                      coverUrl: s.cover_url || s.coverUrl || ASSETS.defaultCover, 
                      audioUrl: s.audio_url || s.audioUrl || '', 
                      youtubeUrl: s.youtube_url || s.youtubeUrl || '',
                      language: s.language as Language, 
                      projectType: s.project_type as ProjectType, 
                      releaseDate: s.release_date || s.releaseDate, 
                      isInteractiveActive: s.is_interactive_active !== undefined ? s.is_interactive_active : !!s.isInteractiveActive 
                  }));
                  setSongs(cloudSongs.sort((a:any, b:any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
              }
          }
      } catch (e) {} finally { setIsSyncing(false); setSyncProgress(100); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <DataContext.Provider value={{ 
        songs, 
        addSong: async (s) => {
            const song = { ...s, id: normalizeIdentifier(s.isrc || s.id), origin: 'local' as const };
            await dbService.addSong(song);
            setSongs(prev => [song, ...prev].sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
            return true;
        },
        updateSong: async (id, s) => {
            const existing = songs.find(x => x.id === id);
            if (existing) {
                const updated = { ...existing, ...s };
                await dbService.updateSong(updated);
                setSongs(prev => prev.map(x => x.id === id ? updated : x));
            }
            return true;
        },
        deleteSong: async (id) => {
            await dbService.deleteSong(id);
            setSongs(prev => prev.filter(x => x.id !== id));
        },
        getSong: (id) => songs.find(s => s.id === id),
        bulkAddSongs: async (s) => {
            await dbService.clearAllSongs();
            await dbService.bulkAdd(s);
            setSongs(s);
            return true;
        },
        bulkAppendSongs: async (newSongs) => {
            const combined = [...songs];
            newSongs.forEach(ns => {
                if (!combined.find(c => c.id === ns.id)) combined.push(ns);
            });
            setSongs(combined.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
            return true;
        },
        isSyncing, syncSuccess, syncProgress, refreshData: loadData, 
        uploadSongsToCloud: async (data) => {
            setIsSyncing(true);
            try {
                const list = data || songs;
                const payload = list.map(s => ({ 
                    id: s.id, title: s.title, isrc: s.isrc || '', upc: s.upc || '', 
                    cover_url: s.coverUrl, audio_url: s.audioUrl || '', 
                    youtube_url: s.youtubeUrl || '', lyrics: s.lyrics || '', 
                    language: s.language, project_type: s.projectType, 
                    release_date: s.releaseDate, is_interactive_active: !!s.isInteractiveActive
                }));
                const res = await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
                    method: 'POST', 
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
                    body: JSON.stringify(payload) 
                });
                return res.ok;
            } catch (e) { return false; } finally { setIsSyncing(false); }
        },
        uploadSettingsToCloud: async (settings) => {
            setIsSyncing(true);
            try {
                const payload = { id: 'SYSTEM_CONFIG', description: JSON.stringify(settings) };
                await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
                    method: 'POST', 
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
                    body: JSON.stringify(payload) 
                });
                setGlobalSettings(settings);
            } catch (e) {} finally { setIsSyncing(false); }
        },
        globalSettings, setGlobalSettings,
        currentSong, setCurrentSong, isPlaying, setIsPlaying
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData error');
  return context;
};
