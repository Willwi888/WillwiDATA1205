import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';

import {
  Song,
  SongContextType,
} from '../types';

import { dbService } from '../services/db';
import { OFFICIAL_CATALOG, ASSETS } from './InitialData';

export { ASSETS };

/* ======================
   ENV (⚠️ 不要寫死)
====================== */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

const SETTINGS_LOCAL_KEY = 'willwi_settings_backup';

/* ======================
   Types
====================== */
interface GlobalSettings {
  portraitUrl: string;
  defaultCoverUrl: string;
  qr_global_payment: string;
  qr_line: string;
  qr_production: string;
  qr_cinema: string;
  qr_support: string;
  accessCode: string;
  exclusiveYoutubeUrl?: string;
}

interface ExtendedSongContextType extends SongContextType {
  isSyncing: boolean;
  syncSuccess: boolean;
  lastError: string | null;
  refreshData: () => Promise<void>;
  uploadSongsToCloud: (data?: Song[]) => Promise<boolean>;
  uploadSettingsToCloud: (settings: GlobalSettings) => Promise<void>;
  bulkAppendSongs: (songs: Song[]) => Promise<boolean>;
  globalSettings: GlobalSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  currentSong: Song | null;
  setCurrentSong: (song: Song | null) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playSong: (song: Song) => void;
}

/* ======================
   Utils
====================== */
export const normalizeIdentifier = (val: string) =>
  (val || '')
    .trim()
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase();

export const resolveDirectLink = (url: string) => {
  if (!url || typeof url !== 'string') return '';
  let cleanUrl = url.trim();

  if (cleanUrl.includes('dropbox.com')) {
    let base = cleanUrl.split('?')[0];
    return base
      .replace('//www.dropbox.com', '//dl.dropboxusercontent.com')
      .replace('//dropbox.com', '//dl.dropboxusercontent.com') + '?raw=1';
  }

  if (cleanUrl.includes('drive.google.com')) {
    const match =
      cleanUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      cleanUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (match?.[1]) {
      return `https://docs.google.com/uc?export=download&id=${match[1]}`;
    }
  }

  return cleanUrl;
};

/* ======================
   Context
====================== */
const DataContext = createContext<ExtendedSongContextType | undefined>(
  undefined
);

/* ======================
   Provider
====================== */
export const DataProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(() => {
    const backup = localStorage.getItem(SETTINGS_LOCAL_KEY);
    if (backup) return JSON.parse(backup);
    return {
      portraitUrl: ASSETS.willwiPortrait,
      defaultCoverUrl: ASSETS.defaultCover,
      qr_global_payment: '',
      qr_line: '',
      qr_production: '',
      qr_cinema: '',
      qr_support: '',
      accessCode: '8888',
      exclusiveYoutubeUrl: '',
    };
  });

  /* ======================
     Cloud Sync (UPSERT)
  ====================== */
  const uploadSongsToCloud = useCallback(
    async (data?: Song[]) => {
      setIsSyncing(true);
      try {
        const list = data || songs;

        const payload = list.map((s) => ({
          id: normalizeIdentifier(s.id || s.isrc || ''),
          title: s.title,
          isrc: s.isrc ?? '',
          upc: s.upc ?? '',
          cover_url: s.coverUrl,
          audio_url: s.audioUrl ?? '',
          lyrics: s.lyrics ?? '',
          language: s.language,
          release_date: s.releaseDate,
          is_interactive_active: !!s.isInteractiveActive,
          creative_note: s.creativeNote ?? '',
          credits: s.credits ?? '',
          release_company: s.releaseCompany ?? 'Willwi Music',
        }));

        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/songs?on_conflict=id`,
          {
            method: 'POST',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) throw new Error(await res.text());
        setSyncSuccess(true);
        return true;
      } catch (e: any) {
        setLastError(e.message);
        setSyncSuccess(false);
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [songs]
  );

  /* ======================
     Load Data
  ====================== */
  const loadData = useCallback(async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/songs?select=*&order=release_date.desc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          cache: 'no-store',
        }
      );

      if (!res.ok) throw new Error(await res.text());

      const remote = await res.json();
      const cloudSongs = remote
        .filter((r: any) => r.id !== 'SYSTEM_CONFIG')
        .map((s: any) => ({
          ...s,
          id: s.id,
          coverUrl: s.cover_url,
          audioUrl: s.audio_url,
          releaseDate: s.release_date,
          isInteractiveActive: s.is_interactive_active,
          creativeNote: s.creative_note,
          releaseCompany: s.release_company,
        }));

      if (cloudSongs.length > 0) {
        setSongs(cloudSongs);
        await dbService.bulkAdd(cloudSongs);
      } else {
        setSongs(OFFICIAL_CATALOG);
        await uploadSongsToCloud(OFFICIAL_CATALOG);
      }
    } catch {
      const local = await dbService.getAllSongs();
      if (local.length) setSongs(local);
    } finally {
      setIsSyncing(false);
    }
  }, [uploadSongsToCloud]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ======================
     Provider Value
  ====================== */
  return (
    <DataContext.Provider
      value={{
        songs,
        addSong: async (s) => {
          const song = {
            ...s,
            id: normalizeIdentifier(s.isrc || s.id),
          };
          const list = [song, ...songs];
          setSongs(list);
          return uploadSongsToCloud(list);
        },
        updateSong: async (id, s) => {
          const list = songs.map((x) =>
            x.id === id ? { ...x, ...s } : x
          );
          setSongs(list);
          return uploadSongsToCloud(list);
        },
        deleteSong: async (id) => {
          setSongs((prev) => prev.filter((s) => s.id !== id));
          await fetch(
            `${SUPABASE_URL}/rest/v1/songs?id=eq.${id}`,
            {
              method: 'DELETE',
              headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
              },
            }
          );
        },
        getSong: (id) => songs.find((s) => s.id === id),
        bulkAddSongs: async (s) => {
          setSongs(s);
          return uploadSongsToCloud(s);
        },
        bulkAppendSongs: async (newSongs) => {
          const merged = [...songs];
          newSongs.forEach((n) => {
            if (!merged.find((m) => m.id === n.id)) merged.push(n);
          });
          setSongs(merged);
          return uploadSongsToCloud(merged);
        },
        isSyncing,
        syncSuccess,
        lastError,
        refreshData: loadData,
        uploadSongsToCloud,
        uploadSettingsToCloud: async (st) => {
          localStorage.setItem(
            SETTINGS_LOCAL_KEY,
            JSON.stringify(st)
          );
        },
        globalSettings,
        setGlobalSettings,
        currentSong,
        setCurrentSong,
        isPlaying,
        setIsPlaying,
        playSong: (s) => {
          setCurrentSong(s);
          setIsPlaying(true);
        },
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

/* ======================
   Hook
====================== */
export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be inside DataProvider');
  return ctx;
};
