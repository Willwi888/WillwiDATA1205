
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Song, SongContextType, Language, ProjectType, ReleaseCategory } from '../types';
import { dbService } from '../services/db';

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
    official1205Cover: "https://drive.google.com/thumbnail?id=1N8W0s0uS8_f0G5w4s5F_S3_E8_v0M_V_&sz=w2000",
    defaultCover: "https://placehold.co/1000x1000/020617/fbbf24?text=Willwi+1205"
};

const SETTINGS_LOCAL_KEY = 'willwi_settings_backup';

export const normalizeIdentifier = (val: string) => (val || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
export const resolveDirectLink = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();
    if (cleanUrl.includes('dropbox.com')) {
        let base = cleanUrl.split('?')[0];
        base = base.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('dropbox.com', 'dl.dropboxusercontent.com');
        return `${base}?raw=1`;
    }
    return cleanUrl;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
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
          qr_production: '', qr_cinema: '', qr_support: '', accessCode: '8888',
          exclusiveYoutubeUrl: ''
      };
  });

  useEffect(() => {
      localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(globalSettings));
  }, [globalSettings]);

  const uploadSongsToCloud = useCallback(async (data?: Song[]) => {
    setIsSyncing(true);
    setSyncProgress(10);
    try {
        const list = data || songs;
        // 分批推送避免 URL 過長或 Payload 過大
        const payload = list.map(s => ({ 
            id: s.id, title: s.title, isrc: s.isrc || '', upc: s.upc || '', 
            cover_url: s.coverUrl, audio_url: s.audioUrl || '', 
            youtube_url: s.youtubeUrl || '', lyrics: s.lyrics || '', 
            language: s.language, project_type: s.projectType, 
            release_date: s.releaseDate, is_interactive_active: !!s.isInteractiveActive 
        }));
        
        setSyncProgress(50);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
            body: JSON.stringify(payload) 
        });
        
        if (res.ok) {
            setSyncProgress(100);
            return true;
        }
        return false;
    } catch (e) { return false; } finally { setTimeout(() => setIsSyncing(false), 500); }
  }, [songs]);

  const uploadSettingsToCloud = useCallback(async (settings: GlobalSettings) => {
    setIsSyncing(true);
    setSyncProgress(20);
    try {
        const payload = { id: 'SYSTEM_CONFIG', description: JSON.stringify(settings) };
        await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
            body: JSON.stringify(payload) 
        });
        localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
        setSyncProgress(100);
    } catch (e) {} finally { setTimeout(() => setIsSyncing(false), 500); }
  }, []);

  const loadData = useCallback(async () => {
      setIsSyncing(true);
      setSyncProgress(10);
      const localSongs = await dbService.getAllSongs();
      if (localSongs.length > 0) {
          setSongs(localSongs.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      }

      try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*`, { 
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } 
          });
          if (res.ok) {
              const remote = await res.json();
              const config = remote.find((r: any) => r.id === 'SYSTEM_CONFIG');
              const songList = remote.filter((r: any) => r.id !== 'SYSTEM_CONFIG');
              
              if (config) { 
                  try { 
                      const parsed = JSON.parse(config.description);
                      setGlobalSettings(prev => ({ ...prev, ...parsed })); 
                  } catch(e) {} 
              }
              
              const cloudSongs = songList.map((s: any) => ({ 
                  ...s, 
                  coverUrl: s.cover_url || s.coverUrl || ASSETS.defaultCover, 
                  audioUrl: s.audio_url, youtubeUrl: s.youtube_url,
                  language: s.language, projectType: s.project_type, 
                  releaseDate: s.release_date, isInteractiveActive: s.is_interactive_active 
              }));

              if (cloudSongs.length > 0) {
                  const sorted = cloudSongs.sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
                  setSongs(sorted);
                  await dbService.clearAllSongs();
                  await dbService.bulkAdd(sorted);
              }
          }
          setSyncProgress(100);
      } catch (e) {} finally { setTimeout(() => setIsSyncing(false), 500); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <DataContext.Provider value={{ 
        songs, 
        addSong: async (s) => {
            const song = { ...s, id: normalizeIdentifier(s.isrc || s.id), origin: 'local' as const };
            await dbService.addSong(song);
            setSongs(prev => [song, ...prev].sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
            await uploadSongsToCloud([song, ...songs]);
            return true;
        },
        updateSong: async (id, s) => {
            const existing = songs.find(x => x.id === id);
            if (existing) {
                const updated = { ...existing, ...s };
                await dbService.updateSong(updated);
                setSongs(prev => prev.map(x => x.id === id ? updated : x));
                await uploadSongsToCloud(songs.map(x => x.id === id ? updated : x));
            }
            return true;
        },
        deleteSong: async (id) => {
            await dbService.deleteSong(id);
            const nextSongs = songs.filter(x => x.id !== id);
            setSongs(nextSongs);
            // 這裡推送剩餘的給雲端，模擬刪除效果
            await uploadSongsToCloud(nextSongs);
        },
        getSong: (id) => songs.find(s => s.id === id),
        bulkAddSongs: async (s) => {
            await dbService.clearAllSongs();
            await dbService.bulkAdd(s);
            setSongs(s);
            return await uploadSongsToCloud(s);
        },
        bulkAppendSongs: async (newSongs) => {
            const combined = [...songs];
            newSongs.forEach(ns => {
                if (!combined.find(c => c.id === ns.id)) combined.push(ns);
            });
            const sorted = combined.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
            await dbService.bulkAdd(sorted);
            setSongs(sorted);
            return await uploadSongsToCloud(sorted);
        },
        isSyncing, syncSuccess, syncProgress, refreshData: loadData, 
        uploadSongsToCloud, uploadSettingsToCloud, globalSettings, setGlobalSettings,
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
