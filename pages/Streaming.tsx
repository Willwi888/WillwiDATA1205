
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Song, ProjectType } from '../types';
import { getArtistAlbums, getArtistTopTracks, SpotifyAlbum, SpotifyTrack } from '../services/spotifyService';

const WILLWI_SPOTIFY_ID = '3ascZ8Rb2KDw4QyCy29Om4';

const getYTId = (url: string) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};

const VideoSection: React.FC<{ title: string; songs: Song[] }> = ({ title, songs }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (songs.length === 0) return null;

  return (
    <div className="mb-12">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-6 border-b border-white/10 group text-left"
      >
        <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest group-hover:text-brand-gold transition-colors">
          {title} <span className="text-[10px] text-slate-500 ml-4 font-mono">({songs.length})</span>
        </h3>
        <span className={`text-brand-gold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 transition-all duration-500 overflow-hidden ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {songs.map(song => {
          const ytId = getYTId(song.youtubeUrl || '');
          if (!ytId) return null;
          return (
            <div key={song.id} className="group flex flex-col space-y-4">
              <div className="aspect-video relative overflow-hidden rounded-sm bg-slate-900 border border-white/5 group-hover:border-brand-gold transition-all">
                <img 
                  src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} 
                  className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105"
                  alt={song.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                  }}
                />
                <a 
                  href={song.youtubeUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="w-12 h-12 bg-brand-gold text-black rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </a>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest group-hover:text-brand-gold transition-colors truncate">{song.title}</h4>
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{song.releaseDate}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Streaming: React.FC = () => {
  const { songs, globalSettings } = useData();
  const [spotifyAlbums, setSpotifyAlbums] = useState<SpotifyAlbum[]>([]);
  const [spotifyTopTracks, setSpotifyTopTracks] = useState<SpotifyTrack[]>([]);
  const [isSpotifyLoading, setIsSpotifyLoading] = useState(true);

  useEffect(() => {
    const fetchSpotifyData = async () => {
      setIsSpotifyLoading(true);
      try {
        const [albums, topTracks] = await Promise.all([
          getArtistAlbums(WILLWI_SPOTIFY_ID),
          getArtistTopTracks(WILLWI_SPOTIFY_ID)
        ]);
        setSpotifyAlbums(albums);
        setSpotifyTopTracks(topTracks);
      } catch (error) {
        console.error("Error fetching Spotify data", error);
      } finally {
        setIsSpotifyLoading(false);
      }
    };
    fetchSpotifyData();
  }, []);

  const featuredVideo = useMemo(() => {
    if (globalSettings.exclusiveYoutubeUrl) {
      return getYTId(globalSettings.exclusiveYoutubeUrl);
    }
    const songsWithYT = songs.filter(s => s.youtubeUrl).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    return songsWithYT.length > 0 ? getYTId(songsWithYT[0].youtubeUrl!) : null;
  }, [songs, globalSettings.exclusiveYoutubeUrl]);

  const groupedByProject = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    Object.values(ProjectType).forEach(type => {
      groups[type] = songs.filter(s => s.youtubeUrl && s.projectType === type)
                          .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    });
    return groups;
  }, [songs]);

  return (
    <div className="min-h-screen pt-32 pb-60 px-6 md:px-24 animate-fade-in bg-black overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Page Header */}
        <div className="mb-20 text-center md:text-left">
          <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.6em] mb-4 block">Official Channel</span>
          <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">Streaming</h2>
        </div>

        {/* Spotify Section */}
        <div className="mb-24 space-y-12">
            <div className="flex items-center justify-between border-l-2 border-[#1DB954] pl-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em]">Spotify Presence</h3>
                <a 
                    href={`https://open.spotify.com/artist/${WILLWI_SPOTIFY_ID}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] font-black text-[#1DB954] hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2"
                >
                    Official Profile <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.494 17.306c-.215.353-.673.464-1.027.249-2.85-1.741-6.439-2.134-10.665-1.168-.405.093-.811-.16-.904-.565-.093-.404.16-.811.565-.904 4.634-1.06 8.59-.61 11.782 1.339.354.215.465.673.249 1.027zm1.464-3.26c-.271.44-.847.579-1.287.308-3.262-2.004-8.235-2.586-12.093-1.414-.495.15-1.023-.129-1.173-.624-.15-.495.129-1.023.624-1.173 4.414-1.34 9.904-.683 13.621 1.595.44.27.579.847.308 1.287zm.126-3.41c-3.913-2.324-10.366-2.538-14.128-1.396-.6.182-1.23-.16-1.412-.76-.182-.6.16-1.23.76-1.412 4.316-1.31 11.439-1.056 15.952 1.623.54.32.716 1.014.396 1.554-.32.54-1.014.716-1.554.396z"/></svg>
                </a>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-5 space-y-8">
                    <div className="bg-slate-900/40 border border-white/5 rounded-xl overflow-hidden shadow-2xl p-2 backdrop-blur-md">
                        <iframe 
                            src={`https://open.spotify.com/embed/artist/${WILLWI_SPOTIFY_ID}?utm_source=generator&theme=0`} 
                            width="100%" 
                            height="380" 
                            frameBorder="0" 
                            allowFullScreen 
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                            loading="lazy"
                        ></iframe>
                    </div>
                </div>

                <div className="lg:col-span-7 space-y-10">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6 border-b border-white/5 pb-2">Latest on Spotify</h4>
                    {isSpotifyLoading ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 animate-pulse">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="space-y-3">
                                    <div className="aspect-square bg-white/5 rounded"></div>
                                    <div className="h-2 bg-white/5 w-3/4"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            {spotifyAlbums.slice(0, 8).map(album => (
                                <a 
                                    key={album.id} 
                                    href={album.external_urls.spotify} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="group flex flex-col gap-3"
                                >
                                    <div className="aspect-square relative overflow-hidden rounded-sm border border-white/10 group-hover:border-[#1DB954] transition-all">
                                        <img 
                                            src={album.images?.[0]?.url} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                            alt={album.name} 
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <div className="w-8 h-8 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg">
                                                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="text-[10px] font-bold text-white uppercase truncate tracking-widest group-hover:text-[#1DB954] transition-colors">{album.name}</h5>
                                        <p className="text-[8px] text-slate-500 font-mono mt-1">{album.release_date.split('-')[0]}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* YouTube Featured Content */}
        {featuredVideo && (
          <div className="mb-24 space-y-10">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] border-l-2 border-brand-gold pl-4">Featured Narrative</h3>
            <div className="aspect-video w-full rounded-sm overflow-hidden shadow-2xl border border-white/5 bg-slate-900">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${featuredVideo}?autoplay=0&rel=0&modestbranding=1`}
                title="Featured Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        {/* Organized Playlists (Collapsible Sections) */}
        <div className="space-y-8">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] border-l-2 border-brand-accent pl-4 mb-12">Collections</h3>
          {Object.entries(groupedByProject).map(([type, songs]) => (
            <VideoSection key={type} title={type} songs={songs} />
          ))}
        </div>

      </div>
    </div>
  );
};

export default Streaming;
