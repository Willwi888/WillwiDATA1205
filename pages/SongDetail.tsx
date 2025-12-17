import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, Language, ProjectType, ReleaseCategory, getLanguageColor } from '../types';
import { generateMusicCritique } from '../services/geminiService';
import { searchSpotifyTracks, SpotifyTrack } from '../services/spotifyService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSong, updateSong, deleteSong, songs } = useData(); 
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser(); 
  
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [aiReview, setAiReview] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [relatedSongs, setRelatedSongs] = useState<Song[]>([]);

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) { setSong(found); setEditForm(found); }
    }
  }, [id, getSong]);

  useEffect(() => {
      if (!song || !songs) return;
      const normalizeTitle = (title: string) => title.split('(')[0].trim().toLowerCase();
      const currentTitleBase = normalizeTitle(song.title);
      const related = songs.filter(s => {
          if (s.id === song.id) return false;
          if (song.musicBrainzId && s.musicBrainzId && song.musicBrainzId === s.musicBrainzId) return true;
          return normalizeTitle(s.title) === currentTitleBase;
      });
      setRelatedSongs(related);
  }, [song, songs]);

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === '8888' || passwordInput === 'eloveg2026') { enableAdmin(); } else { setLoginError('ACCESS DENIED'); }
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade">
               <div className="bg-slate-900 border border-white/5 p-12 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-[0.3em]">Protected Track</h2>
                   <p className="text-slate-500 text-[10px] mb-8 uppercase tracking-widest">Private Archive Entry</p>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <input type="password" placeholder="KEY" className="w-full bg-black border border-white/10 px-4 py-4 text-white text-center tracking-[0.8em] font-mono outline-none focus:border-brand-accent" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-900 text-[10px] font-black tracking-widest">{loginError}</p>}
                       <button className="w-full py-4 bg-white text-black font-black text-[10px] uppercase tracking-widest hover:bg-brand-accent transition-colors">Verify</button>
                   </form>
               </div>
          </div>
      );
  }

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

  const embedUrl = song.youtubeUrl?.includes('v=') ? `https://www.youtube.com/embed/${new URLSearchParams(new URL(song.youtubeUrl).search).get('v')}` : null;

  return (
    <div className="animate-fade pb-32">
        <div className="bg-slate-900 border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 blur-2xl" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="relative z-10 p-10 flex flex-col md:flex-row gap-12 items-start">
                <div className="w-full md:w-80 flex-shrink-0">
                     <img src={isEditing ? editForm.coverUrl : song.coverUrl} className="w-full aspect-square object-cover shadow-2xl border border-white/10" alt="cover" />
                     {isEditing && (
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
                            {isEditing ? (
                                <input className="text-5xl font-black text-white bg-black border border-white/10 px-4 py-2 w-full uppercase tracking-tighter" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                            ) : (
                                <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4 leading-none">{song.title}</h1>
                            )}
                            <div className="flex items-center gap-4 mt-6">
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white ${getLanguageColor(song.language)}`}>{song.language}</span>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">{song.releaseDate}</span>
                            </div>
                        </div>

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
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-white/5">
                        {['isrc', 'upc', 'spotifyId', 'releaseCompany'].map(field => (
                            <div key={field}>
                                <span className="text-[9px] text-slate-600 uppercase tracking-[0.4em] block mb-2">{field}</span>
                                <span className="font-mono text-[11px] text-slate-400 uppercase">{(song as any)[field] || 'UNDEFINED'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
            <div className="lg:col-span-2 space-y-12">
                <div className="bg-slate-900/50 p-10 border border-white/5">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">Context & Story</h3>
                        <button onClick={handleAiGenerate} disabled={loadingAi} className="text-[9px] border border-brand-accent/30 text-brand-accent px-4 py-2 uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all">Generate AI Analysis</button>
                    </div>
                    <div className="text-slate-400 text-sm font-light leading-relaxed whitespace-pre-line tracking-wide">
                        {song.description || "Historical data not available."}
                    </div>
                    {aiReview && <div className="mt-8 p-6 bg-white/5 border-l-2 border-brand-gold text-xs text-slate-300 leading-loose italic">{aiReview}</div>}
                </div>

                <div className="bg-slate-900/50 p-10 border border-white/5">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8">Lyric Archive</h3>
                    <div className="font-mono text-xs text-slate-500 whitespace-pre-line leading-loose tracking-[0.1em] border-l border-white/5 pl-8">
                        {song.lyrics || "No transcripts found."}
                    </div>
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-slate-900 p-8 border border-white/5">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">Media Stream</h3>
                    {embedUrl ? (
                        <iframe className="w-full aspect-video border border-white/10" src={embedUrl} allowFullScreen></iframe>
                    ) : (
                        <div className="aspect-video bg-black flex items-center justify-center text-[10px] text-slate-700 tracking-widest uppercase border border-white/5">No Video Link</div>
                    )}
                </div>

                <div className="bg-slate-900 p-8 border border-white/5">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">Credits</h3>
                    <div className="text-[10px] text-slate-500 font-mono leading-loose uppercase tracking-wider">
                        {song.credits || "Production team undisclosed."}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SongDetail;
