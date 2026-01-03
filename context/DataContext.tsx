
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Song, Language, ProjectType, ReleaseCategory, SongContextType } from '../types';
import { supabaseService } from '../services/supabaseService';

interface ExtendedSongContextType extends SongContextType {
  dbStatus: 'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR';
  lastSyncTime: Date | null;
  storageUsage: number;
}

const DataContext = createContext<ExtendedSongContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'willwi_music_db_v3';

// ?��??�彩�?020617 (深�?), #fbbf24 (??
export const ASSETS = {
  willwiPortrait: "https://drive.google.com/thumbnail?id=18rpLhJQKHKK5EeonFqutlOoKAI2Eq_Hd&sz=w2560",
  defaultCover: (title: string) => {
    // ?��?修復�?placehold.co 不支?��??��?字�???
    // 如�?標�??�含中�?，固定顯�?"WILLWI STUDIO" 以維護�?覺�?業�???
    const isEnglishOnly = /^[A-Za-z0-9\s\-!@#$%^&*()_+={}[\]:;"'<>,.?/|~`]+$/.test(title);
    const safeText = isEnglishOnly ? title.replace(/\s+/g, '+') : 'WILLWI';
    return `https://placehold.co/1000x1000/020617/fbbf24?text=${safeText}+STUDIO`;
  }
};

// ?�眾?�設?��??��?作�?清單
export const INITIAL_DATA: Song[] = [
  {
    id: 'seed-001',
    title: '?��?一�?(Love Again)',
    versionLabel: 'Original',
    coverUrl: 'https://placehold.co/1000x1000/020617/fbbf24?text=Love+Again',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music',
    releaseDate: '2023-01-20',
    isEditorPick: true,
    isInteractiveActive: true,
    isOfficialExclusive: false,
    isrc: 'QZNWQ2392729',
    upc: '198004739563',
    spotifyId: '5g5X2x1T9bZqQ1v8K3k9J2',
    spotifyLink: 'https://open.spotify.com/track/5g5X2x1T9bZqQ1v8K3k9J2',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description: 'A heartfelt ballad exploring the courage to love again after heartbreak. \n?�於失�?後�??�找?��??�己?��?�?��鋼?��?弦�??�交織�?訴說?�深夜裡?�內心獨?��?,
    lyrics: `[VERSE 1]\n窗�??�雨?�在下\n心中?��??��??��?\n?�是一段漫?��??��?\n?��??�知?��?來\n\n[CHORUS]\n?��??��??��?次\n就�?從�??�傷?�\n?��??��??��?次\n?�抱????��??��?`,
    credits: 'Producer: Willwi\nArrangement: Alex\nMixing: Studio A',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
  }
];

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [dbStatus, setDbStatus] = useState<'CONNECTING' | 'ONLINE' | 'OFFLINE' | 'ERROR'>('CONNECTING');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [storageUsage, setStorageUsage] = useState(0);

  const loadData = useCallback(async () => {
    const health = await supabaseService.checkHealth();
    if (health.status === 'error') {
      setDbStatus('ERROR');
      setSongs(INITIAL_DATA);
      setIsReady(true);
      return;
    }

    try {
      setDbStatus('ONLINE');
      let loadedSongs = await supabaseService.getAllSongs();

      // ?�併?��?資�??�本?��???
      const songMap = new Map<string, Song>();
      INITIAL_DATA.forEach(s => songMap.set(s.id, s));
      loadedSongs.forEach(s => songMap.set(s.id, s));

      const finalSongs = Array.from(songMap.values()).map(s => ({
        ...s,
        coverUrl: s.coverUrl || ASSETS.defaultCover(s.title)
      }));

      finalSongs.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      setSongs(finalSongs);
      setLastSyncTime(new Date());
      setIsReady(true);

      supabaseService.getStorageEstimate().then(est => {
        if (est) setStorageUsage(est.usage);
      });

    } catch (error) {
      setDbStatus('ERROR');
      setSongs(INITIAL_DATA);
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    loadData();

    // 訂閱 Supabase Realtime 變更
    const unsubscribe = supabaseService.subscribeToChanges(async (payload) => {
      console.log('收到資料庫變更通知:', payload.eventType);
      
      if (payload.eventType === 'INSERT') {
        // 新增歌曲
        const newSong = payload.new;
        if (newSong) {
          const song = {
            id: newSong.id,
            title: newSong.title,
            versionLabel: newSong.version_label,
            coverUrl: newSong.cover_url || ASSETS.defaultCover(newSong.title),
            coverOverlayText: newSong.cover_overlay_text,
            language: newSong.language,
            projectType: newSong.project_type,
            releaseCategory: newSong.release_category,
            releaseCompany: newSong.release_company,
            publisher: newSong.publisher,
            releaseDate: newSong.release_date,
            isEditorPick: newSong.is_editor_pick,
            isInteractiveActive: newSong.is_interactive_active,
            isOfficialExclusive: newSong.is_official_exclusive,
            isrc: newSong.isrc,
            upc: newSong.upc,
            spotifyId: newSong.spotify_id,
            musicBrainzId: newSong.musicbrainz_id,
            youtubeUrl: newSong.youtube_url,
            cloudVideoUrl: newSong.cloud_video_url,
            customAudioLink: newSong.custom_audio_link,
            musixmatchUrl: newSong.musixmatch_url,
            youtubeMusicUrl: newSong.youtube_music_url,
            spotifyLink: newSong.spotify_link,
            appleMusicLink: newSong.apple_music_link,
            smartLink: newSong.smart_link,
            distrokidManageUrl: newSong.distrokid_manage_url,
            audioUrl: newSong.audio_url,
            lyrics: newSong.lyrics,
            description: newSong.description,
            credits: newSong.credits
          } as Song;
          
          setSongs(prev => {
            if (prev.some(s => s.id === song.id)) return prev;
            return [song, ...prev].sort((a, b) => 
              new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
            );
          });
          setLastSyncTime(new Date());
        }
      } else if (payload.eventType === 'UPDATE') {
        // 更新歌曲
        const updatedSong = payload.new;
        if (updatedSong) {
          setSongs(prev => prev.map(s => {
            if (s.id === updatedSong.id) {
              return {
                id: updatedSong.id,
                title: updatedSong.title,
                versionLabel: updatedSong.version_label,
                coverUrl: updatedSong.cover_url || ASSETS.defaultCover(updatedSong.title),
                coverOverlayText: updatedSong.cover_overlay_text,
                language: updatedSong.language,
                projectType: updatedSong.project_type,
                releaseCategory: updatedSong.release_category,
                releaseCompany: updatedSong.release_company,
                publisher: updatedSong.publisher,
                releaseDate: updatedSong.release_date,
                isEditorPick: updatedSong.is_editor_pick,
                isInteractiveActive: updatedSong.is_interactive_active,
                isOfficialExclusive: updatedSong.is_official_exclusive,
                isrc: updatedSong.isrc,
                upc: updatedSong.upc,
                spotifyId: updatedSong.spotify_id,
                musicBrainzId: updatedSong.musicbrainz_id,
                youtubeUrl: updatedSong.youtube_url,
                cloudVideoUrl: updatedSong.cloud_video_url,
                customAudioLink: updatedSong.custom_audio_link,
                musixmatchUrl: updatedSong.musixmatch_url,
                youtubeMusicUrl: updatedSong.youtube_music_url,
                spotifyLink: updatedSong.spotify_link,
                appleMusicLink: updatedSong.apple_music_link,
                smartLink: updatedSong.smart_link,
                distrokidManageUrl: updatedSong.distrokid_manage_url,
                audioUrl: updatedSong.audio_url,
                lyrics: updatedSong.lyrics,
                description: updatedSong.description,
                credits: updatedSong.credits
              } as Song;
            }
            return s;
          }));
          setLastSyncTime(new Date());
        }
      } else if (payload.eventType === 'DELETE') {
        // 刪除歌曲
        const deletedId = payload.old?.id;
        if (deletedId) {
          setSongs(prev => prev.filter(s => s.id !== deletedId));
          setLastSyncTime(new Date());
        }
      }
    });

    // 清理訂閱
    return () => {
      unsubscribe();
    };
  }, [loadData]);

  const addSong = async (song: Song) => {
    const songWithCover = { ...song, coverUrl: song.coverUrl || ASSETS.defaultCover(song.title) };
    try {
      if (dbStatus !== 'ERROR') {
        await supabaseService.addSong(songWithCover);
      }
      setSongs(prev => [songWithCover, ...prev]);
      setLastSyncTime(new Date());
      return true;
    } catch (error) { return false; }
  };

  const bulkAddSongs = async (newSongs: Song[]) => {
    const processed = newSongs.map(s => ({ ...s, coverUrl: s.coverUrl || ASSETS.defaultCover(s.title) }));
    try {
      if (dbStatus !== 'ERROR') {
        await supabaseService.bulkAdd(processed);
      }
      setSongs(prev => {
        const map = new Map<string, Song>(prev.map(s => [s.id, s]));
        processed.forEach(s => map.set(s.id, s));
        const updated = Array.from(map.values());
        return updated.sort((a: Song, b: Song) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
      });
      setLastSyncTime(new Date());
      return true;
    } catch (e) { return false; }
  };

  const updateSong = async (id: string, updatedSong: Partial<Song>) => {
    try {
      const existing = songs.find(s => s.id === id);
      if (!existing) return false;
      const newSong = { ...existing, ...updatedSong };
      if (!newSong.coverUrl) newSong.coverUrl = ASSETS.defaultCover(newSong.title);

      if (dbStatus !== 'ERROR') {
        await supabaseService.updateSong(newSong);
      }
      setSongs(prev => prev.map(s => s.id === id ? newSong : s));
      setLastSyncTime(new Date());
      return true;
    } catch (error) { return false; }
  };

  const deleteSong = async (id: string) => {
    try {
      if (dbStatus !== 'ERROR') {
        await supabaseService.deleteSong(id);
      }
      setSongs(prev => prev.filter(s => s.id !== id));
      setLastSyncTime(new Date());
    } catch (error) { }
  };

  const getSong = (id: string) => songs.find(s => s.id === id);

  return (
    <DataContext.Provider value={{ songs, addSong, updateSong, deleteSong, getSong, bulkAddSongs, dbStatus, lastSyncTime, storageUsage }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData error');
  return context;
};
