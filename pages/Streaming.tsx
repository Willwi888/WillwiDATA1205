
import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useData } from '../context/DataContext';
import { Song, ProjectType } from '../types';

const Streaming: React.FC = () => {
  const { t } = useTranslation();
  const { songs } = useData();
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({});

  // Filter and sort exclusive content
  const exclusiveVideos = useMemo(() => {
    return songs
      .filter(s => s.isOfficialExclusive && s.youtubeUrl)
      .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
  }, [songs]);

  const featuredVideo = exclusiveVideos.length > 0 ? exclusiveVideos[0] : null;

  // Organize remaining videos into "Playlists" based on Project Type
  const projectPlaylists = useMemo(() => {
    const playlists: Record<string, Song[]> = {};
    exclusiveVideos.slice(1).forEach(video => {
      const project = video.projectType || 'Other Works';
      if (!playlists[project]) playlists[project] = [];
      playlists[project].push(video);
    });
    return Object.entries(playlists);
  }, [exclusiveVideos]);

  // Expand the first playlist by default
  useEffect(() => {
    if (projectPlaylists.length > 0) {
      const firstProjectName = projectPlaylists[0][0];
      setExpandedPlaylists({ [firstProjectName]: true });
    }
  }, [projectPlaylists.length]);

  const togglePlaylist = (name: string) => {
    setExpandedPlaylists(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const getEmbedId = (url: string) => {
    try {
      const u = new URL(url.trim());
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
      return null;
    } catch (e) { return null; }
  };

  return (
    <div className="animate-fade-in max-w-7xl mx-auto px-6 pt-12 pb-40">
      {/* Page Header */}
      <div className="mb-20 text-center relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-brand-gold/5 blur-3xl rounded-full"></div>
        <h2 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase mb-4 text-gold-glow relative z-10">
          {t('streaming_title')}
        </h2>
        <p className="text-slate-600 text-[10px] font-bold tracking-[1em] uppercase relative z-10">
          OFFICIAL CHANNELS • STREAMING HUB
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left: YouTube Vault / Playlists */}
        <div className="lg:col-span-8 space-y-20">
          
          {/* Section 1: Featured Spotlight */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 border-b border-white/10 pb-4">
              <span className="w-2 h-2 bg-brand-gold rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]"></span>
              <h3 className="text-xl font-black text-white uppercase tracking-widest">Featured Spotlight</h3>
            </div>

            {featuredVideo ? (
              <div className="relative group bg-slate-900 border border-brand-gold/20 overflow-hidden rounded-2xl shadow-2xl transition-all duration-700 hover:border-brand-gold/40">
                <div className="aspect-video relative overflow-hidden bg-black">
                  <iframe 
                    width="100%" height="100%" 
                    src={`https://www.youtube.com/embed/${getEmbedId(featuredVideo.youtubeUrl!)}?rel=0&modestbranding=1&autoplay=0`} 
                    title={featuredVideo.title}
                    frameBorder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="opacity-95 group-hover:opacity-100 transition-opacity"
                  ></iframe>
                </div>
                
                <div className="p-8 bg-black/60 backdrop-blur-xl border-t border-white/5">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] bg-brand-gold text-black font-black px-2 py-0.5 rounded uppercase tracking-widest">Latest Drop</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{featuredVideo.projectType}</span>
                      </div>
                      <h4 className="text-3xl font-black text-white uppercase mb-2 group-hover:text-brand-gold transition-colors">{featuredVideo.title}</h4>
                      <p className="text-slate-400 text-sm font-light leading-relaxed line-clamp-2 max-w-3xl">{featuredVideo.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-24 bg-slate-900/20 border-2 border-slate-800/50 border-dashed rounded-3xl text-center flex flex-col items-center justify-center">
                  <p className="text-xs text-slate-500 font-black uppercase tracking-[0.4em]">No exclusive vault content found.</p>
              </div>
            )}
          </section>

          {/* Section 2: Collapsible Project Playlists */}
          {projectPlaylists.length > 0 ? (
            <div className="space-y-10">
              {projectPlaylists.map(([projectName, videos]) => {
                const isExpanded = expandedPlaylists[projectName];
                return (
                  <section key={projectName} className="bg-slate-900/20 border border-white/5 rounded-2xl overflow-hidden transition-all duration-300">
                    <button 
                      onClick={() => togglePlaylist(projectName)}
                      className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all group"
                    >
                      <div className="flex items-center gap-6">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-500 ${isExpanded ? 'bg-brand-gold border-brand-gold text-black' : 'bg-slate-800 border-white/10 text-slate-400'}`}>
                           <svg className={`w-4 h-4 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                           </svg>
                        </div>
                        <div className="text-left">
                          <h3 className={`text-xl font-black uppercase tracking-[0.2em] transition-colors ${isExpanded ? 'text-brand-gold' : 'text-white'}`}>
                            {projectName}
                          </h3>
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{videos.length} VIDEOS IN VAULT</span>
                        </div>
                      </div>
                      <div className="hidden sm:block h-px flex-grow mx-8 bg-gradient-to-r from-white/10 to-transparent"></div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-white transition-colors">
                        {isExpanded ? 'COLLAPSE' : 'EXPAND'}
                      </span>
                    </button>

                    <div className={`transition-all duration-500 overflow-hidden ${isExpanded ? 'max-h-[2000px] opacity-100 p-6 pt-0' : 'max-h-0 opacity-0'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/5 pt-8">
                        {videos.map(video => (
                          <div key={video.id} className="group bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden hover:border-brand-accent/30 transition-all duration-500 hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
                            <div className="aspect-video relative overflow-hidden bg-black">
                              <img 
                                src={`https://img.youtube.com/vi/${getEmbedId(video.youtubeUrl!)}/maxresdefault.jpg`} 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700"
                                alt={video.title}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <a 
                                    href={video.youtubeUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
                                 >
                                   <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                 </a>
                              </div>
                              <div className="absolute bottom-3 right-3 bg-black/80 px-2 py-1 rounded text-[8px] font-mono text-white tracking-widest border border-white/10 uppercase">
                                 {video.releaseCategory || 'Video'}
                              </div>
                            </div>
                            <div className="p-5 border-t border-white/5">
                              <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-1 group-hover:text-brand-accent transition-colors truncate">{video.title}</h5>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">{video.releaseDate}</span>
                                <span className="text-[8px] text-brand-accent font-black uppercase tracking-tighter">Official Release</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Right: Spotify Artist Hub (Keep as fixed sidebar) */}
        <div className="lg:col-span-4 space-y-12 lg:sticky lg:top-24">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-6">
            <div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tight">Spotify Hub</h3>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-2">Verified Artist</p>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-3xl overflow-hidden shadow-2xl border border-white/5 p-4 group transition-all duration-700 hover:border-emerald-500/30">
            <div className="bg-black/80 p-2 rounded-2xl shadow-inner">
                <iframe 
                src="https://open.spotify.com/embed/artist/3ascZ8Rb2KDw4QyCy29Om4?utm_source=generator&theme=0" 
                width="100%" 
                height="600" 
                frameBorder="0" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy"
                className="rounded-xl transition-all duration-1000"
                ></iframe>
            </div>
            <div className="mt-4 px-4 flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Now Streaming On</span>
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Willwi 陳威兒</span>
                </div>
                <div className="flex gap-1.5">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-75 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse delay-150 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                </div>
            </div>
          </div>

          {/* Additional Social Links / Secondary Discovery */}
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Quick Links</h4>
            <div className="grid grid-cols-1 gap-2">
              <a href="https://www.youtube.com/@Willwi888" target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-black/40 hover:bg-red-600 transition-all rounded-lg group">
                <span className="text-[10px] font-bold uppercase text-white">YouTube Channel</span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
              </a>
              <a href="https://willwi.com" target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 bg-black/40 hover:bg-brand-accent transition-all rounded-lg group">
                <span className="text-[10px] font-bold uppercase text-white">Official Website</span>
                <svg className="w-4 h-4 text-slate-500 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Streaming;
