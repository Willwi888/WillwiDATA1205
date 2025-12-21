import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, getLanguageColor } from '../types';
import { generateMusicCritique } from '../services/geminiService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

// SMART LINK CONVERTER (Duplicated logic for detail view safety)
const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        // Google Drive
        if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            const id = url.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        // Dropbox
        if (url.includes('dropbox.com')) {
            return url.replace('dl=0', 'raw=1');
        }
        return url;
    } catch (e) { return url; }
};

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSong, updateSong, deleteSong } = useData(); 
  const { isAdmin } = useUser(); 
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [aiReview, setAiReview] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) { setSong(found); setEditForm(found); }
    }
  }, [id, getSong]);

  if (!song) return null;

  // Helper to extract Spotify ID for embedding
  const getSpotifyEmbedId = (link?: string, id?: string) => {
      if (id) return id;
      if (!link) return null;
      try {
          const url = new URL(link);
          const parts = url.pathname.split('/');
          const trackIndex = parts.indexOf('track');
          if (trackIndex !== -1 && parts[trackIndex + 1]) {
              return parts[trackIndex + 1];
          }
      } catch (e) { return null; }
      return null;
  };

  const handleSave = async () => {
    if (song && id) {
      setIsSaving(true);
      // Auto-convert Google Drive/Dropbox links one last time before saving
      const finalForm = { ...editForm };
      if (finalForm.audioUrl) {
          finalForm.audioUrl = convertToDirectStream(finalForm.audioUrl);
      }
      
      if (await updateSong(id, finalForm)) { 
          setSong({ ...song, ...finalForm } as Song); 
          setIsEditing(false); 
      }
      setIsSaving(false);
    }
  };

  const handleAiGenerate = async () => {
    setLoadingAi(true);
    setAiReview(await generateMusicCritique(song));
    setLoadingAi(false);
  };

  const handleStartInteractive = () => {
      if (!song.isInteractiveActive) return;
      navigate('/interactive', { state: { targetSongId: song.id } });
  };

  const spotifyEmbedId = getSpotifyEmbedId(song.spotifyLink, song.spotifyId);

  return (
    <div className="animate-fade pb-32 max-w-7xl mx-auto px-6">
        <div className="mb-6"><Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest">← Back to Catalog</Link></div>
        
        <div className="bg-slate-900 border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 blur-2xl" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="relative z-10 p-10 flex flex-col md:flex-row gap-12 items-start">
                <div className="w-full md:w-80 flex-shrink-0">
                     <img src={isEditing ? editForm.coverUrl : song.coverUrl} className="w-full aspect-square object-cover shadow-2xl border border-white/10" alt="cover" />
                     {isAdmin && isEditing && (
                         <div className="mt-4 space-y-2">
                            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white/10 text-white font-bold py-3 text-[10px] uppercase tracking-widest border border-white/10">Upload Image</button>
                            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) { const r = new FileReader(); r.onloadend = () => setEditForm(p => ({ ...p, coverUrl: r.result as string })); r.readAsDataURL(file); }
                            }} />
                            <input className="w-full bg-black border border-white/10 p-2 text-[10px] text-white font-mono" value={editForm.coverUrl} onChange={e => setEditForm({...editForm, coverUrl: e.target.value})} placeholder="IMAGE URL" />
                         </div>
                     )}
                </div>
                
                <div className="flex-grow w-full">
                    <div className="flex justify-between items-start">
                        <div className="w-full">
                            {isAdmin && isEditing ? (
                                <input className="text-5xl font-black text-white bg-black border border-white/10 px-4 py-2 w-full uppercase tracking-tighter" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                            ) : (
                                <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4 leading-none">{song.title}</h1>
                            )}
                            <div className="flex items-center gap-4 mt-6">
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white ${getLanguageColor(song.language)}`}>{song.language}</span>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">{song.releaseDate}</span>
                            </div>

                            {/* USER ACTIONS: INTERACTIVE BUTTON */}
                            <div className="mt-10 flex flex-col gap-4 max-w-sm">
                                {song.isInteractiveActive ? (
                                    <button 
                                        onClick={handleStartInteractive}
                                        className="w-full py-4 bg-brand-gold text-slate-900 font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all shadow-lg animate-pulse"
                                    >
                                        進入互動實驗室 (Start Session)
                                    </button>
                                ) : (
                                    <div className="w-full py-4 border border-white/10 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center bg-black/20">
                                        互動製作尚未開放 (Closed)
                                    </div>
                                )}
                                
                                {/* OFFICIAL STREAMING LINKS (Spotify Player & Buttons) */}
                                <div className="grid grid-cols-1 gap-3 mt-2">
                                    {/* Spotify Embed Player - Restored for Owner Verification */}
                                    {spotifyEmbedId && !isEditing && (
                                        <div className="w-full rounded overflow-hidden shadow-lg border border-[#1DB954]/30">
                                            <iframe 
                                                src={`https://open.spotify.com/embed/track/${spotifyEmbedId}?utm_source=generator&theme=0`} 
                                                width="100%" 
                                                height="80" 
                                                frameBorder="0" 
                                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                                loading="lazy"
                                                title="Spotify Player"
                                                className="bg-[#282828]"
                                            ></iframe>
                                        </div>
                                    )}

                                    {song.spotifyLink && !isEditing && (
                                        <a 
                                            href={song.spotifyLink}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-[#1DB954] text-black font-black uppercase tracking-[0.2em] text-xs transition-all text-center flex items-center justify-center gap-2 hover:brightness-110"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.299z"/></svg>
                                            <span>Open in App</span>
                                        </a>
                                    )}
                                    
                                    {song.youtubeUrl && !isEditing && (
                                        <a 
                                            href={song.youtubeUrl}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-[#FF0000] text-white font-black uppercase tracking-[0.2em] text-xs transition-all text-center flex items-center justify-center gap-2 hover:brightness-110"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                                            <span>Watch on YouTube</span>
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* ADMIN CONTROL PANEL */}
                            {isAdmin && !isEditing && (
                                <div className="mt-8 w-full max-w-md bg-black/40 border border-white/10 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse"></div>
                                        <p className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Admin Control Panel</p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-white uppercase tracking-widest">Interactive Status</span>
                                            <button 
                                                onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })}
                                                className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded transition-all ${song.isInteractiveActive ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-slate-400'}`}
                                            >
                                                {song.isInteractiveActive ? 'Active (ON)' : 'Inactive (OFF)'}
                                            </button>
                                        </div>

                                        {song.audioUrl ? (
                                            <div>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Raw Source Audio (Video Gen)</p>
                                                <audio controls src={song.audioUrl} className="w-full h-8 block rounded bg-slate-800" />
                                                <p className="text-[8px] text-slate-600 mt-1">* 僅供互動影片生成使用 (Private)</p>
                                            </div>
                                        ) : (
                                            <div className="bg-red-900/20 border border-red-900/50 p-3">
                                                <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest">MISSING RAW AUDIO</p>
                                                <p className="text-[9px] text-slate-400 mt-1">無法啟用互動功能。請填入 Dropbox 連結。</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isEditing && (
                                <div className="mt-6 space-y-4 bg-slate-800/50 p-4 border border-white/10">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">Audio Source URL (For Video Gen)</label>
                                        <input 
                                            className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono focus:border-brand-gold outline-none" 
                                            value={editForm.audioUrl || ''} 
                                            onChange={e => {
                                                // Instant Convert on input
                                                const val = e.target.value;
                                                const converted = convertToDirectStream(val);
                                                setEditForm({...editForm, audioUrl: converted});
                                            }} 
                                            placeholder="Paste Dropbox or Google Drive Share Link here..." 
                                        />
                                        <p className="text-[9px] text-slate-400">
                                            * 用途：此為「互動實驗室」生成 MP4 影片專用 (Private Use Only)。<br/>
                                            * 支援 Dropbox/Google Drive 分享連結。
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Spotify Link (Embedding)</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.spotifyLink || ''} onChange={e => setEditForm({...editForm, spotifyLink: e.target.value})} placeholder="https://open.spotify.com/..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">YouTube URL</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.youtubeUrl || ''} onChange={e => setEditForm({...editForm, youtubeUrl: e.target.value})} placeholder="https://youtube.com/..." />
                                    </div>
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="flex flex-col gap-3">
                                {isEditing ? (
                                    <>
                                        <button onClick={handleSave} className="px-6 py-3 bg-brand-accent text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg">Save Changes</button>
                                        <button onClick={() => setIsEditing(false)} className="px-6 py-3 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest">Cancel</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => setIsEditing(true)} className="px-6 py-3 border border-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">Edit Data</button>
                                        <button onClick={() => deleteSong(id!).then(() => navigate('/database'))} className="px-6 py-3 border border-red-900/30 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Remove</button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {isAdmin && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-white/5">
                            {['isrc', 'upc', 'spotifyId', 'releaseCompany'].map(field => (
                                <div key={field}>
                                    <span className="text-[9px] text-slate-600 uppercase tracking-[0.4em] block mb-2">{field}</span>
                                    <span className="font-mono text-[11px] text-slate-400 uppercase">{(song as any)[field] || 'UNDEFINED'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
            <div className="lg:col-span-2 space-y-12">
                <div className="bg-slate-900/50 p-10 border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Context & Story</h3>
                        {/* AI Button - Strictly Admin Only */}
                        {isAdmin && (
                            <button onClick={handleAiGenerate} disabled={loadingAi} className="text-[9px] border border-brand-accent/30 text-brand-accent px-4 py-2 uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all">
                                {loadingAi ? "Analyzing..." : "Generate AI Analysis (Admin)"}
                            </button>
                        )}
                    </div>
                    <div className="text-slate-400 text-sm font-light leading-relaxed whitespace-pre-line tracking-wide">
                        {song.description || "Historical data not available."}
                    </div>
                    {/* Only show AI review if it exists (Admin generated) */}
                    {aiReview && <div className="mt-8 p-6 bg-white/5 border-l-2 border-brand-gold text-xs text-slate-300 leading-loose italic">{aiReview}</div>}
                </div>
                <div className="bg-slate-900/50 p-10 border border-white/5">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8">Lyric Archive</h3>
                    <div className="font-mono text-xs text-slate-500 whitespace-pre-line leading-loose tracking-[0.1em] border-l border-white/5 pl-8">{song.lyrics || "No transcripts found."}</div>
                </div>
            </div>
            <div className="space-y-8">
                <div className="bg-slate-900 p-8 border border-white/5">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">Credits</h3>
                    <div className="text-[10px] text-slate-500 font-mono leading-loose uppercase tracking-wider">{song.credits || "Production team undisclosed."}</div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SongDetail;