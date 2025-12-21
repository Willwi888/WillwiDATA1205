import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, getLanguageColor } from '../types';
import { generateMusicCritique } from '../services/geminiService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

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
      if (await updateSong(id, editForm)) { setSong({ ...song, ...editForm } as Song); setIsEditing(false); }
      setIsSaving(false);
    }
  };

  const handleAiGenerate = async () => {
    setLoadingAi(true);
    setAiReview(await generateMusicCritique(song));
    setLoadingAi(false);
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

                            {/* ADMIN MEDIA MONITOR */}
                            {isAdmin && !isEditing && (
                                <div className="mt-8 w-full max-w-md bg-black/40 border border-white/10 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse"></div>
                                        <p className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Admin Media Monitor</p>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {song.audioUrl && (
                                            <div>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Raw Source Audio</p>
                                                <audio controls src={song.audioUrl} className="w-full h-8 block rounded bg-slate-800" />
                                            </div>
                                        )}
                                        
                                        {spotifyEmbedId && (
                                            <div>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Spotify Release</p>
                                                <iframe 
                                                    src={`https://open.spotify.com/embed/track/${spotifyEmbedId}?utm_source=generator&theme=0`} 
                                                    width="100%" 
                                                    height="80" 
                                                    frameBorder="0" 
                                                    allow="clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                                                    loading="lazy"
                                                    className="rounded bg-black opacity-80 hover:opacity-100 transition-opacity"
                                                ></iframe>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {isEditing && (
                                <div className="mt-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Audio Source URL</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.audioUrl || ''} onChange={e => setEditForm({...editForm, audioUrl: e.target.value})} placeholder="https://..." />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Spotify Link</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.spotifyLink || ''} onChange={e => setEditForm({...editForm, spotifyLink: e.target.value})} placeholder="https://open.spotify.com/..." />
                                    </div>
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="flex flex-col gap-3">
                                {isEditing ? (
                                    <>
                                        <button onClick={handleSave} className="px-6 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest">Save</button>
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