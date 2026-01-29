
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Song, SongContextType, Language, ProjectType, ReleaseCategory } from '../types';
import { dbService } from '../services/db';
import { OFFICIAL_CATALOG, ASSETS } from './InitialData';

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
    lastError: string | null;
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
    if (cleanUrl.includes('dropbox.com')) {
        let base = cleanUrl.split('?')[0];
        base = base.replace('//www.dropbox.com', '//dl.dropboxusercontent.com')
                   .replace('//dropbox.com', '//dl.dropboxusercontent.com');
        return `${base}?raw=1`;
    }
    if (cleanUrl.includes('drive.google.com')) {
        const fileIdMatch = cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
            return `https://docs.google.com/uc?export=download&id=${fileIdMatch[1]}`;
        }
    }
    return cleanUrl;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
      const backup = localStorage.getItem(SETTINGS_LOCAL_KEY);
      if (backup) return JSON.parse(backup);
      return { 
          portraitUrl: ASSETS.willwiPortrait, 
          defaultCoverUrl: ASSETS.defaultCover,
          qr_global_payment: '', qr_line: '', 
          qr_production: '', qr_cinema: '', qr_support: '', accessCode: '8888',
          exclusiveYoutubeUrl: ''
      };
  });

  // 強制同步至雲端
  const uploadSongsToCloud = useCallback(async (data?: Song[]) => {
    setIsSyncing(true);
    try {
        const list = data || songs;
        const payload = list.map(s => ({ 
            id: s.id, 
            title: s.title, 
            isrc: s.isrc || '', 
            upc: s.upc || '', 
            cover_url: s.coverUrl, 
            audio_url: s.audioUrl || '', 
            lyrics: s.lyrics || '', 
            language: s.language, 
            release_date: s.releaseDate, 
            is_interactive_active: !!s.isInteractiveActive, 
            creative_note: s.creativeNote || '',
            credits: s.credits || '',
            release_company: s.releaseCompany || 'Willwi Music'
        }));

        const response = await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 
                'apikey': SUPABASE_KEY, 
                'Authorization': `Bearer ${SUPABASE_KEY}`, 
                'Content-Type': 'application/json', 
                'Prefer': 'resolution=merge-duplicates' 
            }, 
            body: JSON.stringify(payload) 
        });

        if (!response.ok) throw new Error("Cloud Sync Failed");
        setSyncSuccess(true);
        return true;
    } catch (e: any) {
        setLastError(e.message);
        setSyncSuccess(false);
        return false;
    } finally { setIsSyncing(false); }
  }, [songs]);

  const loadData = useCallback(async () => {
      setIsSyncing(true);
      try {
          // 每次加載都強制從雲端抓取，確保跨裝置即時性
          const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*&order=release_date.desc`, { 
              headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
              cache: 'no-store' 
          });
          
          if (res.ok) {
              const remote = await res.json();
              const cloudSongs = remote.filter((r: any) => r.id !== 'SYSTEM_CONFIG').map((s: any) => ({ 
                  ...s, 
                  coverUrl: s.cover_url, 
                  audioUrl: s.audio_url, 
                  releaseDate: s.release_date,
                  isInteractiveActive: s.is_interactive_active, 
                  creativeNote: s.creative_note,
                  releaseCompany: s.release_company
              }));
              
              if (cloudSongs.length > 0) {
                  setSongs(cloudSongs);
                  await dbService.bulkAdd(cloudSongs); // 更新本地緩存
              } else {
                  setSongs(OFFICIAL_CATALOG);
                  await uploadSongsToCloud(OFFICIAL_CATALOG);
              }
          }
      } catch (e) {
          const localSongs = await dbService.getAllSongs();
          if (localSongs.length > 0) setSongs(localSongs);
      } finally { setIsSyncing(false); }
  }, [uploadSongsToCloud]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <DataContext.Provider value={{ 
        songs, 
        addSong: async (s) => {
            const song = { ...s, id: normalizeIdentifier(s.isrc || s.id) };
            const newList = [song, ...songs];
            setSongs(newList);
            return await uploadSongsToCloud(newList);
        },
        updateSong: async (id, s) => {
            const updatedList = songs.map(x => x.id === id ? { ...x, ...s } : x);
            setSongs(updatedList);
            return await uploadSongsToCloud(updatedList);
        },
        deleteSong: async (id) => {
            const newList = songs.filter(x => x.id !== id);
            setSongs(newList);
            // 雲端刪除需要專門的 DELETE 請求，此處採覆蓋同步
            await uploadSongsToCloud(newList);
        },
        getSong: (id) => songs.find(s => s.id === id),
        bulkAddSongs: async (s) => {
            setSongs(s);
            return await uploadSongsToCloud(s);
        },
        bulkAppendSongs: async (newSongs) => {
            const current = [...songs];
            newSongs.forEach(ns => { if (!current.find(c => c.id === ns.id)) current.push(ns); });
            setSongs(current);
            return await uploadSongsToCloud(current);
        },
        isSyncing, syncSuccess, lastError, refreshData: loadData, 
        uploadSongsToCloud, uploadSettingsToCloud: async (st) => { localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(st)); },
        globalSettings, setGlobalSettings,
        currentSong, setCurrentSong, isPlaying, setIsPlaying, playSong: (s) => { setCurrentSong(s); setIsPlaying(true); }
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
