
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Song, SongContextType, Language, ProjectType, ReleaseCategory } from '../types';
import { dbService } from '../services/db';
import { OFFICIAL_CATALOG, ASSETS } from './InitialData';

// Re-export ASSETS to maintain compatibility with other components
export { ASSETS };

interface GlobalSettings {
    portraitUrl: string;
    defaultCoverUrl: string;
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
    playSong: (song: Song) => void;
}

const DataContext = createContext<ExtendedSongContextType | undefined>(undefined);

const SUPABASE_URL = "https://rzxqseimxhbokrhcdjbi.supabase.co";
const SUPABASE_KEY = "sb_publishable_z_v9ig8SbqNnKHHTwEgOhw_S3g4yhba";

const SETTINGS_LOCAL_KEY = 'willwi_settings_backup';

export const normalizeIdentifier = (val: string) => (val || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

export const resolveDirectLink = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();
    
    // Dropbox Logic
    if (cleanUrl.includes('dropbox.com')) {
        let base = cleanUrl.split('?')[0];
        // Replace www or just domain to dl.dropboxusercontent.com
        base = base.replace('//www.dropbox.com', '//dl.dropboxusercontent.com')
                   .replace('//dropbox.com', '//dl.dropboxusercontent.com');
        return `${base}?raw=1`;
    }

    // Google Drive Logic (Convert view link to download link)
    // Format: https://drive.google.com/file/d/[ID]/view -> https://drive.google.com/uc?export=download&id=[ID]
    if (cleanUrl.includes('drive.google.com') && cleanUrl.includes('/file/d/')) {
        const idMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
            return `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
        }
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

  // 初始化設置：優先嘗試從本地備份讀取，防止被雲端空值沖掉
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
      const backup = localStorage.getItem(SETTINGS_LOCAL_KEY);
      if (backup) {
          const parsed = JSON.parse(backup);
          // Ensure defaultCoverUrl exists for migration
          if (!parsed.defaultCoverUrl) parsed.defaultCoverUrl = ASSETS.defaultCover;
          return parsed;
      }
      return { 
          portraitUrl: ASSETS.willwiPortrait, 
          defaultCoverUrl: ASSETS.defaultCover,
          qr_global_payment: '', qr_line: '', 
          qr_production: '', qr_cinema: '', qr_support: '', accessCode: '8888',
          exclusiveYoutubeUrl: ''
      };
  });

  // 每當設置改變，立即存入本地備份
  useEffect(() => {
      localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(globalSettings));
  }, [globalSettings]);

  const uploadSongsToCloud = useCallback(async (data?: Song[]) => {
    setIsSyncing(true);
    setSyncProgress(30);
    try {
        const list = data || songs;
        const payload = list.map(s => ({ 
            id: s.id, title: s.title, isrc: s.isrc || '', upc: s.upc || '', 
            cover_url: s.coverUrl, audio_url: s.audioUrl || '', 
            youtube_url: s.youtubeUrl || '', lyrics: s.lyrics || '', 
            language: s.language, project_type: s.projectType, 
            release_date: s.releaseDate, is_interactive_active: !!s.isInteractiveActive,
            creative_note: s.creativeNote || '', lab_log: s.labLog || '' 
        }));
        
        await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
            body: JSON.stringify(payload) 
        });
        setSyncProgress(100);
        return true;
    } catch (e) { return false; } finally { setIsSyncing(false); }
  }, [songs]);

  const uploadSettingsToCloud = useCallback(async (settings: GlobalSettings) => {
    setIsSyncing(true);
    try {
        const payload = { id: 'SYSTEM_CONFIG', description: JSON.stringify(settings) };
        await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
            body: JSON.stringify(payload) 
        });
        // 確保雲端儲存後本地也存一份
        localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
    } catch (e) {} finally { setIsSyncing(false); }
  }, []);

  const loadData = useCallback(async () => {
      setIsSyncing(true);
      // 1. 先從 IndexedDB 載入本地既有歌曲
      const localSongs = await dbService.getAllSongs();
      
      // AUTO SEED: 如果本地是空的，直接載入官方目錄
      if (localSongs.length === 0) {
          console.log("Empty DB detected. Seeding Official Catalog...");
          await dbService.bulkAdd(OFFICIAL_CATALOG);
          setSongs(OFFICIAL_CATALOG.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      } else {
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
              
              // 只有當雲端有配置時才更新設置
              if (config) { 
                  try { 
                      const parsed = JSON.parse(config.description);
                      setGlobalSettings(prev => ({ ...prev, ...parsed })); 
                  } catch(e) {} 
              }
              
              // 智能合併雲端歌曲，不直接刪除本地
              const cloudSongs = songList.map((s: any) => ({ 
                  ...s, 
                  coverUrl: s.cover_url || s.coverUrl || ASSETS.defaultCover, 
                  audioUrl: s.audio_url, youtubeUrl: s.youtube_url,
                  language: s.language, project_type: s.project_type, 
                  releaseDate: s.release_date, isInteractiveActive: s.is_interactive_active,
                  creativeNote: s.creative_note || s.creativeNote,
                  labLog: s.lab_log || s.labLog
              }));

              if (cloudSongs.length > 0) {
                  // 合併邏輯：以 ID 為準，雲端優先，但保留雲端沒有的本地作品 (或 InitialData)
                  // 這裡我們需要重新獲取最新的本地數據 (因為上面可能已經 Seed 了)
                  const currentLocal = await dbService.getAllSongs();
                  const combined = [...currentLocal];
                  
                  cloudSongs.forEach((cs: Song) => {
                      const idx = combined.findIndex(ls => ls.id === cs.id);
                      if (idx >= 0) combined[idx] = cs;
                      else combined.push(cs);
                  });
                  const sorted = combined.sort((a,b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
                  setSongs(sorted);
                  await dbService.bulkAdd(sorted);
              }
          }
      } catch (e) {} finally { setIsSyncing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const playSong = useCallback((song: Song) => {
      setCurrentSong(song);
      setIsPlaying(true);
  }, []);

  return (
    <DataContext.Provider value={{ 
        songs, 
        addSong: async (s) => {
            const song = { ...s, id: normalizeIdentifier(s.isrc || s.id), origin: 'local' as const };
            await dbService.addSong(song);
            setSongs(prev => [song, ...prev].sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
            await uploadSongsToCloud([song]);
            return true;
        },
        updateSong: async (id, s) => {
            const existing = songs.find(x => x.id === id);
            if (existing) {
                const updated = { ...existing, ...s };
                await dbService.updateSong(updated);
                setSongs(prev => prev.map(x => x.id === id ? updated : x));
                await uploadSongsToCloud([updated]);
            }
            return true;
        },
        deleteSong: async (id) => {
            await dbService.deleteSong(id);
            setSongs(prev => prev.filter(x => x.id !== id));
            // 注意：刪除雲端通常需要額外 DELETE 請求，這裡簡化處理
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
        currentSong, setCurrentSong, isPlaying, setIsPlaying, playSong
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
