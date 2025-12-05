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

let dbPromise: Promise<IDBPDatabase<WillwiDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<WillwiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('songs')) {
          const store = db.createObjectStore('songs', { keyPath: 'id' });
          store.createIndex('by-date', 'releaseDate');
        }
      },
    });
  }
  return dbPromise;
};

export const dbService = {
  async getAllSongs(): Promise<Song[]> {
    const db = await initDB();
    // Sort by date descending (newest first) could be done here or in memory
    // IndexedDB natural order is by key (id), we can use index if needed
    return await db.getAll('songs');
  },

  async getSong(id: string): Promise<Song | undefined> {
    const db = await initDB();
    return await db.get('songs', id);
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
    await Promise.all(songs.map(song => tx.store.put(song)));
    await tx.done;
  },

  async clearAllSongs(): Promise<void> {
    const db = await initDB();
    await db.clear('songs');
  }
};