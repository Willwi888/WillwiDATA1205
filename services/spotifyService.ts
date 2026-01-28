
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
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}/albums?limit=10&include_groups=album,single`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    return [];
  }
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

// 保持舊版相容性
export const searchSpotifyTracks = async (query: string) => {
    const res = await searchSpotify(query, 'track');
    return res.tracks;
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

export const getSpotifyAlbumTracks = async (albumId: string): Promise<SpotifyTrack[]> => {
    const token = await getSpotifyToken();
    if (!token) return [];

    try {
        // 獲取專輯詳細資料以獲取 UPC/Label
        const albumData = await getSpotifyAlbum(albumId);
        if (!albumData) return [];

        // 獲取專輯內的所有曲目
        const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return [];
        const data = await response.json();
        
        return data.items.map((t: any) => ({
            ...t,
            album: albumData,
            external_ids: { isrc: '' } 
        }));
    } catch (error) {
        return [];
    }
};
