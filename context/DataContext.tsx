import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Song, Language, ProjectType, SongContextType } from '../types';
import { dbService } from '../services/db';

const DataContext = createContext<SongContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'willwi_music_db_v1';

// Initial sample data if DB is completely empty and no local storage found
const INITIAL_DATA: Song[] = [
  {
    id: '1',
    title: '再愛一次',
    versionLabel: 'Original',
    coverUrl: 'https://picsum.photos/id/26/400/400',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseDate: '2023-10-15',
    isEditorPick: true,
    isrc: 'TW-A01-23-00001',
    spotifyId: '4uLU6hMCjMI75M1A2tKZBC', 
    lyrics: "走在 熟悉的街角\n回憶 像是海浪拍打\n每一個呼吸\n都是你的氣息\n再愛一次\n能不能\n再愛一次",
    description: "一首關於失去與重逢的抒情搖滾。",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 
    musixmatchUrl: "https://www.musixmatch.com/artist/Willwi",
    youtubeMusicUrl: "https://music.youtube.com/channel/WillwiID",
    spotifyLink: "https://open.spotify.com/artist/3ascZ8Rb2KDw4QyCy29Om4",
    appleMusicLink: "https://music.apple.com/us/artist/willwi/1798471457"
  },
  {
    id: '2',
    title: '泡麵之歌',
    coverUrl: 'https://picsum.photos/id/192/400/400',
    language: Language.Japanese,
    projectType: ProjectType.PaoMien,
    releaseDate: '2024-01-20',
    isEditorPick: false,
    isrc: 'TW-A01-24-00002',
    description: "深夜肚子餓時的即興創作。",
    musixmatchUrl: "https://www.musixmatch.com/artist/Willwi",
    youtubeMusicUrl: "https://music.youtube.com/channel/WillwiID",
    spotifyLink: "https://open.spotify.com/artist/3ascZ8Rb2KDw4QyCy29Om4",
    appleMusicLink: "https://music.apple.com/us/artist/willwi/1798471457"
  }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize DB and Load Data
  useEffect(() => {
    const initData = async () => {
      try {
        // 1. Try to fetch from IndexedDB
        let dbSongs = await dbService.getAllSongs();

        // 2. Check for migration: If DB is empty but LocalStorage has data
        if (dbSongs.length === 0) {
           const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
           if (localData) {
             try {
               console.log("Migrating data from LocalStorage to IndexedDB...");
               const parsedLocal: Song[] = JSON.parse(localData);
               if (parsedLocal.length > 0) {
                 await dbService.bulkAdd(parsedLocal);
                 dbSongs = await dbService.getAllSongs();
                 // Optional: Clear local storage after successful migration
                 // localStorage.removeItem(LOCAL_STORAGE_KEY); 
               }
             } catch (e) {
               console.error("Migration failed:", e);
             }
           } else {
             // 3. If completely new, load initial sample data
             console.log("Initializing with sample data...");
             await dbService.bulkAdd(INITIAL_DATA);
             dbSongs = INITIAL_DATA;
           }
        }

        // Sort by date descending
        const sorted = dbSongs.sort((a, b) => 
            new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
        );
        setSongs(sorted);
      } catch (err) {
        console.error("Failed to initialize database:", err);
        // Fallback to memory only if DB fails
        setSongs(INITIAL_DATA);
      } finally {
        setIsLoaded(true);
      }
    };

    initData();
  }, []);

  const addSong = async (song: Song): Promise<boolean> => {
    try {
      await dbService.addSong(song);
      setSongs(prev => [song, ...prev]);
      return true;
    } catch (e) {
      console.error("DB Add Error:", e);
      alert("儲存失敗：資料庫寫入錯誤。");
      return false;
    }
  };

  const updateSong = async (id: string, updatedFields: Partial<Song>): Promise<boolean> => {
    try {
      const currentSong = songs.find(s => s.id === id);
      if (!currentSong) return false;

      const updatedSong = { ...currentSong, ...updatedFields };
      await dbService.updateSong(updatedSong);
      
      setSongs(prev => prev.map(s => s.id === id ? updatedSong : s));
      return true;
    } catch (e) {
      console.error("DB Update Error:", e);
      alert("更新失敗。");
      return false;
    }
  };

  const deleteSong = async (id: string) => {
    if (window.confirm("確定要刪除這首歌嗎？此操作無法復原。")) {
      try {
        await dbService.deleteSong(id);
        setSongs(prev => prev.filter(s => s.id !== id));
      } catch (e) {
        console.error("DB Delete Error:", e);
        alert("刪除失敗。");
      }
    }
  };

  const getSong = (id: string) => songs.find(s => s.id === id);

  return (
    <DataContext.Provider value={{ songs, addSong, updateSong, deleteSong, getSong }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};