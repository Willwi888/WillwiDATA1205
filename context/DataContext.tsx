import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
    // Example of a direct audio link (using a demo MP3 link for visualization)
    audioUrl: '', 
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
  const [syncError, setSyncError] = useState<string | null>(null);

  // Helper: Persist to LocalStorage (Redundancy Backup)
  const persistToLocalStorage = (currentSongs: Song[]) => {
      try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentSongs));
      } catch (e) {
          console.warn("LocalStorage backup failed (Quota Exceeded?)", e);
          setSyncError("Local Storage Full - Data may not persist.");
      }
  };

  // Robust Load Logic
  const loadData = useCallback(async () => {
      try {
        // 1. Try IndexedDB first
        let loadedSongs = await dbService.getAllSongs();
        
        // 2. Fallback/Migration: Check LocalStorage if IndexedDB is empty
        if (loadedSongs.length === 0) {
            const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (localData) {
                try {
                    loadedSongs = JSON.parse(localData);
                    // Self-healing: Populate IndexedDB from LocalStorage
                    if (loadedSongs.length > 0) {
                        console.log("Migrating/Restoring data to IndexedDB...");
                        await dbService.bulkAdd(loadedSongs);
                    }
                } catch(e) {
                    console.error("Corrupt LocalStorage data", e);
                }
            }
        }

        // 3. Seeding: If still empty, use Factory Defaults
        if (loadedSongs.length === 0) {
             console.log("Database empty. Seeding with initial data.");
             loadedSongs = INITIAL_DATA;
             await dbService.bulkAdd(loadedSongs);
             persistToLocalStorage(loadedSongs);
        }

        setSongs(loadedSongs);
        setSyncError(null); // Clear any previous errors
      } catch (error) {
        console.error("Failed to load data", error);
        setSyncError("Data cannot be synchronized. Using temporary session.");
        // Last resort: memory fallback so app doesn't crash
        if (songs.length === 0) setSongs(INITIAL_DATA); 
      }
  }, []); // No dependencies

  // Initial Load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 4. Cross-Tab Sync (Conflict Resolution: Last Write Wins / Reload)
  useEffect(() => {
      const handleStorageChange = (e: StorageEvent) => {
          if (e.key === LOCAL_STORAGE_KEY) {
              console.log("External change detected (Syncing tab...), reloading data.");
              loadData();
          }
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  const addSong = async (song: Song) => {
    try {
      // 1. Try IndexedDB
      await dbService.addSong(song);
      
      // 2. Update State & LocalStorage
      setSongs(prev => {
          const newState = [song, ...prev];
          persistToLocalStorage(newState);
          return newState;
      });
      return true;
    } catch (error) {
      console.error("Failed to add song to DB", error);
      
      // Robustness: Try to update State/LocalStorage even if DB failed
      try {
          setSongs(prev => {
              const newState = [song, ...prev];
              persistToLocalStorage(newState);
              return newState;
          });
          setSyncError("Database Write Failed (Saved to Local Backup)");
          return true; // Soft success
      } catch (e) {
          setSyncError("Critical: Data cannot be synchronized.");
          return false;
      }
    }
  };

  const updateSong = async (id: string, updatedSong: Partial<Song>) => {
    try {
      const existingSong = songs.find(s => s.id === id);
      if (!existingSong) return false;
      
      const newSong = { ...existingSong, ...updatedSong };
      
      // 1. Try IndexedDB
      await dbService.updateSong(newSong);
      
      // 2. Update State & LocalStorage
      setSongs(prev => {
          const newState = prev.map(s => s.id === id ? newSong : s);
          persistToLocalStorage(newState);
          return newState;
      });
      return true;
    } catch (error) {
      console.error("Failed to update song", error);
      setSyncError("Data Update Failed");
      return false;
    }
  };

  const deleteSong = async (id: string) => {
    try {
      await dbService.deleteSong(id);
      setSongs(prev => {
          const newState = prev.filter(s => s.id !== id);
          persistToLocalStorage(newState);
          return newState;
      });
    } catch (error) {
      console.error("Failed to delete song", error);
      setSyncError("Data Deletion Failed");
    }
  };

  const getSong = (id: string) => songs.find(s => s.id === id);

  return (
    <DataContext.Provider value={{ songs, addSong, updateSong, deleteSong, getSong }}>
      {children}
      {/* Toast Notification for Sync Errors */}
      {syncError && (
          <div className="fixed bottom-4 left-4 z-[9999] bg-red-600/90 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-fade-in-up border border-red-400/50 backdrop-blur-sm">
              <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                  <h4 className="font-bold text-sm">Sync Error</h4>
                  <p className="text-xs opacity-90">{syncError}</p>
              </div>
              <button onClick={() => setSyncError(null)} className="ml-2 hover:bg-white/20 rounded p-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
          </div>
      )}
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