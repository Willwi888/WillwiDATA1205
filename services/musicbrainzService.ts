
// MusicBrainz API Service for Willwi

const MB_API_BASE = 'https://musicbrainz.org/ws/2';
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
    // Instead of hardcoding an ID that might be invalid, we search by Artist Name "Willwi".
    // This returns matching release-groups for any artist named Willwi.
    // Lucene search syntax: artist:Willwi
    const query = encodeURIComponent('artist:Willwi');
    const url = `${MB_API_BASE}/release-group?query=${query}&fmt=json&limit=50`;
    
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