
import { ReleaseCategory } from '../types';

const MB_API_BASE = 'https://musicbrainz.org/ws/2';
const WILLWI_MBID = '526cc0f8-da20-4d2d-86a5-4bf841a6ba3c';
const USER_AGENT = 'WillwiMusicManager/2.0 ( will@willwi.com )'; 

export interface MBReleaseGroup {
  id: string;
  title: string;
  'primary-type': string;
  'first-release-date': string;
  score?: number;
}

export interface MBRecording {
  id: string;
  title: string;
  isrc?: string;
  releaseDate?: string;
  releaseCompany?: string;
  releaseCategory?: ReleaseCategory;
  releases?: any[];
}

export interface MBImportData {
  tracks: { id: string; title: string; position: number }[];
  releaseDate: string;
  releaseCompany: string;
  category: ReleaseCategory;
}

export const mapMBTypeToCategory = (type: string): ReleaseCategory => {
  const t = (type || '').toUpperCase();
  if (t.includes('EP')) return ReleaseCategory.EP;
  if (t.includes('SINGLE')) return ReleaseCategory.Single;
  return ReleaseCategory.Album; 
};

/**
 * 根據 ISRC 搜尋錄音
 */
export const getRecordingByISRC = async (isrc: string): Promise<MBRecording | null> => {
    try {
        const url = `${MB_API_BASE}/recording?query=isrc:${isrc}&fmt=json`;
        const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT } });
        if (!response.ok) return null;
        const data = await response.json();
        const rec = data.recordings?.[0];
        if (!rec) return null;

        const release = rec.releases?.[0];
        return {
            id: rec.id,
            title: rec.title,
            isrc: isrc,
            releaseDate: release?.date || '',
            releaseCompany: release?.['label-info']?.[0]?.label?.name || '',
            releaseCategory: mapMBTypeToCategory(release?.['status'] || ''),
            releases: rec.releases
        };
    } catch (e) { return null; }
};

/**
 * 全域搜尋錄音 (用於 AddSong 頁面)
 */
export const searchMBRecordings = async (query: string): Promise<MBRecording[]> => {
    try {
        const url = `${MB_API_BASE}/recording?query=recording:${encodeURIComponent(query)} AND arid:${WILLWI_MBID}&fmt=json`;
        const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT } });
        if (!response.ok) return [];
        const data = await response.json();
        
        return (data.recordings || []).map((rec: any) => {
            const release = rec.releases?.[0];
            return {
                id: rec.id,
                title: rec.title,
                isrc: rec.isrcs?.[0] || '',
                releaseDate: release?.date || '',
                releaseCompany: release?.['label-info']?.[0]?.label?.name || '',
                releaseCategory: mapMBTypeToCategory(release?.['status'] || ''),
            };
        });
    } catch (e) { return []; }
};

export const getWillwiReleases = async (): Promise<MBReleaseGroup[]> => {
  try {
    const url = `${MB_API_BASE}/release-group?artist=${WILLWI_MBID}&fmt=json&limit=100`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT } });
    if (!response.ok) return [];
    const data = await response.json();
    return data['release-groups'] || [];
  } catch (error) { return []; }
};

export const getReleaseGroupDetails = async (releaseGroupId: string, primaryType: string): Promise<MBImportData | null> => {
  try {
    const url = `${MB_API_BASE}/release?release-group=${releaseGroupId}&inc=recordings+labels&fmt=json`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT } });
    if (!response.ok) return null;
    const data = await response.json();
    const releases = data.releases || [];
    if (releases.length === 0) return null;
    
    const targetRelease = releases[0];
    const tracks = (targetRelease.media?.[0]?.tracks || []).map((t: any) => ({
        id: t.recording?.id || t.id,
        title: t.title,
        position: t.position
    }));

    return {
        tracks,
        releaseDate: targetRelease.date || '',
        releaseCompany: targetRelease['label-info']?.[0]?.label?.name || 'Willwi Music',
        category: mapMBTypeToCategory(primaryType)
    };
  } catch (error) { return null; }
};

export const getCoverArtUrl = async (releaseGroupId: string): Promise<string | null> => {
  try {
    const url = `https://coverartarchive.org/release-group/${releaseGroupId}`;
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return null;
    const data = await response.json();
    return data.images.find((img: any) => img.front)?.image || data.images[0]?.image || null;
  } catch (e) { return null; }
};
