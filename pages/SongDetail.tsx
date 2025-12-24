import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, getLanguageColor, Language } from '../types';
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

  // Helper to extract YouTube ID for embedding
  const getYoutubeEmbedId = (url?: string) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSave = async () => {
    // Security check: Only admin can save
    if (!isAdmin) return;

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
  
  const handleDelete = async () => {
      if (!isAdmin || !song) return;
      const confirmDelete = window.confirm(`【確認刪除】\n\n您確定要永久刪除《${song.title}》嗎？\n此動作無法復原。`);
      if (confirmDelete) {
          await deleteSong(song.id);
          navigate('/database');
      }
  };

  const handleAiGenerate = async () => {
    if (!isAdmin) return;
    setLoadingAi(true);
    setAiReview(await generateMusicCritique(song));
    setLoadingAi(false);
  };

  const handleStartInteractive = () => {
      if (!song.isInteractiveActive) return;
      // Instrumental Check
      if (song.language === Language.Instrumental) {
          alert("此作品為純音樂 (Instrumental)，沒有歌詞可供互動同步。");
          return;
      }
      // No Lyrics Check
      if (!song.lyrics || song.lyrics.trim().length === 0) {
          alert("此作品尚未登錄歌詞，無法進行互動。");
          return;
      }
      navigate('/interactive', { state: { targetSongId: song.id } });
  };

  const spotifyEmbedId = getSpotifyEmbedId(song.spotifyLink, song.spotifyId);
  const youtubeEmbedId = getYoutubeEmbedId(song.youtubeUrl);
  const isInstrumental = song.language === Language.Instrumental;

  // MusicBrainz Logic
  const WILLWI_MBID = '526cc0f8-da20-4d2d-86a5-4bf841a6ba3c';
  const musicBrainzSubmissionUrl = `https://musicbrainz.org/recording/create?artist=${WILLWI_MBID}&edit-recording.name=${encodeURIComponent(song.title)}&edit-recording.comment=Auto-submitted from Willwi DB`;

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
                                {isAdmin && !isEditing && (
                                    <button onClick={() => setIsEditing(true)} className="text-[10px] border border-white/20 px-3 py-1 uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                        Edit Mode
                                    </button>
                                )}
                            </div>

                            {/* USER ACTIONS: INTERACTIVE BUTTON */}
                            <div className="mt-10 flex flex-col gap-4 max-w-sm">
                                {song.isInteractiveActive ? (
                                    (isInstrumental || !song.lyrics) ? (
                                        <div className="w-full py-4 border border-slate-600 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center bg-slate-900 cursor-not-allowed">
                                            純音樂・無歌詞互動 (Instrumental)
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={handleStartInteractive}
                                            className="w-full py-4 bg-brand-gold text-slate-900 font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all shadow-lg animate-pulse"
                                        >
                                            進入互動實驗室 (Start Session)
                                        </button>
                                    )
                                ) : (
                                    <div className="w-full py-4 border border-white/10 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center bg-black/20">
                                        互動製作尚未開放 (Closed)
                                    </div>
                                )}
                                
                                {/* OFFICIAL LINKS (NO EMBED PLAYERS FOR LISTENERS) */}
                                <div className="grid grid-cols-1 gap-3 mt-2">
                                    
                                    {/* YouTube Embed Player (ADMIN ONLY) */}
                                    {isAdmin && youtubeEmbedId && !isEditing && (
                                        <div className="w-full aspect-video rounded overflow-hidden shadow-lg border border-white/10 mb-2 relative group">
                                            <div className="absolute top-0 left-0 bg-red-600 text-white text-[9px] font-bold px-2 py-1 z-10 pointer-events-none">ADMIN PREVIEW</div>
                                            <iframe 
                                                width="100%" 
                                                height="100%" 
                                                src={`https://www.youtube.com/embed/${youtubeEmbedId}`}
                                                title="YouTube video player" 
                                                frameBorder="0" 
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                    )}

                                    {/* Spotify Embed Player (ADMIN ONLY) */}
                                    {isAdmin && spotifyEmbedId && !isEditing && (
                                        <div className="w-full rounded overflow-hidden shadow-lg border border-[#1DB954]/30 relative">
                                            <div className="absolute top-0 left-0 bg-[#1DB954] text-white text-[9px] font-bold px-2 py-1 z-10 pointer-events-none">ADMIN PREVIEW</div>
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

                                    {/* EXTERNAL LINKS - Visible to All (As Portfolio Metadata) */}
                                    {song.smartLink && !isEditing && (
                                        <a 
                                            href={song.smartLink}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-white text-black font-black uppercase tracking-[0.2em] text-xs transition-all text-center flex items-center justify-center gap-2 hover:bg-brand-accent hover:text-black"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                                            <span>All Platforms / Smart Link</span>
                                        </a>
                                    )}

                                    {song.spotifyLink && !isEditing && (
                                        <a 
                                            href={song.spotifyLink}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-[#1DB954] text-black font-black uppercase tracking-[0.2em] text-xs transition-all text-center flex items-center justify-center gap-2 hover:brightness-110"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.299z"/></svg>
                                            <span>Spotify</span>
                                        </a>
                                    )}

                                    {song.appleMusicLink && !isEditing && (
                                        <a 
                                            href={song.appleMusicLink}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-[#FA243C] text-white font-black uppercase tracking-[0.2em] text-xs transition-all text-center flex items-center justify-center gap-2 hover:brightness-110"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M22.534 5.922l-1.637-1.166a1.272 1.272 0 00-.65-.181c-.265 0-.522.09-.724.254l-6.195 5.068-1.047-.857 5.619-4.597a1.274 1.274 0 00.468-.991c0-.704-.572-1.277-1.275-1.277a1.27 1.27 0 00-.735.234L6.99 9.076a3.843 3.843 0 00-1.206 1.487L.67 22.316l1.796.82 4.276-8.913a.639.639 0 01.576-.363h.005a.634.634 0 01.571.373l1.838 3.829a.638.638 0 001.149-.553L9.366 14.4l3.078 6.41a.637.637 0 001.15-.552l-2.73-5.69 2.056-1.683a.637.637 0 00-.806-.985l-1.921 1.573-.836-1.742 4.492-3.676 7.427 6.075a.638.638 0 00.806-.985l-8.632-7.062 9.079-7.426.007-.006z"/></svg>
                                            <span>Apple Music</span>
                                        </a>
                                    )}
                                    
                                    {song.youtubeMusicUrl && !isEditing && (
                                        <a 
                                            href={song.youtubeMusicUrl}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-[#FF0000] text-white font-black uppercase tracking-[0.2em] text-xs transition-all text-center flex items-center justify-center gap-2 hover:brightness-110"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 18.24c-3.446 0-6.24-2.794-6.24-6.24S8.554 5.76 12 5.76s6.24 2.794 6.24 6.24-2.794 6.24-6.24 6.24zM12 7.2a4.8 4.8 0 100 9.6 4.8 4.8 0 000-9.6z"/><circle cx="12" cy="12" r="3.12"/></svg>
                                            <span>YouTube Music</span>
                                        </a>
                                    )}

                                    {song.youtubeUrl && !isEditing && (
                                        <a 
                                            href={song.youtubeUrl}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="w-full py-3 bg-black border border-white/20 text-white font-black uppercase tracking-[0.2em] text-xs transition-all text-center flex items-center justify-center gap-2 hover:border-white"
                                        >
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                                            <span>Watch MV</span>
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* ADMIN CONTROL PANEL (STRICTLY ADMIN ONLY) */}
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
                                        
                                        {/* MusicBrainz Submission / Link */}
                                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                                            <span className="text-[10px] text-white uppercase tracking-widest">MusicBrainz</span>
                                            <a 
                                                href={song.musicBrainzId 
                                                    ? `https://musicbrainz.org/recording/${song.musicBrainzId}` 
                                                    : musicBrainzSubmissionUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded bg-purple-900/50 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-all"
                                            >
                                                {song.musicBrainzId ? 'View Entry' : 'Auto-Submit Data'}
                                            </a>
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

                            {isAdmin && isEditing && (
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
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Release Category</label>
                                            <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.releaseCategory || ''} onChange={e => setEditForm({...editForm, releaseCategory: e.target.value as any})} placeholder="Single, EP, Album..." />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Language</label>
                                            <select 
                                                className="w-full bg-black border border-white/10 p-3 text-white text-xs" 
                                                value={editForm.language} 
                                                onChange={e => setEditForm({...editForm, language: e.target.value as Language})}
                                            >
                                                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Release Company (Label)</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.releaseCompany || ''} onChange={e => setEditForm({...editForm, releaseCompany: e.target.value})} placeholder="Label..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Publisher (詞曲版權)</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.publisher || ''} onChange={e => setEditForm({...editForm, publisher: e.target.value})} placeholder="Publisher Name..." />
                                    </div>

                                    {/* ADDED ISRC & UPC INPUTS */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">ISRC</label>
                                            <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.isrc || ''} onChange={e => setEditForm({...editForm, isrc: e.target.value})} placeholder="ISRC..." />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">UPC</label>
                                            <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.upc || ''} onChange={e => setEditForm({...editForm, upc: e.target.value})} placeholder="UPC..." />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">MusicBrainz ID</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.musicBrainzId || ''} onChange={e => setEditForm({...editForm, musicBrainzId: e.target.value})} placeholder="MBID..." />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Spotify Link</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.spotifyLink || ''} onChange={e => setEditForm({...editForm, spotifyLink: e.target.value})} placeholder="https://open.spotify.com/..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">YouTube URL</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.youtubeUrl || ''} onChange={e => setEditForm({...editForm, youtubeUrl: e.target.value})} placeholder="https://youtube.com/..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Apple Music Link</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.appleMusicLink || ''} onChange={e => setEditForm({...editForm, appleMusicLink: e.target.value})} placeholder="https://music.apple.com/..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">Musixmatch Link</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.musixmatchUrl || ''} onChange={e => setEditForm({...editForm, musixmatchUrl: e.target.value})} placeholder="https://www.musixmatch.com/..." />
                                    </div>
                                    
                                    <div className="space-y-1">
                                        <label className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block">Smart Link (Universal)</label>
                                        <input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.smartLink || ''} onChange={e => setEditForm({...editForm, smartLink: e.target.value})} placeholder="Linktree, Linkfire, Fanlink..." />
                                    </div>

                                    <div className="pt-6 mt-6 border-t border-white/10 flex justify-between items-center">
                                        <button onClick={handleDelete} className="text-red-500 hover:text-white border border-red-900/50 hover:bg-red-900/50 px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded">
                                            DELETE SONG (刪除作品)
                                        </button>
                                        <div className="flex gap-4">
                                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-white px-4 py-3 text-[10px] font-black uppercase tracking-widest">
                                                Cancel
                                            </button>
                                            <button onClick={handleSave} disabled={isSaving} className="bg-brand-accent text-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg">
                                                {isSaving ? "Saving..." : "Save Changes"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {isAdmin && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-white/5">
                                {['isrc', 'upc', 'spotifyId', 'musicBrainzId', 'releaseCompany', 'publisher'].map(field => (
                                    <div key={field}>
                                        <span className="text-[9px] text-slate-600 uppercase tracking-[0.4em] block mb-2">{field === 'musicBrainzId' ? 'MusicBrainz ID' : field}</span>
                                        {field === 'musicBrainzId' && (song as any)[field] ? (
                                            <a href={`https://musicbrainz.org/recording/${(song as any)[field]}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-brand-gold hover:underline uppercase">
                                                {(song as any)[field]} ↗
                                            </a>
                                        ) : (
                                            <span className="font-mono text-[11px] text-slate-400 uppercase">{(song as any)[field] || 'UNDEFINED'}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
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
                    {/* EDITABLE DESCRIPTION */}
                    {isAdmin && isEditing ? (
                        <textarea 
                            className="w-full h-60 bg-black border border-white/10 p-4 text-white text-sm leading-relaxed outline-none focus:border-brand-gold"
                            value={editForm.description || ''}
                            onChange={e => setEditForm({...editForm, description: e.target.value})}
                            placeholder="Enter description..."
                        />
                    ) : (
                        <div className="text-slate-400 text-sm font-light leading-relaxed whitespace-pre-line tracking-wide">
                            {song.description || "Historical data not available."}
                        </div>
                    )}
                    {/* Only show AI review if it exists (Admin generated) */}
                    {aiReview && isAdmin && <div className="mt-8 p-6 bg-white/5 border-l-2 border-brand-gold text-xs text-slate-300 leading-loose italic">{aiReview}</div>}
                </div>
                <div className="bg-slate-900/50 p-10 border border-white/5">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8">Lyric Archive</h3>
                    {/* EDITABLE LYRICS */}
                    {isAdmin && isEditing ? (
                        <textarea 
                            className="w-full h-80 bg-black border border-white/10 p-4 text-white text-xs font-mono leading-relaxed outline-none focus:border-brand-gold"
                            value={editForm.lyrics || ''}
                            onChange={e => setEditForm({...editForm, lyrics: e.target.value})}
                            placeholder="Paste lyrics here..."
                        />
                    ) : (
                        <div className="font-mono text-xs text-slate-500 whitespace-pre-line leading-loose tracking-[0.1em] border-l border-white/5 pl-8">{song.lyrics || "No transcripts found."}</div>
                    )}
                </div>
            </div>
            <div className="space-y-8">
                <div className="bg-slate-900 p-8 border border-white/5">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">Credits</h3>
                    {/* EDITABLE CREDITS */}
                    {isAdmin && isEditing ? (
                         <textarea 
                            className="w-full h-60 bg-black border border-white/10 p-4 text-white text-xs font-mono leading-relaxed outline-none focus:border-brand-gold"
                            value={editForm.credits || ''}
                            onChange={e => setEditForm({...editForm, credits: e.target.value})}
                            placeholder="Credits..."
                        />
                    ) : (
                        <div className="text-[10px] text-slate-500 font-mono leading-loose uppercase tracking-wider whitespace-pre-line">
                            {song.credits || "Production team undisclosed."}
                        </div>
                    )}
                    
                    {/* Automated Copyright Footer */}
                    <div className="mt-8 pt-8 border-t border-white/5 text-[9px] text-slate-600 font-mono leading-relaxed space-y-1">
                        <p>℗ {new Date(song.releaseDate).getFullYear()} {song.releaseCompany || 'Willwi Music'}</p>
                        <p>© {new Date(song.releaseDate).getFullYear()} {song.publisher || song.releaseCompany || 'Willwi Music'}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SongDetail;