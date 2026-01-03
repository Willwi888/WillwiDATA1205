import { supabase } from './supabaseClient';
import { Song } from '../types';

// 將前端的 Song 格式轉換為 Supabase 的資料庫格式
const toDbFormat = (song: Song) => ({
    id: song.id,
    title: song.title,
    version_label: song.versionLabel,
    cover_url: song.coverUrl,
    cover_overlay_text: song.coverOverlayText,
    language: song.language,
    project_type: song.projectType,
    release_category: song.releaseCategory,
    release_company: song.releaseCompany,
    publisher: song.publisher,
    release_date: song.releaseDate,
    is_editor_pick: song.isEditorPick,
    is_interactive_active: song.isInteractiveActive,
    is_official_exclusive: song.isOfficialExclusive,
    isrc: song.isrc,
    upc: song.upc,
    spotify_id: song.spotifyId,
    musicbrainz_id: song.musicBrainzId,
    youtube_url: song.youtubeUrl,
    cloud_video_url: song.cloudVideoUrl,
    custom_audio_link: song.customAudioLink,
    musixmatch_url: song.musixmatchUrl,
    youtube_music_url: song.youtubeMusicUrl,
    spotify_link: song.spotifyLink,
    apple_music_link: song.appleMusicLink,
    smart_link: song.smartLink,
    distrokid_manage_url: song.distrokidManageUrl,
    audio_url: song.audioUrl,
    lyrics: song.lyrics,
    description: song.description,
    credits: song.credits
});

// 將資料庫格式轉換為前端的 Song 格式
const fromDbFormat = (dbSong: any): Song => ({
    id: dbSong.id,
    title: dbSong.title,
    versionLabel: dbSong.version_label,
    coverUrl: dbSong.cover_url,
    coverOverlayText: dbSong.cover_overlay_text,
    language: dbSong.language,
    projectType: dbSong.project_type,
    releaseCategory: dbSong.release_category,
    releaseCompany: dbSong.release_company,
    publisher: dbSong.publisher,
    releaseDate: dbSong.release_date,
    isEditorPick: dbSong.is_editor_pick,
    isInteractiveActive: dbSong.is_interactive_active,
    isOfficialExclusive: dbSong.is_official_exclusive,
    isrc: dbSong.isrc,
    upc: dbSong.upc,
    spotifyId: dbSong.spotify_id,
    musicBrainzId: dbSong.musicbrainz_id,
    youtubeUrl: dbSong.youtube_url,
    cloudVideoUrl: dbSong.cloud_video_url,
    customAudioLink: dbSong.custom_audio_link,
    musixmatchUrl: dbSong.musixmatch_url,
    youtubeMusicUrl: dbSong.youtube_music_url,
    spotifyLink: dbSong.spotify_link,
    appleMusicLink: dbSong.apple_music_link,
    smartLink: dbSong.smart_link,
    distrokidManageUrl: dbSong.distrokid_manage_url,
    audioUrl: dbSong.audio_url,
    lyrics: dbSong.lyrics,
    description: dbSong.description,
    credits: dbSong.credits
});

export const supabaseService = {
    // 獲取所有歌曲
    async getAllSongs(): Promise<Song[]> {
        try {
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .order('release_date', { ascending: false });

            if (error) {
                console.error('Supabase 查詢錯誤:', error);
                return [];
            }

            return (data || []).map(fromDbFormat);
        } catch (error) {
            console.error('獲取歌曲失敗:', error);
            return [];
        }
    },

    // 獲取單首歌曲
    async getSong(id: string): Promise<Song | null> {
        try {
            const { data, error } = await supabase
                .from('songs')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Supabase 查詢錯誤:', error);
                return null;
            }

            return data ? fromDbFormat(data) : null;
        } catch (error) {
            console.error('獲取歌曲失敗:', error);
            return null;
        }
    },

    // 新增歌曲
    async addSong(song: Song): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('songs')
                .insert(toDbFormat(song));

            if (error) {
                console.error('新增歌曲失敗:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('新增歌曲失敗:', error);
            return false;
        }
    },

    // 更新歌曲
    async updateSong(id: string, updates: Partial<Song>): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('songs')
                .update(toDbFormat(updates as Song))
                .eq('id', id);

            if (error) {
                console.error('更新歌曲失敗:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('更新歌曲失敗:', error);
            return false;
        }
    },

    // 刪除歌曲
    async deleteSong(id: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('songs')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('刪除歌曲失敗:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('刪除歌曲失敗:', error);
            return false;
        }
    },

    // 批量新增歌曲
    async bulkAddSongs(songs: Song[]): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('songs')
                .insert(songs.map(toDbFormat));

            if (error) {
                console.error('批量新增歌曲失敗:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('批量新增歌曲失敗:', error);
            return false;
        }
    },

    // 檢查連接狀態
    async checkConnection(): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('songs')
                .select('count')
                .limit(1);

            return !error;
        } catch (error) {
            console.error('連接檢查失敗:', error);
            return false;
        }
    },

    // 訂閱資料庫變更（Realtime）
    subscribeToChanges(callback: (payload: any) => void) {
        const channel = supabase
            .channel('songs-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // 監聽所有事件：INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'songs'
                },
                (payload) => {
                    console.log('資料庫變更:', payload);
                    callback(payload);
                }
            )
            .subscribe();

        // 返回取消訂閱函數
        return () => {
            supabase.removeChannel(channel);
        };
    },

    // 健康檢查
    async checkHealth(): Promise<{ status: 'ok' | 'error', message?: string }> {
        try {
            const { error } = await supabase
                .from('songs')
                .select('id')
                .limit(1);

            if (error) {
                return { status: 'error', message: error.message };
            }
            return { status: 'ok' };
        } catch (error) {
            return { status: 'error', message: String(error) };
        }
    },

    // 獲取儲存空間估算
    async getStorageEstimate(): Promise<{ usage: number, quota: number } | null> {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            return {
                usage: estimate.usage || 0,
                quota: estimate.quota || 0
            };
        }
        return null;
    },

    // 修正方法名稱（保持向後兼容）
    async bulkAdd(songs: Song[]): Promise<boolean> {
        return this.bulkAddSongs(songs);
    }
};
