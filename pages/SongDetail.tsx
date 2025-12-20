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

                            {/* Spotify Link: Admin Only */}
                            {isAdmin && song.spotifyLink && !isEditing && (
                                <div className="mt-8">
                                    <a 
                                        href={song.spotifyLink} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-3 px-6 py-3 bg-[#1DB954]/80 text-black font-black text-[10px] uppercase tracking-widest hover:bg-[#1ed760] transition-colors shadow-lg rounded-sm"
                                    >
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                                        </svg>
                                        View on Spotify (Admin)
                                    </a>
                                </div>
                            )}

                            {isEditing && (
                                <div className="mt-6 space-y-2">
                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Spotify Link</label>
                                    <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.spotifyLink || ''} onChange={e => setEditForm({...editForm, spotifyLink: e.target.value})} placeholder="https://open.spotify.com/..." />
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