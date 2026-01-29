
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
  upc?: string; // 新增 UPC 支援
  releaseDate?: string;
  releaseCompany?: string;
  releaseCategory?: ReleaseCategory;
  coverUrl?: string; // 新增封面支援
  releases?: any[];
}

export const mapMBTypeToCategory = (type: string): ReleaseCategory => {
  const t = (type || '').toUpperCase();
  if (t.includes('EP')) return ReleaseCategory.EP;
  if (t.includes('SINGLE')) return ReleaseCategory.Single;
  return ReleaseCategory.Album; 
};

/**
 * 根據 ISRC 搜尋錄音並深度獲取 UPC
 */
export const getRecordingByISRC = async (isrc: string): Promise<MBRecording | null> => {
    try {
        // 增加 inc=releases+labels 確保獲取關聯發行
        const url = `${MB_API_BASE}/recording?query=isrc:${isrc}&fmt=json`;
        const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT } });
        if (!response.ok) return null;
        const data = await response.json();
        const rec = data.recordings?.[0];
        if (!rec) return null;

        // 尋找官方發行版以獲取條碼 (UPC)
        let upc = '';
        let coverUrl = '';
        const officialRelease = rec.releases?.find((r: any) => r.status === 'Official') || rec.releases?.[0];
        
        if (officialRelease) {
            // 注意：MusicBrainz API 的 search 結果 releases 通常不帶 barcode
            // 為了效能，我們這裡先預留介面，若需要精準 UPC，AdminDashboard 會調用 lookup
            upc = officialRelease.barcode || ''; 
            
            // 嘗試獲取封面 ID
            if (officialRelease.id) {
                coverUrl = `https://coverartarchive.org/release/${officialRelease.id}/front-500`;
            }
        }

        const release = officialRelease;
        return {
            id: rec.id,
            title: rec.title,
            isrc: isrc,
            upc: upc,
            releaseDate: release?.date || '',
            releaseCompany: release?.['label-info']?.[0]?.label?.name || '',
            releaseCategory: mapMBTypeToCategory(release?.['status'] || ''),
            coverUrl: coverUrl,
            releases: rec.releases
        };
    } catch (e) { return null; }
};

/**
 * 獲取發行版詳情以獲取精確 Barcode (UPC)
 */
export const getReleaseBarcode = async (releaseId: string): Promise<string> => {
    try {
        const url = `${MB_API_BASE}/release/${releaseId}?fmt=json`;
        const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT } });
        if (!response.ok) return '';
        const data = await response.json();
        return data.barcode || '';
    } catch (e) { return ''; }
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
            const release = rec.releases?.find((r: any) => r.status === 'Official') || rec.releases?.[0];
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
