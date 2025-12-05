
// MusicBrainz API Service for Willwi
// Artist ID: 526cc0f8-da20-4d2d-86a5-4bf841a6ba3c

const MB_API_BASE = 'https://musicbrainz.org/ws/2';
const WILLWI_MBID = '526cc0f8-da20-4d2d-86a5-4bf841a6ba3c';
const USER_AGENT = 'WillwiMusicManager/1.0 ( will@willwi.com )'; // Required by MB API

export interface MBReleaseGroup {
  id: string;
  title: string;
  'primary-type': string;
  'first-release-date': string;
  score?: number;
}

export interface MBCoverArtResponse {
  images: {
    image: string;
    front: boolean;
  }[];
}

export const getWillwiReleases = async (): Promise<MBReleaseGroup[]> => {
  try {
    // Browse release-groups by artist
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

export const getCoverArtUrl = async (releaseGroupId: string): Promise<string | null> => {
  try {
    // Try to get cover art from Cover Art Archive using Release Group ID
    const url = `https://coverartarchive.org/release-group/${releaseGroupId}`;
    
    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT }
    });

    if (!response.ok) return null;

    const data: MBCoverArtResponse = await response.json();
    const frontImage = data.images.find(img => img.front) || data.images[0];
    
    return frontImage ? frontImage.image : null;
  } catch (e) {
    // Cover art might not exist for all entries
    return null;
  }
};
