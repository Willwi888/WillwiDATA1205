import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Song, Language, ProjectType, ReleaseCategory, SongContextType } from '../types';
import { dbService } from '../services/db';

const DataContext = createContext<SongContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'willwi_music_db_v1';

// --- FACTORY DEFAULT DATA ---
// This ensures the app is never empty even if the browser cache is cleared.
export const INITIAL_DATA: Song[] = [
  {
    id: 'seed-001',
    title: '再愛一次',
    versionLabel: 'Original',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/4a/53/16/4a531649-1662-8356-6548-aa1d334544d6/198004739563.png/600x600bb.jpg',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music',
    releaseDate: '2023-01-20',
    isEditorPick: true,
    isrc: 'QZNWQ2392729',
    upc: '198004739563',
    spotifyId: '5g5X2x1T9bZqQ1v8K3k9J2',
    spotifyLink: 'https://open.spotify.com/track/5g5X2x1T9bZqQ1v8K3k9J2',
    appleMusicLink: 'https://music.apple.com/tw/album/love-again/1666666666?i=1666666666',
    musicBrainzId: '',
    description: 'A heartfelt ballad exploring the courage to love again after heartbreak. \n\n這是一首關於在心碎後重新尋找愛與勇氣的抒情歌曲。'
  },
  {
    id: 'seed-002',
    title: 'Love Again',
    versionLabel: 'English Ver.',
    coverUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/4a/53/16/4a531649-1662-8356-6548-aa1d334544d6/198004739563.png/600x600bb.jpg',
    language: Language.English,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music',
    releaseDate: '2023-01-20',
    isEditorPick: false,
    description: 'The English interpretation of "再愛一次", bringing the same emotion to a global audience.'
  }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try IndexedDB first
        let loadedSongs = await dbService.getAllSongs();
        
        if (loadedSongs.length === 0) {
            // Check LocalStorage if IndexedDB is empty (migration scenario or fallback)
            const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (localData) {
                loadedSongs = JSON.parse(localData);
                // Migrate to IndexedDB
                await dbService.bulkAdd(loadedSongs);
            } else {
                // Initialize with seed data if absolutely nothing exists
                console.log("Database empty. Seeding with initial data.");
                loadedSongs = INITIAL_DATA;
                await dbService.bulkAdd(loadedSongs);
            }
        }
        setSongs(loadedSongs);
      } catch (error) {
        console.error("Failed to load data", error);
        // Fallback to memory-only initial data so app doesn't crash
        setSongs(INITIAL_DATA);
      }
    };
    loadData();
  }, []);

  const addSong = async (song: Song) => {
    try {
      await dbService.addSong(song);
      setSongs(prev => [song, ...prev]);
      return true;
    } catch (error) {
      console.error("Failed to add song", error);
      return false;
    }
  };

  const updateSong = async (id: string, updatedSong: Partial<Song>) => {
    try {
      const existingSong = songs.find(s => s.id === id);
      if (!existingSong) return false;
      
      const newSong = { ...existingSong, ...updatedSong };
      await dbService.updateSong(newSong);
      
      setSongs(prev => prev.map(s => s.id === id ? newSong : s));
      return true;
    } catch (error) {
      console.error("Failed to update song", error);
      return false;
    }
  };

  const deleteSong = async (id: string) => {
    try {
      await dbService.deleteSong(id);
      setSongs(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error("Failed to delete song", error);
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