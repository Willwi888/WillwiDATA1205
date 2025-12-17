
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Song, Language, ProjectType, ReleaseCategory, SongContextType } from '../types';
import { dbService } from '../services/db';

const DataContext = createContext<SongContextType | undefined>(undefined);

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
    title: '再愛一次',
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
    description: 'A heartfelt ballad exploring the courage to love again after heartbreak.'
  }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Source of truth: IndexedDB -> State
  const loadData = useCallback(async () => {
      try {
        let loadedSongs = await dbService.getAllSongs();
        
        // Migration from localstorage if DB is empty
        if (loadedSongs.length === 0) {
            const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (localData) {
                loadedSongs = JSON.parse(localData);
                await dbService.bulkAdd(loadedSongs);
            }
        }

        // Still empty? Seed initial data.
        if (loadedSongs.length === 0) {
             loadedSongs = INITIAL_DATA;
             await dbService.bulkAdd(loadedSongs);
        }

        setSongs(loadedSongs);
        setIsReady(true);
      } catch (error) {
        console.error("DB Load Error", error);
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
      setSongs(prev => [song, ...prev]);
      return true;
    } catch (error) { return false; }
  };

  const updateSong = async (id: string, updatedSong: Partial<Song>) => {
    try {
      const existing = songs.find(s => s.id === id);
      if (!existing) return false;
      const newSong = { ...existing, ...updatedSong };
      await dbService.updateSong(newSong);
      setSongs(prev => prev.map(s => s.id === id ? newSong : s));
      return true;
    } catch (error) { return false; }
  };

  const deleteSong = async (id: string) => {
    try {
      await dbService.deleteSong(id);
      setSongs(prev => prev.filter(s => s.id !== id));
    } catch (error) {}
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
  if (!context) throw new Error('useData error');
  return context;
};
