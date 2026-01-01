
import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useData, ASSETS } from '../context/DataContext';
import { Song, ProjectType } from '../types';

const Streaming: React.FC = () => {
  const { t } = useTranslation();
  const { songs } = useData();
  const [expandedPlaylists, setExpandedPlaylists] = useState<Record<string, boolean>>({});

  const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        let u = new URL(url.trim());
        if (u.hostname.includes('dropbox.com')) {
            u.hostname = 'dl.dropboxusercontent.com';
            u.searchParams.set('raw', '1');
            u.searchParams.delete('dl');
            return u.toString();
        }
        if (u.hostname.includes('drive.google.com') && u.pathname.includes('/file/d/')) {
            const id = u.pathname.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) { return url; }
  };

  // Filter and sort exclusive content (YouTube or Direct Video)
  const exclusiveVideos = useMemo(() => {
    return songs
      .filter(s => s.isOfficialExclusive && (s.youtubeUrl || s.videoUrl))
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
        <div className="lg:col-span-8 space-y-20">
          {/* Featured Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-4 border-b border-white/10 pb-4">
              <span className="w-2 h-2 bg-brand-gold rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.8)]"></span>
              <h3 className="text-xl font-black text-white uppercase tracking-widest">Featured Spotlight</h3>
            </div>
            {featuredVideo ? (
              <div className="relative group bg-slate-900 border border-brand-gold/20 overflow-hidden rounded-2xl shadow-2xl">
                <div className="aspect-video relative overflow-hidden bg-black">
                  {featuredVideo.videoUrl ? (
                    <video 
                      src={convertToDirectStream(featuredVideo.videoUrl)} 
                      controls 
                      className="w-full h-full object-contain" 
                      poster={ASSETS.willwiPortrait}
                    />
                  ) : (
                    <iframe 
                      width="100%" height="100%" 
                      src={`https://www.youtube.com/embed/${getEmbedId(featuredVideo.youtubeUrl!)}?rel=0&modestbranding=1`} 
                      title={featuredVideo.title}
                      frameBorder="0" 
                      allowFullScreen
                      className="opacity-95"
                    ></iframe>
                  )}
                </div>
                <div className="p-8 bg-black/60 backdrop-blur-xl">
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="flex-grow">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] bg-brand-gold text-black font-black px-2 py-0.5 rounded uppercase tracking-widest">Latest</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{featuredVideo.projectType}</span>
                        {featuredVideo.videoUrl && <span className="text-[9px] bg-brand-accent text-black font-black px-2 py-0.5 rounded uppercase tracking-widest">Direct File</span>}
                      </div>
                      <h4 className="text-3xl font-black text-white uppercase mb-2 text-shadow-gold">{featuredVideo.title}</h4>
                      <p className="text-slate-400 text-sm font-light line-clamp-2">{featuredVideo.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>

          {/* Collapsible Playlists */}
          <div className="space-y-10">
            {projectPlaylists.map(([projectName, videos]) => {
              const isExpanded = expandedPlaylists[projectName];
              return (
                <section key={projectName} className="bg-slate-900/20 border border-white/5 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => togglePlaylist(projectName)}
                    className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isExpanded ? 'bg-brand-gold border-brand-gold text-black' : 'bg-slate-800 border-white/10 text-slate-400'}`}>
                         <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                         </svg>
                      </div>
                      <h3 className={`text-xl font-black uppercase tracking-[0.2em] ${isExpanded ? 'text-brand-gold' : 'text-white'}`}>{projectName}</h3>
                    </div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{videos.length} VIDEOS</span>
                  </button>

                  {isExpanded && (
                    <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                      {videos.map(video => (
                        <div key={video.id} className="group bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden hover:border-brand-accent/30 transition-all">
                          <div className="aspect-video relative overflow-hidden bg-black">
                            {video.videoUrl ? (
                              <div className="w-full h-full relative group/vid">
                                <video src={convertToDirectStream(video.videoUrl)} className="w-full h-full object-cover opacity-60" poster={ASSETS.willwiPortrait} />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                   <div className="px-4 py-2 border border-white text-white text-[10px] font-black uppercase tracking-widest cursor-pointer" onClick={() => window.open(`/song/${video.id}`, '_self')}>Go to Cinema</div>
                                </div>
                              </div>
                            ) : (
                              <>
                                <img 
                                  src={`https://img.youtube.com/vi/${getEmbedId(video.youtubeUrl!)}/hqdefault.jpg`} 
                                  className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all"
                                  alt={video.title}
                                />
                                <a href={video.youtubeUrl} target="_blank" rel="noreferrer" className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                   <div className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-2xl">
                                     <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                   </div>
                                </a>
                              </>
                            )}
                          </div>
                          <div className="p-4">
                            <h5 className="text-white font-bold text-xs uppercase truncate mb-1">{video.title}</h5>
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{video.releaseDate}</span>
                              {video.videoUrl && <span className="text-[8px] border border-brand-accent/50 text-brand-accent px-1 rounded font-bold uppercase">Direct File</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {/* Sidebar: Spotify */}
        <div className="lg:col-span-4 space-y-12 lg:sticky lg:top-24">
          <div className="bg-slate-900/50 rounded-3xl overflow-hidden shadow-2xl border border-white/5 p-4">
              <iframe 
                src="https://open.spotify.com/embed/artist/3ascZ8Rb2KDw4QyCy29Om4?utm_source=generator&theme=0" 
                width="100%" height="500" frameBorder="0" allowFullScreen loading="lazy"
                className="rounded-xl"
              ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Streaming;
