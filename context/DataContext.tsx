
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Song, Language, ProjectType, ReleaseCategory, SongContextType } from '../types';
import { dbService } from '../services/db';

interface ExtendedSongContextType extends SongContextType {
    dbStatus: 'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR';
    lastSyncTime: Date | null;
    storageUsage: number;
}

const DataContext = createContext<ExtendedSongContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'willwi_music_db_v3';

// 品牌色彩：#020617 (深藍), #fbbf24 (金)
export const ASSETS = {
    willwiPortrait: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000",
    defaultCover: (title: string) => `https://placehold.co/1000x1000/020617/fbbf24?text=${encodeURIComponent(title || 'Willwi')}+STUDIO`
};

export const INITIAL_DATA: Song[] = [
  {
    id: 'seed-001',
    title: '再愛一次 (Love Again)',
    versionLabel: 'Original',
    coverUrl: 'https://placehold.co/1000x1000/0f172a/fbbf24?text=Love+Again',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music',
    releaseDate: '2023-01-20',
    isEditorPick: true,
    isInteractiveActive: true,
    isOfficialExclusive: false,
    isrc: 'QZNWQ2392729',
    upc: '198004739563',
    spotifyId: '5g5X2x1T9bZqQ1v8K3k9J2',
    spotifyLink: 'https://open.spotify.com/track/5g5X2x1T9bZqQ1v8K3k9J2',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'A heartfelt ballad exploring the courage to love again after heartbreak. \n關於失戀後重新找回愛自己的勇氣。鋼琴與弦樂的交織，訴說著深夜裡的內心獨白。',
    lyrics: `[VERSE 1]\n窗外的雨還在下\n心中的鎖還沒打開\n這是一段漫長的旅程\n通往未知的將來\n\n[CHORUS]\n能不能再愛一次\n就像從沒受傷過\n能不能再愛一次\n擁抱那最初的感動`,
    credits: 'Producer: Willwi\nArrangement: Alex\nMixing: Studio A',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [dbStatus, setDbStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR'>('CONNECTING');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [storageUsage, setStorageUsage] = useState(0);

  const loadData = useCallback(async () => {
      const health = await dbService.checkHealth();
      if (health.status === 'error') {
          setDbStatus('ERROR');
          setSongs(INITIAL_DATA);
          setIsReady(true);
          return;
      }

      try {
        setDbStatus('ONLINE');
        let loadedSongs = await dbService.getAllSongs();
        
        if (loadedSongs.length === 0) {
            const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (localData) {
                loadedSongs = JSON.parse(localData);
                await dbService.bulkAdd(loadedSongs);
            }
        }

        const currentIds = new Set(loadedSongs.map(s => s.id));
        for (const seed of INITIAL_DATA) {
            if (!currentIds.has(seed.id)) {
                await dbService.addSong(seed);
                loadedSongs.push(seed);
            }
        }

        // 封面圖片防呆處理：如果沒有 coverUrl，自動補上品牌預設圖
        const processedSongs = loadedSongs.map(s => ({
            ...s,
            coverUrl: s.coverUrl || ASSETS.defaultCover(s.title)
        }));

        processedSongs.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        setSongs(processedSongs);
        setLastSyncTime(new Date());
        setIsReady(true);

        dbService.getStorageEstimate().then(est => {
            if (est) setStorageUsage(est.usage);
        });

      } catch (error) {
        setDbStatus('ERROR');
        setSongs(INITIAL_DATA);
        setIsReady(true);
      }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addSong = async (song: Song) => {
    const songWithCover = { ...song, coverUrl: song.coverUrl || ASSETS.defaultCover(song.title) };
    try {
      if (dbStatus === 'ERROR') {
          setSongs(prev => [songWithCover, ...prev]);
          return true;
      }
      await dbService.addSong(songWithCover);
      setSongs(prev => [songWithCover, ...prev]);
      setLastSyncTime(new Date());
      return true;
    } catch (error) { return false; }
  };

  const bulkAddSongs = async (newSongs: Song[]) => {
    const processed = newSongs.map(s => ({ ...s, coverUrl: s.coverUrl || ASSETS.defaultCover(s.title) }));
    try {
        if (dbStatus === 'ERROR') {
            setSongs(processed);
            return true;
        }
        await dbService.bulkAdd(processed);
        setSongs(prev => {
            const map = new Map<string, Song>(prev.map(s => [s.id, s]));
            processed.forEach(s => map.set(s.id, s));
            const updated = Array.from(map.values());
            return updated.sort((a: Song, b: Song) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        });
        setLastSyncTime(new Date());
        return true;
    } catch (e) { return false; }
  };

  const updateSong = async (id: string, updatedSong: Partial<Song>) => {
    try {
      const existing = songs.find(s => s.id === id);
      if (!existing) return false;
      const newSong = { ...existing, ...updatedSong };
      if (!newSong.coverUrl) newSong.coverUrl = ASSETS.defaultCover(newSong.title);
      
      if (dbStatus !== 'ERROR') {
          await dbService.updateSong(newSong);
          setLastSyncTime(new Date());
      }
      setSongs(prev => prev.map(s => s.id === id ? newSong : s));
      return true;
    } catch (error) { return false; }
  };

  const deleteSong = async (id: string) => {
    try {
      if (dbStatus !== 'ERROR') {
          await dbService.deleteSong(id);
          setLastSyncTime(new Date());
      }
      setSongs(prev => prev.filter(s => s.id !== id));
    } catch (error) {}
  };

  const getSong = (id: string) => songs.find(s => s.id === id);

  return (
    <DataContext.Provider value={{ songs, addSong, updateSong, deleteSong, getSong, bulkAddSongs, dbStatus, lastSyncTime, storageUsage }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData error');
  return context;
};
