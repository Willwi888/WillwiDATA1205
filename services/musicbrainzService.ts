import { ReleaseCategory } from '../types';

// MusicBrainz API Service for Willwi
// Targeted Artist UUID: 526cc0f8-da20-4d2d-86a5-4bf841a6ba3c

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

export interface MBTrack {
  id: string;
  title: string;
  position: number;
}

export interface MBImportData {
  tracks: MBTrack[];
  releaseDate: string;
  releaseCompany: string;
  category: ReleaseCategory;
}

export const mapMBTypeToCategory = (type: string): ReleaseCategory => {
  if (type === 'EP') return ReleaseCategory.EP;
  if (type === 'Single') return ReleaseCategory.Single;
  return ReleaseCategory.Album; 
};

export const getWillwiReleases = async (): Promise<MBReleaseGroup[]> => {
  try {
    // Search strictly by Artist UUID
    const url = `${MB_API_BASE}/release-group?artist=${WILLWI_MBID}&fmt=json&limit=100`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) {
        console.error(`MusicBrainz API Error: ${response.status}`);
        return [];
    }

    const data = await response.json();
    return data['release-groups'] || [];

  } catch (error) {
    console.error("MusicBrainz Network Error:", error);
    return [];
  }
};

export const getReleaseGroupDetails = async (releaseGroupId: string, primaryType: string): Promise<MBImportData | null> => {
  try {
    const url = `${MB_API_BASE}/release?release-group=${releaseGroupId}&inc=recordings+media+labels&fmt=json&limit=50`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const releases = data.releases || [];
    
    if (releases.length === 0) return null;

    // Sort by date to get original release
    releases.sort((a: any, b: any) => {
        const da = a.date || '9999-99-99';
        const db = b.date || '9999-99-99';
        return da.localeCompare(db);
    });

    // Fallback: find release with tracks
    const targetRelease = releases.find((r: any) => r.media && r.media.length > 0 && r.media[0].tracks && r.media[0].tracks.length > 0) || releases[0];

    if (!targetRelease) return null;

    const tracks: MBTrack[] = [];
    if (targetRelease.media) {
        targetRelease.media.forEach((medium: any) => {
            if (medium.tracks) {
                medium.tracks.forEach((t: any) => {
                    tracks.push({
                        id: t.recording?.id || t.id,
                        title: t.title,
                        position: t.position
                    });
                });
            }
        });
    }

    const label = targetRelease['label-info']?.[0]?.label?.name || '';
    
    return {
        tracks,
        releaseDate: targetRelease.date || '',
        releaseCompany: label,
        category: mapMBTypeToCategory(primaryType)
    };

  } catch (error) {
    console.error("MB Tracks Fetch Error:", error);
    return null;
  }
};

export const getCoverArtUrl = async (releaseGroupId: string): Promise<string | null> => {
  try {
    const url = `https://coverartarchive.org/release-group/${releaseGroupId}`;
    const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!response.ok) return null;
    const data = await response.json();
    const frontImage = data.images.find((img: any) => img.front) || data.images[0];
    return frontImage ? frontImage.image : null;
  } catch (e) {
    return null;
  }
};