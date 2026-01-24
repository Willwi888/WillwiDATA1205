
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
    lastAction?: {
        type: string;
        timestamp: string;
        target?: string;
    };
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
    
    if (cleanUrl.includes('drive.google.com')) {
        const idMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || cleanUrl.match(/id=([a-zA-Z0-9_-]{25,})/);
        const id = idMatch ? idMatch[1] : null;
        if (id) return `https://docs.google.com/uc?export=download&id=${id}`;
    }

    if (cleanUrl.includes('dropbox.com')) {
        let directUrl = cleanUrl
            .replace('www.dropbox.com', 'dl.dropboxusercontent.com')
            .replace('dropbox.com', 'dl.dropboxusercontent.com');
        
        try {
            const urlObj = new URL(directUrl);
            urlObj.searchParams.delete('dl');
            urlObj.searchParams.set('raw', '1');
            return urlObj.toString();
        } catch (e) {
            if (directUrl.includes('dl=0')) return directUrl.replace('dl=0', 'raw=1');
            if (!directUrl.includes('?')) return directUrl + '?raw=1';
            if (!directUrl.includes('raw=1')) return directUrl + '&raw=1';
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
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({ 
      portraitUrl: ASSETS.willwiPortrait, 
      qr_global_payment: '', 
      qr_line: '', 
      qr_production: '', 
      qr_cinema: '', 
      qr_support: '', 
      accessCode: '8888',
      lastAction: { type: 'INITIALIZED', timestamp: new Date().toISOString() }
  });

  const uploadSongsToCloud = useCallback(async (currentSongs?: Song[]) => {
    setIsSyncing(true);
    try {
        const listToUpload = currentSongs || await dbService.getAllSongs();
        const payload = listToUpload.map(s => ({ 
            id: s.id, 
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
            is_interactive_active: s.isInteractiveActive 
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

        if (res.ok) { 
            setCloudCount(payload.length); 
            setDbStatus('ONLINE'); 
            setLastSyncTime(new Date());
            return { success: true, count: payload.length }; 
        }
        return { success: false, count: 0, error: await res.text() };
    } catch (e: any) { 
        return { success: false, count: 0, error: e.message }; 
    } finally { 
        setIsSyncing(false); 
    }
  }, []);

  const uploadSettingsToCloud = useCallback(async (settings: GlobalSettings) => {
    setIsSyncing(true);
    try {
        const payload = { id: 'SYSTEM_CONFIG', description: JSON.stringify(settings) };
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
        if (res.ok) { 
            setDbStatus('ONLINE'); 
            return true; 
        }
        return false;
    } catch (e) { 
        return false; 
    } finally { 
        setIsSyncing(false); 
    }
  }, []);

  const deleteSongFromCloud = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }, []);

  const updateLastAction = useCallback((type: string, target?: string) => {
      const newSettings = {
          ...globalSettings,
          lastAction: {
              type,
              timestamp: new Date().toISOString(),
              target
          }
      };
      setGlobalSettings(newSettings);
      uploadSettingsToCloud(newSettings);
  }, [globalSettings, uploadSettingsToCloud]);

  const loadCloudData = useCallback(async () => {
      setDbStatus('CONNECTING');
      setIsSyncing(true);
      try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*`, { 
              headers: { 
                  'apikey': SUPABASE_KEY, 
                  'Authorization': `Bearer ${SUPABASE_KEY}` 
              } 
          });
          if (res.ok) {
              const remoteData = await res.json();
              if (Array.isArray(remoteData)) {
                  const configRecord = remoteData.find(r => r.id === 'SYSTEM_CONFIG');
                  const songData = remoteData.filter(r => r.id !== 'SYSTEM_CONFIG');
                  
                  if (configRecord && configRecord.description) {
                      try { setGlobalSettings(prev => ({ ...prev, ...JSON.parse(configRecord.description) })); } catch(e) {}
                  }
                  
                  const rawSongs = songData.map(s => ({ 
                      ...s, 
                      id: s.id || s.isrc, 
                      title: s.title || 'Unknown', 
                      coverUrl: s.cover_url || ASSETS.official1205Cover, 
                      audioUrl: s.audio_url || '', 
                      dropboxUrl: s.dropbox_url || '', 
                      language: (s.language as Language) || Language.Mandarin, 
                      projectType: (s.project_type as ProjectType) || ProjectType.PaoMien, 
                      releaseDate: s.release_date || '2024-12-05', 
                      isInteractiveActive: s.is_interactive_active ?? true, 
                      origin: 'cloud' 
                  }));
                  
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
      } catch (e) { 
          setDbStatus('ERROR'); 
      } finally { 
          setIsSyncing(false); 
      }
  }, []);

  const addSong = async (s: Song) => {
      const key = normalizeIdentifier(s.isrc || s.id);
      const cleanSong = { ...s, id: key, isrc: normalizeIdentifier(s.isrc), origin: 'local' as const };
      await dbService.addSong(cleanSong);
      
      const allLocal = await dbService.getAllSongs();
      const deduped = deduplicateSongs(allLocal);
      const sorted = deduped.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      
      setSongs(sorted);
      setLocalCount(deduped.length);
      setDbStatus('DIRTY');
      
      // 自動背景同步
      await uploadSongsToCloud(sorted);
      updateLastAction('ADD_ENTRY', s.title);
      return true;
  };

  const updateSong = async (id: string, s: Partial<Song>) => {
      const existing = songs.find(x => x.id === id);
      if (existing) {
          const updated = { ...existing, ...s };
          await dbService.updateSong(updated);
          
          const all = await dbService.getAllSongs();
          const deduped = deduplicateSongs(all);
          const sorted = deduped.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
          
          setSongs(sorted);
          setDbStatus('DIRTY');
          
          await uploadSongsToCloud(sorted);
          updateLastAction('UPDATE_ENTRY', existing.title);
      }
      return true;
  };

  const deleteSong = async (id: string) => {
      const target = songs.find(s => s.id === id);
      await dbService.deleteSong(id);
      await deleteSongFromCloud(id);
      
      const all = await dbService.getAllSongs();
      const deduped = deduplicateSongs(all);
      const sorted = deduped.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      
      setSongs(sorted);
      setLocalCount(all.length);
      setDbStatus('ONLINE');
      
      updateLastAction('DELETE_ENTRY', target?.title || id);
  };

  const bulkAddSongs = async (s: Song[]) => {
      const deduped = deduplicateSongs(s);
      await dbService.clearAllSongs();
      await dbService.bulkAdd(deduped);
      const sorted = deduped.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      setSongs(sorted);
      setLocalCount(deduped.length);
      setDbStatus('DIRTY');
      
      await uploadSongsToCloud(sorted);
      updateLastAction('BULK_IMPORT', `${s.length} tracks`);
      return true;
  };

  useEffect(() => { loadCloudData(); }, [loadCloudData]);

  return (
    <DataContext.Provider value={{ 
        songs, addSong, updateSong, deleteSong,
        getSong: (id) => songs.find(s => s.id === id),
        bulkAddSongs,
        dbStatus, lastSyncTime, isSyncing, refreshData: loadCloudData, 
        uploadSongsToCloud, uploadSettingsToCloud, seedOfficial1205Data: async () => {}, 
        globalSettings, setGlobalSettings, cloudCount, localCount, 
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
