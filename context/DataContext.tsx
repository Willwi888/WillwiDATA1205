
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
}

interface ExtendedSongContextType extends SongContextType {
    dbStatus: 'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DIRTY';
    lastSyncTime: Date | null;
    isSyncing: boolean;
    refreshData: () => Promise<void>;
    uploadSongsToCloud: () => Promise<{ success: boolean; count: number; error?: string }>;
    uploadSettingsToCloud: (settings: GlobalSettings) => Promise<boolean>;
    seedOfficial1205Data: () => Promise<void>;
    globalSettings: GlobalSettings;
    setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
    cloudCount: number;
    localCount: number;
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
    defaultCover: "https://placehold.co/1000x1000/020617/fbbf24?text=Willwi+1205",
    official1205Folder: "https://drive.google.com/drive/folders/1PmP_GB7etr45T_DwcZcLt45Om2RDqTNI?usp=sharing"
};

export const normalizeIdentifier = (val: string) => (val || '').trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();

export const resolveDirectLink = (url: string) => {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();
    
    // Google Drive
    if (cleanUrl.includes('drive.google.com')) {
        const idMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || cleanUrl.match(/id=([a-zA-Z0-9_-]{25,})/);
        const id = idMatch ? idMatch[1] : null;
        if (id) return `https://docs.google.com/uc?export=download&id=${id}`;
    }

    // Dropbox 強制串流邏輯：將 dl=0 改為 dl=1，確保音軌可播
    if (cleanUrl.includes('dropbox.com')) {
        let directUrl = cleanUrl.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('dropbox.com', 'dl.dropboxusercontent.com');
        try {
            const urlObj = new URL(directUrl);
            // 處理 dl=0 的情況
            if (urlObj.searchParams.get('dl') === '0') {
                urlObj.searchParams.set('dl', '1');
            }
            // 補充 raw=1 以確保部分瀏覽器解析
            urlObj.searchParams.set('raw', '1');
            return urlObj.toString();
        } catch (e) {
            // 後備字串替換
            if (directUrl.includes('dl=0')) return directUrl.replace('dl=0', 'dl=1');
            return directUrl;
        }
    }
    
    return cleanUrl;
};

