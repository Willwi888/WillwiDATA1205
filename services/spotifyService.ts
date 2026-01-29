
import { Song } from "../types";

const CLIENT_ID = 'a64ec262abd745eeaf4db5faf597d19b';
const CLIENT_SECRET = '67657590909b48afbf1fd45e09400b6b';

let accessToken = '';
let tokenExpiration = 0;

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    id: string;
    name: string;
    release_date: string;
    images: { url: string }[];
    external_ids?: { upc?: string; ean?: string };
    label?: string;
  };
  external_ids: { isrc?: string };
  external_urls: { spotify: string };
  uri: string;
  track_number?: number;
  duration_ms?: number;
  preview_url?: string | null;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  release_date: string;
  total_tracks: number;
  images: { url: string }[];
  external_urls: { spotify: string };
  label?: string;
  external_ids?: { upc?: string; ean?: string };
  album_type?: 'album' | 'single' | 'compilation';
}

export const getSpotifyToken = async () => {
  if (accessToken && Date.now() < tokenExpiration) {
    return accessToken;
  }

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) throw new Error(`Token fetch failed: ${response.statusText}`);

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiration = Date.now() + ((data.expires_in - 60) * 1000);
    return accessToken;
  } catch (error) {
    console.error("Spotify Auth Error:", error);
    return null;
  }
};

export const searchSpotify = async (query: string, type: 'track' | 'album' | 'track,album' = 'track,album'): Promise<{ tracks: SpotifyTrack[], albums: SpotifyAlbum[] }> => {
  const token = await getSpotifyToken();
  if (!token) return { tracks: [], albums: [] };

  try {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=20`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) return { tracks: [], albums: [] };
    const data = await response.json();
    return {
        tracks: data.tracks?.items || [],
        albums: data.albums?.items || []
    };
  } catch (error) {
    return { tracks: [], albums: [] };
  }
};

export const getArtistAlbums = async (artistId: string): Promise<SpotifyAlbum[]> => {
  const token = await getSpotifyToken();
  if (!token) return [];

  try {
    // 提升限制至 50，盡可能顯示所有 79 首作品中的大部分專輯/單曲
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?limit=50&include_groups=album,single`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    return [];
  }
};

export const getSpotifyAlbum = async (albumId: string): Promise<SpotifyAlbum | null> => {
  const token = await getSpotifyToken();
  if (!token) return null;

  try {
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const getSpotifyFullTracks = async (trackIds: string[]): Promise<SpotifyTrack[]> => {
    const token = await getSpotifyToken();
    if (!token || trackIds.length === 0) return [];

    try {
        const response = await fetch(`https://api.spotify.com/v1/tracks?ids=${trackIds.join(',')}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.tracks || [];
    } catch (error) {
        return [];
    }
};

export const getSpotifyAlbumTracks = async (albumId: string): Promise<SpotifyTrack[]> => {
    const token = await getSpotifyToken();
    if (!token) return [];

    try {
        const albumData = await getSpotifyAlbum(albumId);
        if (!albumData) return [];

        const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return [];
        const data = await response.json();
        
        // Fetch full track info for ISRCs
        const trackIds = data.items.map((t: any) => t.id);
        const fullTracks = await getSpotifyFullTracks(trackIds);
        
        return fullTracks.map((t) => ({
            ...t,
            album: albumData
        }));
    } catch (error) {
        return [];
    }
};

// Existing compatibility
export const searchSpotifyTracks = async (query: string) => {
    const res = await searchSpotify(query, 'track');
    return res.tracks;
};

export const getArtistTopTracks = async (artistId: string): Promise<SpotifyTrack[]> => {
    const token = await getSpotifyToken();
    if (!token) return [];

    try {
        const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=TW`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.tracks || [];
    } catch (error) {
        return [];
    }
};
