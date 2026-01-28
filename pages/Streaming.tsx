
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Song, ProjectType } from '../types';

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

        {/* Featured Content */}
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
