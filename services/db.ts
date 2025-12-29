
import { openDB, IDBPDatabase } from 'idb';
import { Song } from '../types';

const DB_NAME = 'WillwiMusicDB';
const STORE_NAME = 'songs';
const VERSION = 1;

class DBService {
  private db: Promise<IDBPDatabase> | null = null;

  async getDB() {
    if (!this.db) {
      this.db = openDB(DB_NAME, VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        },
      });
    }
    return this.db;
  }

  async checkHealth(): Promise<{ status: 'ok' | 'error'; message?: string }> {
    try {
      const db = await this.getDB();
      // Simple write-read test
      const tx = db.transaction(STORE_NAME, 'readonly');
      await tx.done;
      return { status: 'ok' };
    } catch (e) {
      return { 
        status: 'error', 
        message: e instanceof Error ? e.message : 'Unknown database error' 
      };
    }
  }

  async getAllSongs(): Promise<Song[]> {
    const db = await this.getDB();
    return db.getAll(STORE_NAME);
  }

  async addSong(song: Song): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_NAME, song);
  }

  async bulkAdd(songs: Song[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    for (const song of songs) {
      await tx.store.put(song);
    }
    await tx.done;
  }

  async updateSong(song: Song): Promise<void> {
    const db = await this.getDB();
    await db.put(STORE_NAME, song);
  }

  async deleteSong(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete(STORE_NAME, id);
  }

  async clearAllSongs(): Promise<void> {
    const db = await this.getDB();
    await db.clear(STORE_NAME);
  }

  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
    return null;
  }
}

export const dbService = new DBService();
