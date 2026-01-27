import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Song } from '../types';

interface WillwiDB extends DBSchema {
  songs: {
    key: string;
    value: Song;
    indexes: { 'by-date': string };
  };
}

const DB_NAME = 'willwi-music-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<WillwiDB>> | null = null;

/**
 * Initializes or returns the existing IDB connection.
 * Includes robust error handling for unexpected terminations.
 */
export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<WillwiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('songs')) {
          const store = db.createObjectStore('songs', { keyPath: 'id' });
          store.createIndex('by-date', 'releaseDate');
        }
      },
      blocked() {
        console.warn('Database access blocked. Please close other tabs of this site.');
      },
      blocking() {
        if (dbPromise) {
            dbPromise.then(db => db.close());
            dbPromise = null;
        }
      },
      terminated() {
        // Soften the log and ensure the next call triggers a fresh connection
        console.info('Database connection reset. Re-establishing on next request...');
        dbPromise = null;
      },
    });
  }
  return dbPromise;
};

export const dbService = {
  async checkHealth(): Promise<{ status: 'ok' | 'error', message?: string }> {
      try {
          if (!window.indexedDB) return { status: 'error', message: 'IndexedDB not supported' };
          const db = await initDB();
          // Verify we can actually perform a read
          await db.get('songs', 'HEALTH_CHECK');
          return { status: 'ok' };
      } catch (e: any) {
          dbPromise = null; // Reset on failure
          return { status: 'error', message: e.message || 'Database initialization failed' };
      }
  },

  async getStorageEstimate(): Promise<{ usage: number, quota: number } | null> {
      if (navigator.storage && navigator.storage.estimate) {
          const estimate = await navigator.storage.estimate();
          return { 
              usage: estimate.usage || 0, 
              quota: estimate.quota || 0 
          };
      }
      return null;
  },

  async getAllSongs(): Promise<Song[]> {
    try {
        const db = await initDB();
        return await db.getAll('songs');
    } catch (e) { 
        console.warn("DB Read Warning:", e); 
        dbPromise = null; // Attempt reset
        return []; 
    }
  },

  async getSong(id: string): Promise<Song | undefined> {
    try {
        const db = await initDB();
        return await db.get('songs', id);
    } catch (e) { return undefined; }
  },

  async addSong(song: Song): Promise<void> {
    const db = await initDB();
    await db.put('songs', song);
  },

  async updateSong(song: Song): Promise<void> {
    const db = await initDB();
    await db.put('songs', song);
  },

  async deleteSong(id: string): Promise<void> {
    const db = await initDB();
    await db.delete('songs', id);
  },

  async bulkAdd(songs: Song[]): Promise<void> {
    const db = await initDB();
    const tx = db.transaction('songs', 'readwrite');
    for (const song of songs) {
        await tx.store.put(song);
    }
    await tx.done;
  },

  async clearAllSongs(): Promise<void> {
    const db = await initDB();
    await db.clear('songs');
  }
};