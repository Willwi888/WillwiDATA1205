import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Song, Language, ProjectType, ReleaseCategory, SongContextType } from '../types';
import { dbService } from '../services/db';

const DataContext = createContext<SongContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'willwi_music_db_v1';

// Initial sample data if DB is completely empty and no local storage found
// Replaced Picsum with Unsplash for better visual quality
const INITIAL_DATA: Song[] = [
  {
    id: '1',
    title: '再愛一次',
    versionLabel: 'Original',
    coverUrl: 'https://images.unsplash.com/photo-1514525253440-b393452e8d26?q=80&w=800&auto=format&fit=crop',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseDate: '2023-01-01',
    isEditorPick: true,
    description: 'Sample song description.'
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
                loadedSongs = INITIAL_DATA;
                await dbService.bulkAdd(loadedSongs);
            }
        }
        setSongs(loadedSongs);
      } catch (error) {
        console.error("Failed to load data", error);
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