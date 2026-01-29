
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Song, ProjectType, ReleaseCategory } from '../types';
import { getArtistAlbums, getArtistTopTracks, getSpotifyAlbumTracks, SpotifyAlbum, SpotifyTrack } from '../services/spotifyService';

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
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between py-6 border-b border-white/10 group text-left">
        <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest group-hover:text-brand-gold transition-colors">
          {title} <span className="text-[10px] text-slate-500 ml-4 font-mono">({songs.length})</span>
        </h3>
        <span className={`text-brand-gold transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </span>
      </button>
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-8 transition-all duration-500 overflow-hidden ${isOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {songs.map(song => {
          const ytId = getYTId(song.youtubeUrl || '');
          if (!ytId) return null;
          return (
            <div key={song.id} className="group flex flex-col space-y-4">
              <div className="aspect-video relative overflow-hidden rounded-sm bg-slate-900 border border-white/5 group-hover:border-brand-gold transition-all">
                <img src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" alt={song.title} />
                <a href={song.youtubeUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-all">
                  <div className="w-16 h-16 bg-brand-gold text-black rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
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
  const [isSpotifyLoading, setIsSpotifyLoading] = useState(true);
  
  // Tracklist State
  const [selectedAlbum, setSelectedAlbum] = useState<SpotifyAlbum | null>(null);
  const [albumTracks, setAlbumTracks] = useState<SpotifyTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  
  // Audio Preview State
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const fetchSpotifyData = async () => {
      setIsSpotifyLoading(true);
      try {
        const albums = await getArtistAlbums(WILLWI_SPOTIFY_ID);
        setSpotifyAlbums(albums);
      } catch (error) { console.error(error); } finally { setIsSpotifyLoading(false); }
    };
    fetchSpotifyData();
  }, []);

  const handleAlbumClick = async (album: SpotifyAlbum) => {
      setSelectedAlbum(album);
      setIsLoadingTracks(true);
      setAlbumTracks([]);
      try {
          const tracks = await getSpotifyAlbumTracks(album.id);
          setAlbumTracks(tracks);
      } catch (e) { console.error(e); } finally { setIsLoadingTracks(false); }
  };

  const togglePreview = (track: SpotifyTrack) => {
      if (previewingTrackId === track.id) {
          previewAudioRef.current?.pause();
          setPreviewingTrackId(null);
      } else {
          if (!track.preview_url) return alert("Spotify 不提供此曲目的預覽音檔");
          if (previewAudioRef.current) previewAudioRef.current.pause();
          
          const audio = new Audio(track.preview_url);
          previewAudioRef.current = audio;
          audio.play();
          setPreviewingTrackId(track.id);
          audio.onended = () => setPreviewingTrackId(null);
      }
  };

  const featuredVideo = useMemo(() => {
    if (globalSettings.exclusiveYoutubeUrl) return getYTId(globalSettings.exclusiveYoutubeUrl);
    const songsWithYT = songs.filter(s => s.youtubeUrl).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    return songsWithYT.length > 0 ? getYTId(songsWithYT[0].youtubeUrl!) : null;
  }, [songs, globalSettings.exclusiveYoutubeUrl]);

  const groupedByProject = useMemo(() => {
    const groups: Record<string, Song[]> = {};
    Object.values(ProjectType).forEach(type => {
      groups[type] = songs.filter(s => s.youtubeUrl && s.projectType === type).sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    });
    return groups;
  }, [songs]);

  return (
    <div className="min-h-screen pt-32 pb-60 px-6 md:px-24 animate-fade-in bg-black overflow-x-hidden">
      <div className="max-w-[1600px] mx-auto">
        
        <div className="mb-20">
          <span className="text-brand-gold font-black text-[11px] uppercase tracking-[0.6em] mb-4 block">Official Channel</span>
          <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">Streaming</h2>
          <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">Displaying all <span className="text-brand-gold">{spotifyAlbums.length}</span> Official Releases</p>
        </div>

        {/* Spotify Discography Grid - Visual matching with screenshot */}
        <div className="mb-24 space-y-12">
            <div className="flex items-center justify-between border-l-2 border-slate-800 pl-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em]">Spotify Artist Profile</h3>
            </div>

            {isSpotifyLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-12 animate-pulse">
                    {[...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-white/5 rounded-sm"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-12">
                    {spotifyAlbums.map(album => {
                        const local = songs.find(s => s.title === album.name);
                        const isEP = local?.releaseCategory === ReleaseCategory.EP;
                        const typeLabel = isEP ? 'EP' : album.album_type?.toUpperCase();
                        
                        return (
                            <div 
                                key={album.id} 
                                onClick={() => handleAlbumClick(album)}
                                className="group cursor-pointer relative"
                            >
                                <div className="aspect-square bg-slate-900 border border-white/5 overflow-hidden shadow-2xl rounded-sm transition-all duration-500 group-hover:border-brand-gold/30">
                                    <img src={album.images?.[0]?.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <span className="text-[10px] text-white font-black uppercase tracking-widest border border-white/20 px-4 py-2">View Tracks</span>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-1">
                                    <h4 className="text-[11px] font-bold text-white uppercase truncate tracking-widest group-hover:text-brand-gold transition-colors">{album.name}</h4>
                                    <p className="text-[9px] font-black text-white uppercase tracking-[0.2em]">{typeLabel}</p>
                                    <p className="text-[8px] text-slate-600 font-mono tracking-widest">{album.release_date.split('-')[0]} • {typeLabel}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Selected Album Tracklist Display (Glassmorphism Overlay) */}
        {selectedAlbum && (
            <div className="mb-24 bg-white/[0.03] border border-white/10 rounded-sm p-10 backdrop-blur-3xl animate-fade-in relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                <button onClick={() => setSelectedAlbum(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-widest z-20 bg-black/50 px-4 py-2 rounded-full border border-white/10">Close</button>
                <div className="flex flex-col xl:flex-row gap-16 items-start">
                    <div className="w-full xl:w-72 space-y-8">
                        <img src={selectedAlbum.images?.[0]?.url} className="w-full aspect-square object-cover shadow-2xl border border-white/10 rounded-sm" alt="" />
                        
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="space-y-1">
                                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Release Company</span>
                                <p className="text-[11px] text-white font-bold uppercase tracking-widest">{selectedAlbum.label || 'WILLWI MUSIC'}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Global Barcode (UPC)</span>
                                <p className="text-[11px] text-brand-gold font-mono font-bold tracking-widest">{selectedAlbum.external_ids?.upc || 'UPC PENDING'}</p>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">Original Date</span>
                                <p className="text-[11px] text-white font-mono opacity-60">{selectedAlbum.release_date}</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full space-y-10">
                        <div>
                            <span className="text-[10px] text-brand-gold font-black uppercase tracking-widest mb-3 block px-3 py-1 bg-brand-gold/10 border border-brand-gold/20 w-fit rounded-sm">
                                {selectedAlbum.album_type?.toUpperCase()}
                            </span>
                            <h3 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none">{selectedAlbum.name}</h3>
                        </div>
                        
                        <div className="w-full bg-black/40 border border-white/5 rounded-sm p-4 md:p-8">
                            {isLoadingTracks ? (
                                <div className="space-y-4 py-20 text-center text-[10px] text-slate-600 animate-pulse uppercase tracking-[0.4em]">Establishing Data Connection...</div>
                            ) : (
                                <div className="space-y-1">
                                    {albumTracks.map((track, idx) => (
                                        <div key={track.id} className="flex flex-col md:flex-row md:items-center justify-between py-4 border-b border-white/5 last:border-0 group hover:bg-white/[0.03] px-4 transition-all">
                                            <div className="flex items-center gap-6">
                                                <span className="text-[10px] text-slate-700 font-mono w-4">{idx + 1}</span>
                                                <div>
                                                    <span className="text-sm text-white font-bold uppercase tracking-widest group-hover:text-brand-gold transition-colors block">{track.name}</span>
                                                    <span className="text-[9px] text-slate-600 font-mono mt-1 block uppercase">ISRC: {track.external_ids?.isrc || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8 mt-4 md:mt-0">
                                                {track.preview_url && (
                                                    <button 
                                                        onClick={() => togglePreview(track)} 
                                                        className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all ${previewingTrackId === track.id ? 'bg-brand-gold text-black border-brand-gold shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'text-slate-500 border-white/10 hover:border-brand-gold hover:text-brand-gold'}`}
                                                    >
                                                        {previewingTrackId === track.id ? 'Playing Preview' : 'Play Preview'}
                                                    </button>
                                                )}
                                                <a href={track.external_urls.spotify} target="_blank" rel="noreferrer" className="text-[10px] text-[#1DB954] font-black uppercase tracking-widest border border-[#1DB954]/20 px-4 py-2 rounded-full hover:bg-[#1DB954] hover:text-black transition-all">Spotify Full</a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {featuredVideo && (
          <div className="mb-24 space-y-10">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] border-l-2 border-brand-gold pl-4">Featured Narrative</h3>
            <div className="aspect-video w-full rounded-sm overflow-hidden shadow-2xl border border-white/5 bg-slate-900">
              <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${featuredVideo}?autoplay=0&rel=0&modestbranding=1`} title="Featured Video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
            </div>
          </div>
        )}

        <div className="space-y-8">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] border-l-2 border-slate-800 pl-4 mb-12">Collections</h3>
          {Object.entries(groupedByProject).map(([type, songs]) => (
            <VideoSection key={type} title={type} songs={songs} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Streaming;
