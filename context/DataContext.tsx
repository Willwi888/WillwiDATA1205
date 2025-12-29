
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

export const ASSETS = {
    willwiPortrait: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000",
    casperLogo: "logo.png",
    defaultCover: "https://placehold.co/1000x1000/1e293b/fbbf24?text=Willwi+Music"
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
    isrc: 'QZNWQ2392729',
    upc: '198004739563',
    spotifyId: '5g5X2x1T9bZqQ1v8K3k9J2',
    spotifyLink: 'https://open.spotify.com/track/5g5X2x1T9bZqQ1v8K3k9J2',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'A heartfelt ballad exploring the courage to love again after heartbreak. \n關於失戀後重新找回愛自己的勇氣。',
    lyrics: `[VERSE 1]\n窗外的雨還在下\n心中的鎖還沒打開\n這是一段漫長的旅程\n通往未知的將來\n\n[CHORUS]\n能不能再愛一次\n就像從沒受傷過\n能不能再愛一次\n擁抱那最初的感動`,
    credits: 'Producer: Willwi\nArrangement: Alex\nMixing: Studio A',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 'seed-002',
    title: 'Neon Drift (霓虹漂流)',
    versionLabel: 'Synthwave Mix',
    coverUrl: 'https://placehold.co/1000x1000/2c0b0e/38bdf8?text=Neon+Drift',
    language: Language.English,
    projectType: ProjectType.PaoMien,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Neon Records',
    releaseDate: '2023-06-15',
    isEditorPick: false,
    isInteractiveActive: true,
    description: 'A drive through the cyberpunk city at 3 AM.',
    lyrics: `[VERSE]\nCity lights flashing by\nReflections in your eyes\nWe are drifting through the night\nEverything is gonna be alright`,
    credits: 'Producer: Willwi\nSynth: Prophet-6',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
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
        console.warn("DB Offline or Blocked:", health.message);
        setDbStatus('OFFLINE');
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
          } else {
              // Initial seed for public view
              await dbService.bulkAdd(INITIAL_DATA);
              loadedSongs = [...INITIAL_DATA];
          }
      }

      loadedSongs.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      setSongs(loadedSongs);
      setLastSyncTime(new Date());
      setIsReady(true);

      dbService.getStorageEstimate().then(est => {
          if (est?.usage) setStorageUsage(est.usage);
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
    try {
      await dbService.addSong(song);
      setSongs(prev => [song, ...prev].sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      setLastSyncTime(new Date());
      return true;
    } catch (error) { return false; }
  };

  const bulkAddSongs = async (newSongs: Song[]) => {
    try {
        await dbService.bulkAdd(newSongs);
        setSongs(newSongs.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
        setLastSyncTime(new Date());
        return true;
    } catch (e) { return false; }
  };

  const updateSong = async (id: string, updatedSong: Partial<Song>) => {
    try {
      const existing = songs.find(s => s.id === id);
      if (!existing) return false;
      const newSong = { ...existing, ...updatedSong };
      await dbService.updateSong(newSong);
      setSongs(prev => prev.map(s => s.id === id ? newSong : s));
      setLastSyncTime(new Date());
      return true;
    } catch (error) { return false; }
  };

  const deleteSong = async (id: string) => {
    try {
      await dbService.deleteSong(id);
      setSongs(prev => prev.filter(s => s.id !== id));
      setLastSyncTime(new Date());
    } catch (error) {}
  };

  const getSong = (id: string) => songs.find(s => s.id === id);

  return (
    <DataContext.Provider value={{ songs, addSong, updateSong, deleteSong, getSong, bulkAddSongs, dbStatus, lastSyncTime, storageUsage }}>
      {isReady ? children : <div className="min-h-screen bg-black flex items-center justify-center"><div className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin"></div></div>}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData error');
  return context;
};
