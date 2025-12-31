
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
    label?: string;
    external_ids?: { upc?: string };
  };
  external_ids: { isrc?: string };
  external_urls: { spotify: string };
  uri: string;
  track_number: number;
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
  external_ids?: { upc?: string };
  album_type: 'album' | 'single' | 'compilation';
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
    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiration = Date.now() + ((data.expires_in - 60) * 1000);
    return accessToken;
  } catch (error) {
    console.error("Spotify Auth Error:", error);
    return null;
  }
};

export const searchSpotifyTracks = async (query: string): Promise<SpotifyTrack[]> => {
  const token = await getSpotifyToken();
  if (!token) return [];
  try {
    // If query is a URL, extract ID
    let finalQuery = query;
    if (query.includes('spotify.com/track/')) {
        finalQuery = query.split('/track/')[1].split('?')[0];
        const res = await fetch(`https://api.spotify.com/v1/tracks/${finalQuery}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return data.id ? [data] : [];
    }

    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(finalQuery)}&type=track&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.tracks?.items || [];
  } catch (error) {
    return [];
  }
};

export const searchSpotifyAlbums = async (query: string): Promise<SpotifyAlbum[]> => {
  const token = await getSpotifyToken();
  if (!token) return [];
  try {
    let finalQuery = query;
    if (query.includes('spotify.com/album/')) {
        finalQuery = query.split('/album/')[1].split('?')[0];
        const res = await fetch(`https://api.spotify.com/v1/albums/${finalQuery}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        return data.id ? [data] : [];
    }

    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(finalQuery)}&type=album&limit=10`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.albums?.items || [];
  } catch (error) {
    return [];
  }
};

export const getFullSpotifyAlbum = async (albumId: string): Promise<SpotifyAlbum | null> => {
  const token = await getSpotifyToken();
  if (!token) return null;
  try {
    const response = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const getSpotifyAlbumTracks = async (albumId: string): Promise<SpotifyTrack[]> => {
  const token = await getSpotifyToken();
  if (!token) return [];
  try {
    const albumRes = await fetch(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const albumData = await albumRes.json();
    const ids = albumData.items.map((t: any) => t.id).join(',');
    const tracksRes = await fetch(`https://api.spotify.com/v1/tracks?ids=${ids}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tracksData = await tracksRes.json();
    return tracksData.tracks || [];
  } catch (error) {
    return [];
  }
};
