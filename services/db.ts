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
        console.warn('DB blocked: Close other tabs with this site open.');
      },
      blocking() {
        console.warn('DB blocking: Closing connection for upgrade.');
        if (dbPromise) dbPromise.then(db => db.close());
        dbPromise = null;
      },
      terminated() {
        console.error('DB terminated abnormally.');
        dbPromise = null;
      },
    });
  }
  return dbPromise;
};

export const dbService = {
  async checkHealth(): Promise<{ status: 'ok' | 'error', message?: string }> {
      try {
          if (!window.indexedDB) return { status: 'error', message: 'Browser not supported' };
          await initDB();
          return { status: 'ok' };
      } catch (e: any) {
          return { status: 'error', message: e.message || 'IndexedDB access denied' };
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
    } catch (e) { console.error("DB Read Error", e); return []; }
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
    // Using Promise.all inside a transaction can be tricky with some browsers,
    // but idb library handles it well usually. Sequential putting is safer for bulk.
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