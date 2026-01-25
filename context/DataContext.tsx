
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
    exclusiveYoutubeUrl: string; // 新增獨家音樂 YT 串連
}

interface ExtendedSongContextType extends SongContextType {
    isSyncing: boolean;
    syncProgress: number;
    syncSuccess: boolean;
    refreshData: () => Promise<void>;
    uploadSongsToCloud: (data?: Song[]) => Promise<boolean>;
    uploadSettingsToCloud: (settings: GlobalSettings) => Promise<void>;
    globalSettings: GlobalSettings;
    setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
    currentSong: Song | null;
    setCurrentSong: (song: Song | null) => void;
    isPlaying: boolean;
    setIsPlaying: (playing: boolean) => void;
    bulkAppendSongs: (newSongs: Song[]) => Promise<boolean>;
}

const DataContext = createContext<ExtendedSongContextType | undefined>(undefined);

const SUPABASE_URL = "https://rzxqseimxhbokrhcdjbi.supabase.co";
const SUPABASE_KEY = "sb_publishable_z_v9ig8SbqNnKHHTwEgOhw_S3g4yhba";

export const ASSETS = {
    willwiPortrait: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000",
    official1205Cover: "https://drive.google.com/thumbnail?id=1N8W0s0uS8_f0G5w4s5F_S3_E8_v0M_V_&sz=w2000",
    defaultCover: "https://placehold.co/1000x1000/020617/fbbf24?text=Willwi+1205"
};

export const normalizeIdentifier = (val: string) => (val || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

export const resolveDirectLink = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();

    if (cleanUrl.includes('drive.google.com')) {
        const idMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || cleanUrl.match(/id=([a-zA-Z0-9_-]{25,})/);
        const id = idMatch ? idMatch[1] : null;
        if (id) return `https://docs.google.com/uc?export=download&id=${id}`;
    }

    if (cleanUrl.includes('dropbox.com')) {
        if (cleanUrl.includes('/sc/') || cleanUrl.includes('/sh/')) return cleanUrl;
        let resolved = cleanUrl
            .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
            .replace('dropbox.com', 'dl.dropboxusercontent.com');
        if (resolved.includes('?')) {
            if (resolved.includes('dl=1')) resolved = resolved.replace('dl=1', 'raw=1');
            else if (resolved.includes('dl=0')) resolved = resolved.replace('dl=0', 'raw=1');
            else if (!resolved.includes('raw=1')) resolved += '&raw=1';
        } else {
            resolved += '?raw=1';
        }
        return resolved;
    }
    return cleanUrl;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncSuccess, setSyncSuccess] = useState(true);
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
      exclusiveYoutubeUrl: '' // 初始化
  });

  const syncToCloud = useCallback(async (data?: Song[]) => {
    setIsSyncing(true);
    setSyncProgress(0);
    try {
        const list = data || await dbService.getAllSongs();
        const CHUNK_SIZE = 40;
        const totalChunks = Math.ceil(list.length / CHUNK_SIZE);

        for (let i = 0; i < list.length; i += CHUNK_SIZE) {
            const chunk = list.slice(i, i + CHUNK_SIZE);
            const payload = chunk.map(s => ({ 
                id: normalizeIdentifier(s.id),
                title: s.title, 
                isrc: s.isrc || '', 
                upc: s.upc || '', 
                cover_url: s.coverUrl, 
                audio_url: s.audioUrl || '', 
                dropbox_url: s.dropboxUrl || '', 
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
            if (!res.ok) throw new Error("Sync failure");
            const currentChunkIdx = Math.floor(i / CHUNK_SIZE) + 1;
            setSyncProgress(Math.floor((currentChunkIdx / totalChunks) * 100));
        }
        setSyncSuccess(true);
        return true;
    } catch (e) { 
        setSyncSuccess(false);
        return false;
    } finally { 
        setIsSyncing(false); 
        setSyncProgress(100);
    }
  }, []);

  const uploadSettingsToCloud = useCallback(async (settings: GlobalSettings) => {
    setIsSyncing(true);
    try {
        const payload = { id: 'SYSTEM_CONFIG', description: JSON.stringify(settings) };
        await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 
                'apikey': SUPABASE_KEY, 
                'Authorization': `Bearer ${SUPABASE_KEY}`, 
                'Content-Type': 'application/json', 
                'Prefer': 'resolution=merge-duplicates' 
            }, 
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
              if (config) { 
                  try { setGlobalSettings(prev => ({ ...prev, ...JSON.parse(config.description) })); } catch(e) {} 
              }
              const cleanSongs = songList.map((s: any) => ({ 
                  ...s, 
                  coverUrl: s.cover_url, 
                  audioUrl: s.audio_url, 
                  dropboxUrl: s.dropbox_url, 
                  language: s.language, 
                  projectType: s.project_type, 
                  releaseDate: s.release_date, 
                  isInteractiveActive: s.is_interactive_active 
              })).sort((a:any, b:any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
              setSongs(cleanSongs);
              await dbService.clearAllSongs();
              await dbService.bulkAdd(cleanSongs);
              setSyncSuccess(true);
          }
      } catch (e) { setSyncSuccess(false); } finally { setIsSyncing(false); }
  }, []);

  const addSong = async (s: Song) => {
      const key = normalizeIdentifier(s.isrc || s.id);
      const song = { ...s, id: key, origin: 'local' as const };
      await dbService.addSong(song);
      const all = await dbService.getAllSongs();
      setSongs(all.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      await syncToCloud(all);
      return true;
  };

  const updateSong = async (id: string, s: Partial<Song>) => {
      const existing = songs.find(x => x.id === id);
      if (existing) {
          const updated = { ...existing, ...s };
          await dbService.updateSong(updated);
          const all = await dbService.getAllSongs();
          setSongs(all.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
          await syncToCloud(all);
      }
      return true;
  };

  const deleteSong = async (id: string) => {
      await dbService.deleteSong(id);
      try { 
          await fetch(`${SUPABASE_URL}/rest/v1/songs?id=eq.${id}`, { 
              method: 'DELETE', 
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } 
          }); 
      } catch (e) {}
      const all = await dbService.getAllSongs();
      setSongs(all.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
  };

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <DataContext.Provider value={{ 
        songs, addSong, updateSong, deleteSong,
        getSong: (id) => songs.find(s => s.id === id),
        bulkAddSongs: async (s) => {
            const normalizedSongs = s.map(song => ({ ...song, id: normalizeIdentifier(song.id || song.isrc || '') }));
            await dbService.clearAllSongs();
            await dbService.bulkAdd(normalizedSongs);
            setSongs(normalizedSongs);
            const success = await syncToCloud(normalizedSongs);
            return success;
        },
        bulkAppendSongs: async (newItems) => {
            const existing = await dbService.getAllSongs();
            const existingIds = new Set(existing.map(s => normalizeIdentifier(s.id)));
            const itemsToAdd = newItems.map(item => ({
                ...item,
                id: normalizeIdentifier(item.id || item.isrc || '')
            })).filter(item => !existingIds.has(item.id));
            
            if (itemsToAdd.length === 0) return true;
            
            const updated = [...existing, ...itemsToAdd].sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
            await dbService.bulkAdd(updated);
            setSongs(updated);
            const success = await syncToCloud(updated);
            return success;
        },
        isSyncing, syncProgress, syncSuccess, refreshData: loadData, 
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
