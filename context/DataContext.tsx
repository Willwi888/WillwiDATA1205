
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
    bgmUrl?: string; // 新增背景音樂網址
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

/**
 * Enhanced Robust Audio Link Resolver.
 * Automatically fixes Dropbox and Google Drive sharing links into direct-streamable formats.
 */
export const resolveDirectLink = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();

    // Dropbox Optimization: ?dl=0 -> ?raw=1
    if (cleanUrl.includes('dropbox.com')) {
        let base = cleanUrl.split('?')[0];
        // Ensure standard direct download subdomain
        base = base.replace('//www.dropbox.com', '//dl.dropboxusercontent.com')
                   .replace('//dropbox.com', '//dl.dropboxusercontent.com');
        return `${base}?raw=1`;
    }

    // Google Drive Optimization: /file/d/ID/view -> /uc?id=ID
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
          exclusiveYoutubeUrl: '',
          bgmUrl: 'https://dl.dropboxusercontent.com/scl/fi/7m03jptv9j9a6itfjk8s7/Ambient-Background.mp3?rlkey=your-key&raw=1'
      };
  });

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
            lab_log: s.labLog || '',
            credits: s.credits || ''
        }));

        const response = await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
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

  const uploadSettingsToCloud = useCallback(async (settings: GlobalSettings) => {
    try {
        const payload = { id: 'SYSTEM_CONFIG', creative_note: JSON.stringify(settings) };
        await fetch(`${SUPABASE_URL}/rest/v1/songs`, { 
            method: 'POST', 
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, 
            body: JSON.stringify(payload) 
        });
        localStorage.setItem(SETTINGS_LOCAL_KEY, JSON.stringify(settings));
    } catch (e) {}
  }, []);

  const loadData = useCallback(async () => {
      setIsSyncing(true);
      const localSongs = await dbService.getAllSongs();
      
      try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
          if (res.ok) {
              const remote = await res.json();
              const config = remote.find((r: any) => r.id === 'SYSTEM_CONFIG');
              const songList = remote.filter((r: any) => r.id !== 'SYSTEM_CONFIG');
              
              if (config) { try { setGlobalSettings(JSON.parse(config.creative_note)); } catch(e) {} }
              
              if (songList.length > 0) {
                  const cloudSongs = songList.map((s: any) => ({ 
                      ...s, 
                      coverUrl: s.cover_url, 
                      audioUrl: s.audio_url, 
                      releaseDate: s.release_date,
                      isInteractiveActive: s.is_interactive_active, 
                      creativeNote: s.creative_note,
                      labLog: s.lab_log
                  }));
                  const combined = [...localSongs];
                  cloudSongs.forEach((cs: any) => {
                      const idx = combined.findIndex(ls => ls.id === cs.id);
                      if (idx >= 0) combined[idx] = cs; else combined.push(cs);
                  });
                  const sorted = combined.sort((a,b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
                  setSongs(sorted);
                  await dbService.bulkAdd(sorted);
              } else if (localSongs.length === 0) {
                  setSongs(OFFICIAL_CATALOG);
                  await dbService.bulkAdd(OFFICIAL_CATALOG);
              } else {
                  setSongs(localSongs);
              }
          }
      } catch (e) {
          if (localSongs.length > 0) setSongs(localSongs);
          else setSongs(OFFICIAL_CATALOG);
      } finally { setIsSyncing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <DataContext.Provider value={{ 
        songs, 
        addSong: async (s) => {
            const song = { ...s, id: normalizeIdentifier(s.isrc || s.id), origin: 'local' as const };
            await dbService.addSong(song);
            setSongs(prev => [song, ...prev].sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
            return await uploadSongsToCloud([song]);
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
        },
        getSong: (id) => songs.find(s => s.id === id),
        bulkAddSongs: async (s) => {
            await dbService.clearAllSongs();
            await dbService.bulkAdd(s);
            setSongs(s);
            return await uploadSongsToCloud(s);
        },
        bulkAppendSongs: async (newSongs) => {
            const current = [...songs];
            newSongs.forEach(ns => { if (!current.find(c => c.id === ns.id)) current.push(ns); });
            const sorted = current.sort((a,b)=>new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
            await dbService.bulkAdd(sorted);
            setSongs(sorted);
            return await uploadSongsToCloud(sorted);
        },
        isSyncing, syncSuccess, lastError, refreshData: loadData, 
        uploadSongsToCloud, uploadSettingsToCloud, globalSettings, setGlobalSettings,
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
