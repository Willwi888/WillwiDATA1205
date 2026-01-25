
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

export const resolveDirectLink = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();
    if (cleanUrl.includes('dropbox.com')) {
        let base = cleanUrl.split('?')[0];
        base = base.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                   .replace('dropbox.com', 'dl.dropboxusercontent.com');
        return `${base}?raw=1`;
    }
    if (cleanUrl.includes('drive.google.com')) {
        const idMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || cleanUrl.match(/id=([a-zA-Z0-9_-]{25,})/);
        const id = idMatch ? idMatch[1] : null;
        if (id) return `https://docs.google.com/uc?export=download&id=${id}`;
    }
    return cleanUrl;
};

export const normalizeIdentifier = (val: string) => (val || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(true);
  const [syncProgress, setSyncProgress] = useState(100);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ 
      portraitUrl: ASSETS.willwiPortrait, 
      qr_global_payment: '', 
      qr_line: '', 
      qr_production: '', 
      qr_cinema: '', 
      qr_support: '', 
      accessCode: '8888',
      exclusiveYoutubeUrl: ''
  });

  const syncToCloud = useCallback(async (data?: Song[]) => {
    setIsSyncing(true);
    setSyncProgress(20);
    try {
        const list = data || await dbService.getAllSongs();
        // 核心：明確指定欄位映射，避免封面遺失
        const payload = list.map(s => ({ 
            id: s.id, 
            title: s.title, 
            isrc: s.isrc || '', 
            upc: s.upc || '', 
            cover_url: s.coverUrl, // 本地 coverUrl -> 雲端 cover_url
            audio_url: s.audioUrl || '', 
            dropbox_url: s.dropboxUrl || '', 
            youtube_url: s.youtubeUrl || '',
            soundcloud_url: s.soundcloudUrl || '',
            lyrics: s.lyrics || '', 
            description: s.description || '', 
            language: s.language, 
            project_type: s.projectType, 
            release_date: s.releaseDate, 
            is_interactive_active: !!s.isInteractiveActive 
        }));
        
        const res = await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 
                'apikey': SUPABASE_KEY, 
                'Authorization': `Bearer ${SUPABASE_KEY}`, 
                'Content-Type': 'application/json', 
                'Prefer': 'resolution=merge-duplicates' 
            }, 
            body: JSON.stringify(payload) 
        });
        setSyncProgress(100);
        return res.ok;
    } catch (e) { return false; } finally { setIsSyncing(false); }
  }, []);

  const uploadSettingsToCloud = useCallback(async (settings: GlobalSettings) => {
    setIsSyncing(true);
    try {
        const payload = { id: 'SYSTEM_CONFIG', description: JSON.stringify(settings) };
        await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
            body: JSON.stringify(payload) 
        });
    } catch (e) {} finally { setIsSyncing(false); }
  }, []);

  const loadData = useCallback(async () => {
      setIsSyncing(true);
      try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*`, { 
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } 
          });
          if (res.ok) {
              const remote = await res.json();
              const config = remote.find((r: any) => r.id === 'SYSTEM_CONFIG');
              const songList = remote.filter((r: any) => r.id !== 'SYSTEM_CONFIG');
              
              if (config) { try { setGlobalSettings(prev => ({ ...prev, ...JSON.parse(config.description) })); } catch(e) {} }
              
              // 核心：從雲端抓下來時明確映射回 coverUrl
              const cleanSongs = songList.map((s: any) => ({ 
                  ...s, 
                  coverUrl: s.cover_url || s.coverUrl || ASSETS.defaultCover, 
                  audioUrl: s.audio_url, 
                  dropboxUrl: s.dropbox_url, 
                  youtubeUrl: s.youtube_url,
                  soundcloudUrl: s.soundcloud_url,
                  language: s.language, 
                  projectType: s.project_type, 
                  releaseDate: s.release_date, 
                  isInteractiveActive: s.is_interactive_active 
              })).sort((a:any, b:any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
              
              setSongs(cleanSongs);
              await dbService.clearAllSongs();
              await dbService.bulkAdd(cleanSongs);
          }
      } catch (e) {} finally { setIsSyncing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <DataContext.Provider value={{ 
        songs, 
        addSong: async (s) => {
            const song = { ...s, id: normalizeIdentifier(s.isrc || s.id), origin: 'local' as const };
            await dbService.addSong(song);
            const all = await dbService.getAllSongs();
            setSongs(all.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
            await syncToCloud(all);
            return true;
        },
        updateSong: async (id, s) => {
            const existing = songs.find(x => x.id === id);
            if (existing) {
                const updated = { ...existing, ...s };
                await dbService.updateSong(updated);
                const all = await dbService.getAllSongs();
                setSongs(all.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
                await syncToCloud(all);
            }
            return true;
        },
        deleteSong: async (id) => {
            await dbService.deleteSong(id);
            const all = await dbService.getAllSongs();
            setSongs(all.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
            await syncToCloud(all);
        },
        getSong: (id) => songs.find(s => s.id === id),
        bulkAddSongs: async (s) => {
            await dbService.clearAllSongs();
            await dbService.bulkAdd(s);
            setSongs(s);
            return await syncToCloud(s);
        },
        bulkAppendSongs: async (newSongs) => {
            const existing = await dbService.getAllSongs();
            const existingIds = new Set(existing.map(s => s.id));
            const uniqueNew = newSongs.filter(s => !existingIds.has(s.id));
            const combined = [...existing, ...uniqueNew];
            await dbService.bulkAdd(combined);
            setSongs(combined.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
            return await syncToCloud(combined);
        },
        isSyncing, syncSuccess, syncProgress, refreshData: loadData, 
        uploadSongsToCloud: syncToCloud, uploadSettingsToCloud, 
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
