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

// HARDCODED SYSTEM ASSETS
export const ASSETS = {
    willwiPortrait: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2000",
    casperLogo: "logo.png",
    defaultCover: "https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/4a/53/16/4a531649-1662-8356-6548-aa1d334544d6/198004739563.png/600x600bb.jpg"
};

export const INITIAL_DATA: Song[] = [
  {
    id: 'seed-001',
    title: '再愛一次 (Love Again)',
    versionLabel: 'Original',
    coverUrl: ASSETS.defaultCover,
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music',
    releaseDate: '2023-01-20',
    isEditorPick: true,
    isrc: 'QZNWQ2392729',
    upc: '198004739563',
    spotifyLink: 'https://open.spotify.com/track/5g5X2x1T9bZqQ1v8K3k9J2',
    description: 'A heartfelt ballad exploring the courage to love again after heartbreak. \n關於失戀後重新找回愛自己的勇氣。鋼琴與弦樂的交織，訴說著深夜裡的內心獨白。',
    lyrics: `[VERSE 1]
窗外的雨還在下
心中的鎖還沒打開
這是一段漫長的旅程
通往未知的將來

[CHORUS]
能不能再愛一次
就像從沒受傷過
能不能再愛一次
擁抱那最初的感動`,
    credits: 'Producer: Willwi\nArrangement: Alex\nMixing: Studio A',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  },
  {
    id: 'seed-002',
    title: 'Neon Drift (霓虹漂流)',
    versionLabel: 'Synthwave Mix',
    coverUrl: 'https://images.unsplash.com/photo-1574169208507-84376194878b?q=80&w=1000&auto=format&fit=crop',
    language: Language.English,
    projectType: ProjectType.PaoMien,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Neon Records',
    releaseDate: '2023-06-15',
    isEditorPick: false,
    description: 'A drive through the cyberpunk city at 3 AM. \n充滿未來感的合成器聲響，模擬深夜在霓虹城市漫遊的孤寂與自由。',
    lyrics: `[INTRO]
(Instrumental Build up)

[VERSE]
City lights flashing by
Reflections in your eyes
We are drifting through the night
Everything is gonna be alright

[DROP]
(Synth Solo)
(Rhythm Intensifies)

[OUTRO]
Neon lights...
Fading out...`,
    credits: 'Producer: Willwi\nSynth: Prophet-6',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
  },
  {
    id: 'seed-003',
    title: '沉默 (Silence)',
    versionLabel: 'Acoustic',
    coverUrl: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.EP,
    releaseCompany: 'Willwi Music',
    releaseDate: '2023-11-20',
    isEditorPick: true,
    description: '有時候，不說話才是最大聲的控訴。\n一把吉他，一個聲音，最純粹的表達。',
    lyrics: `[VERSE]
你說的我都懂
只是不想再辯駁
安靜是一種選擇
也是最後的溫柔

[CHORUS]
沉默
是我們之間的默契
不用言語
也能聽見心碎的聲音

[BRIDGE]
就讓時間去證明
誰對誰錯
都不重要了`,
    credits: 'Guitar: John\nVocal: Willwi',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'
  },
  {
    id: 'seed-004',
    title: 'Golden Hour (黃金時刻)',
    versionLabel: 'Demo',
    coverUrl: 'https://images.unsplash.com/photo-1500462918059-b1a0cb512f1d?q=80&w=1000&auto=format&fit=crop',
    language: Language.Instrumental,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music',
    releaseDate: '2024-01-01',
    isEditorPick: false,
    description: '捕捉日落前最美的那一刻光影。',
    lyrics: `[INSTRUMENTAL TRACK]
(No Lyrics)
(Relaxing Beats)
(Ambient Sounds)`,
    credits: 'Producer: Willwi',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'
  }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [dbStatus, setDbStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR'>('CONNECTING');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [storageUsage, setStorageUsage] = useState(0);

  // Source of truth: IndexedDB -> State
  const loadData = useCallback(async () => {
      // Health Check First
      const health = await dbService.checkHealth();
      if (health.status === 'error') {
          console.warn("DB Health Check Failed:", health.message);
          setDbStatus('ERROR');
          // Fallback to static seeds only, or potentially localstorage if critical
          setSongs(INITIAL_DATA);
          setIsReady(true);
          return;
      }

      try {
        setDbStatus('ONLINE');
        let loadedSongs = await dbService.getAllSongs();
        
        // 1. Migration from localstorage if DB is empty
        if (loadedSongs.length === 0) {
            const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (localData) {
                loadedSongs = JSON.parse(localData);
                await dbService.bulkAdd(loadedSongs);
            }
        }

        // 2. Seed Injection Logic
        const currentIds = new Set(loadedSongs.map(s => s.id));
        let hasNewSeeds = false;
        for (const seed of INITIAL_DATA) {
            if (!currentIds.has(seed.id)) {
                await dbService.addSong(seed);
                loadedSongs.push(seed);
                hasNewSeeds = true;
            }
        }

        // 3. Sort by Release Date (Newest First)
        loadedSongs.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

        setSongs(loadedSongs);
        setLastSyncTime(new Date());
        setIsReady(true);

        // Update Storage Estimate
        dbService.getStorageEstimate().then(est => {
            if (est) setStorageUsage(est.usage);
        });

      } catch (error) {
        console.error("DB Load Error", error);
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
      if (dbStatus === 'ERROR') {
          setSongs(prev => [song, ...prev]); // Memory only
          return true;
      }
      await dbService.addSong(song);
      setSongs(prev => [song, ...prev]);
      setLastSyncTime(new Date());
      return true;
    } catch (error) { return false; }
  };

  const bulkAddSongs = async (newSongs: Song[]) => {
    try {
        if (dbStatus === 'ERROR') {
            setSongs(newSongs); // Memory only
            return true;
        }
        await dbService.bulkAdd(newSongs);
        // Combine and re-sort
        setSongs(prev => {
            // Merge logic: newSongs overwrite prev if IDs match, otherwise append
            const map = new Map<string, Song>(prev.map(s => [s.id, s]));
            newSongs.forEach(s => map.set(s.id, s));
            const updated = Array.from(map.values());
            return updated.sort((a: Song, b: Song) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
        });
        setLastSyncTime(new Date());
        return true;
    } catch (e) {
        console.error("Bulk Add Error", e);
        return false;
    }
  };

  const updateSong = async (id: string, updatedSong: Partial<Song>) => {
    try {
      const existing = songs.find(s => s.id === id);
      if (!existing) return false;
      const newSong = { ...existing, ...updatedSong };
      
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