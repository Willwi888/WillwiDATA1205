import { Song, ReleaseCategory, Language, ProjectType } from "../types";

const CLIENT_ID = 'a64ec262abd745eeaf4db5faf597d19b';
const CLIENT_SECRET = '67657590909b48afbf1fd45e09400b6b';

let accessToken = '';
let tokenExpiration = 0;

export const getSpotifyToken = async () => {
  if (accessToken && Date.now() < tokenExpiration) return accessToken;
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
  } catch (error) { return null; }
};

export const searchSpotifyAlbums = async (query: string) => {
  const token = await getSpotifyToken();
  if (!token) return [];
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  return data.albums?.items || [];
};

// Added getSpotifyAlbum export to resolve import error in AddSong.tsx
export const getSpotifyAlbum = async (albumId: string) => {
  const token = await getSpotifyToken();
  if (!token) return null;
  const res = await fetch(`https://api.spotify.com/v1/albums/${albumId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return await res.json();
};

// Alias for compatibility with AdminDashboard.tsx
export const getSpotifyAlbumTracks = getSpotifyAlbum;

export const searchSpotifyTracks = async (query: string) => {
    const token = await getSpotifyToken();
    if (!token) return [];
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=15`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    return data.tracks?.items || [];
};