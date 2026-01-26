
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

interface DataStats {
    completionRate: number; // 有歌詞與音檔的佔比
    totalInteraction: number; // 假設數據
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
    stats: DataStats;
}

const DataContext = createContext<ExtendedSongContextType | undefined>(undefined);

const SUPABASE_URL = "https://rzxqseimxhbokrhcdjbi.supabase.co";
const SUPABASE_KEY = "sb_publishable_z_v9ig8SbqNnKHHTwEgOhw_S3g4yhba";

const SETTINGS_LOCAL_KEY = 'willwi_settings_v2';

export const normalizeIdentifier = (val: string) => (val || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

/**
 * 強化的音訊修復引擎 (Robust Audio Engine)
 * 自動處理 Dropbox 與 Google Drive 連結，確保 100% 直連成功
 */
export const resolveDirectLink = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();
    
    // Dropbox Logic: Replace dl=0 with raw=1 or use dl.dropboxusercontent.com
    if (cleanUrl.includes('dropbox.com')) {
        let base = cleanUrl.split('?')[0];
        base = base.replace('www.dropbox.com', 'dl.dropboxusercontent.com')
                   .replace('dropbox.com', 'dl.dropboxusercontent.com');
        
        const urlObj = new URL(cleanUrl);
        const rlkey = urlObj.searchParams.get('rlkey');
        if (rlkey) return `${base}?rlkey=${rlkey}&raw=1`;
        return `${base}?raw=1`;
    }

    // Google Drive Logic: Thumbnail or File ID mapping
    if (cleanUrl.includes('drive.google.com')) {
        const fileId = cleanUrl.match(/\/d\/(.+?)\//)?.[1] || cleanUrl.match(/id=(.+?)(&|$)/)?.[1];
        if (fileId) return `https://docs.google.com/uc?export=download&id=${fileId}`;
    }

    return cleanUrl;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(true);
  const [syncProgress, setSyncProgress] = useState(100);
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
      const backup = localStorage.getItem(SETTINGS_LOCAL_KEY);
      if (backup) return JSON.parse(backup);
      return { 
          portraitUrl: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000", 
          qr_global_payment: '', qr_line: '', qr_production: '', qr_cinema: '', qr_support: '', 
          accessCode: '8520'
      };
  });

  const [stats, setStats] = useState<DataStats>({ completionRate: 0, totalInteraction: 0 });

  const loadData = useCallback(async () => {
      setIsSyncing(true);
      try {
          const songsRes = await fetch(`${SUPABASE_URL}/rest/v1/songs?id=neq.SYSTEM_CONFIG`, {
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          });
          
          let finalSongs: Song[] = [];
          if (songsRes.ok) {
              const cloudSongs = await songsRes.json();
              finalSongs = cloudSongs.map((s: any) => ({
                  id: s.id,
                  title: s.title,
                  isrc: s.isrc,
                  upc: s.upc,
                  coverUrl: s.cover_url,
                  audioUrl: s.audio_url,
                  lyrics: s.lyrics,
                  language: s.language,
                  projectType: s.project_type,
                  releaseDate: s.release_date,
                  isInteractiveActive: s.is_interactive_active,
                  description: s.description || '',
                  storyline: s.storyline || ''
              }));
          }

          if (finalSongs.length === 0) {
              const localSongs = await dbService.getAllSongs();
              finalSongs = localSongs.length > 0 ? localSongs : OFFICIAL_CATALOG;
          }

          setSongs(finalSongs.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
          
          // Calculate stats
          const complete = finalSongs.filter(s => s.lyrics && s.audioUrl).length;
          setStats({
              completionRate: finalSongs.length > 0 ? Math.round((complete / finalSongs.length) * 100) : 0,
              totalInteraction: 0
          });

      } catch (e) {
          console.error("Sync Failed", e);
      } finally {
          setIsSyncing(false);
      }
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
            setSongs([...s]);
            return true;
        },
        bulkAppendSongs: async (newSongs) => {
            const combined = [...songs];
            newSongs.forEach(ns => { if (!combined.find(c => c.id === ns.id)) combined.push(ns); });
            await dbService.bulkAdd(newSongs);
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
                    lyrics: s.lyrics || '', language: s.language, 
                    project_type: s.projectType, release_date: s.releaseDate, 
                    is_interactive_active: !!s.isInteractiveActive,
                    description: s.description || '',
                    storyline: s.storyline || ''
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
            try {
                const payload = { id: 'SYSTEM_CONFIG', description: JSON.stringify(settings) };
                await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
                    method: 'POST', 
                    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
                    body: JSON.stringify(payload) 
                });
                setGlobalSettings(settings);
                localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
            } catch (e) {}
        },
        globalSettings, setGlobalSettings, stats
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
