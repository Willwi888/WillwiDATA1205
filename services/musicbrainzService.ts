
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

export interface MBTrack {
  id: string;
  title: string;
  position: number;
}

export interface MBCoverArtResponse {
  images: {
    image: string;
    front: boolean;
  }[];
}

export const getWillwiReleases = async (): Promise<MBReleaseGroup[]> => {
  try {
    // Search by Artist Name "Willwi"
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

export const getReleaseGroupTracks = async (releaseGroupId: string): Promise<MBTrack[]> => {
  try {
    // 1. Get releases within this group (include media and recordings)
    const url = `${MB_API_BASE}/release?release-group=${releaseGroupId}&inc=recordings+media&fmt=json`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': USER_AGENT
      }
    });

    if (!response.ok) return [];

    const data = await response.json();
    const releases = data.releases || [];
    
    if (releases.length === 0) return [];

    // 2. Sort by date to try and get the earliest/original release
    releases.sort((a: any, b: any) => {
        const da = a.date || '9999-99-99';
        const db = b.date || '9999-99-99';
        return da.localeCompare(db);
    });

    // 3. Pick the best candidate (first one)
    const targetRelease = releases[0];
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
    
    return tracks;
  } catch (error) {
    console.error("MB Tracks Fetch Error:", error);
    return [];
  }
};

export const getCoverArtUrl = async (releaseGroupId: string): Promise<string | null> => {
  try {
    // Try to get cover art from Cover Art Archive using Release Group ID
    // This usually redirects to the front cover of the "representative" release
    const url = `https://coverartarchive.org/release-group/${releaseGroupId}`;
    
    const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT }
    });

    if (!response.ok) return null;

    const data: MBCoverArtResponse = await response.json();
    // Prioritize image marked as 'front', fallback to first image
    const frontImage = data.images.find(img => img.front) || data.images[0];
    
    return frontImage ? frontImage.image : null;
  } catch (e) {
    return null;
  }
};