const deduplicateSongs = (songs: any[]): Song[] => {
    const uniqueMap = new Map<string, Song>();
    songs.forEach(s => {
        const isrc = normalizeIdentifier(s.isrc);
        const key = isrc || normalizeIdentifier(s.id);
        if (!key) return;
        const existing = uniqueMap.get(key);
        uniqueMap.set(key, { ...(existing || {}), ...s, id: key, isrc: isrc || (existing?.isrc || ''), origin: s.origin || 'cloud' } as Song);
    });
    return Array.from(uniqueMap.values());
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [dbStatus, setDbStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR' | 'DIRTY'>('OFFLINE');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudCount, setCloudCount] = useState(0);
  const [localCount, setLocalCount] = useState(0);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ portraitUrl: ASSETS.willwiPortrait, qr_global_payment: '', qr_line: '', qr_production: '', qr_cinema: '', qr_support: '', accessCode: '8888' });

  const loadCloudData = useCallback(async () => {
      setDbStatus('CONNECTING');
      setIsSyncing(true);
      try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*`, { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } });
          if (res.ok) {
              const remoteData = await res.json();
              if (Array.isArray(remoteData)) {
                  const configRecord = remoteData.find(r => r.id === 'SYSTEM_CONFIG');
                  const songData = remoteData.filter(r => r.id !== 'SYSTEM_CONFIG');
                  if (configRecord && configRecord.description) {
                      try { setGlobalSettings(prev => ({ ...prev, ...JSON.parse(configRecord.description) })); } catch(e) {}
                  }
                  const rawSongs = songData.map(s => ({ ...s, id: s.id || s.isrc, title: s.title || 'Unknown', coverUrl: s.cover_url || ASSETS.official1205Cover, audioUrl: s.audio_url || '', dropboxUrl: s.dropbox_url || '', language: (s.language as Language) || Language.Mandarin, projectType: (s.project_type as ProjectType) || ProjectType.PaoMien, releaseDate: s.release_date || '2024-12-05', isInteractiveActive: s.is_interactive_active ?? true, origin: 'cloud' }));
                  const finalSongs = deduplicateSongs(rawSongs);
                  await dbService.clearAllSongs();
                  await dbService.bulkAdd(finalSongs);
                  setCloudCount(finalSongs.length);
                  setLocalCount(finalSongs.length);
                  setSongs(finalSongs.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
                  setDbStatus('ONLINE');
                  setLastSyncTime(new Date());
              }
          }
      } catch (e) { setDbStatus('ERROR'); } finally { setIsSyncing(false); }
  }, []);

  const addSong = async (s: Song) => {
      const key = normalizeIdentifier(s.isrc || s.id);
      const cleanSong = { ...s, id: key, isrc: normalizeIdentifier(s.isrc), origin: 'local' as const };
      await dbService.addSong(cleanSong);
      const allLocal = await dbService.getAllSongs();
      const deduped = deduplicateSongs(allLocal);
      setSongs(deduped.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      setLocalCount(deduped.length);
      setDbStatus('DIRTY');
      return true;
  };

  const uploadSongsToCloud = async () => {
    setIsSyncing(true);
    try {
        const localSongs = await dbService.getAllSongs();
        const payload = localSongs.map(s => ({ id: s.id, title: s.title, isrc: s.isrc || '', upc: s.upc || '', cover_url: s.coverUrl, audio_url: s.audioUrl || '', dropbox_url: s.dropboxUrl || '', lyrics: s.lyrics || '', description: s.description || '', language: s.language, project_type: s.projectType, release_date: s.releaseDate, is_interactive_active: s.isInteractiveActive }));
        const res = await fetch(`${SUPABASE_URL}/rest/v1/songs`, { method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify(payload) });
        if (res.ok) { setCloudCount(payload.length); setDbStatus('ONLINE'); return { success: true, count: payload.length }; }
        return { success: false, count: 0, error: await res.text() };
    } catch (e: any) { return { success: false, count: 0, error: e.message }; } finally { setIsSyncing(false); }
  };

  const uploadSettingsToCloud = async (settings: GlobalSettings) => {
    setIsSyncing(true);
    try {
        const payload = { id: 'SYSTEM_CONFIG', description: JSON.stringify(settings) };
        const res = await fetch(`${SUPABASE_URL}/rest/v1/songs`, { method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }, body: JSON.stringify(payload) });
        if (res.ok) { setDbStatus('ONLINE'); return true; }
        return false;
    } catch (e) { return false; } finally { setIsSyncing(false); }
  };

  useEffect(() => { loadCloudData(); }, [loadCloudData]);

  return (
    <DataContext.Provider value={{ 
        songs, addSong, updateSong: async (id, s) => { 
            const existing = songs.find(x => x.id === id);
            if (existing) {
                const updated = { ...existing, ...s };
                await dbService.updateSong(updated);
                const all = await dbService.getAllSongs();
                setSongs(deduplicateSongs(all).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
                setDbStatus('DIRTY');
            }
            return true; 
        },
        deleteSong: async (id) => { await dbService.deleteSong(id); const all = await dbService.getAllSongs(); setSongs(deduplicateSongs(all).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())); setLocalCount(all.length); setDbStatus('DIRTY'); },
        getSong: (id) => songs.find(s => s.id === id),
        bulkAddSongs: async (s) => { const deduped = deduplicateSongs(s); await dbService.clearAllSongs(); await dbService.bulkAdd(deduped); setSongs(deduped.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())); setLocalCount(deduped.length); setDbStatus('DIRTY'); return true; },
        dbStatus, lastSyncTime, isSyncing, refreshData: loadCloudData, uploadSongsToCloud, uploadSettingsToCloud, seedOfficial1205Data: async () => {}, globalSettings, setGlobalSettings, cloudCount, localCount, currentSong, setCurrentSong, isPlaying, setIsPlaying
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
