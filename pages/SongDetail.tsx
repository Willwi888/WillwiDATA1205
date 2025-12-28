import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, getLanguageColor, Language } from '../types';
import { generateMusicCritique } from '../services/geminiService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

// SMART LINK CONVERTER
const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        if (url.includes('drive.google.com') && url.includes('/file/d/')) {
            const id = url.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        if (url.includes('dropbox.com')) {
            let newUrl = url;
            if (newUrl.includes('dl=0')) newUrl = newUrl.replace('dl=0', 'raw=1');
            else if (newUrl.includes('dl=1')) newUrl = newUrl.replace('dl=1', 'raw=1');
            else if (!newUrl.includes('raw=1')) {
                 newUrl += (newUrl.includes('?') ? '&' : '?') + 'raw=1';
            }
            return newUrl;
        }
        return url;
    } catch (e) { return url; }
};

interface LyricsLine {
    time: number; // in seconds
    text: string;
}

const parseLyrics = (raw: string): { lines: LyricsLine[], hasTime: boolean } => {
    const lines = raw.split('\n');
    const parsed: LyricsLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    let hasTime = false;

    for (const line of lines) {
        const match = line.match(timeRegex);
        if (match) {
            hasTime = true;
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const ms = parseInt(match[3]);
            // 標準化為「秒」
            const time = min * 60 + sec + (ms / (ms > 99 ? 1000 : 100));
            const text = line.replace(timeRegex, '').trim();
            if (text) parsed.push({ time, text });
        } else if (line.trim()) {
            parsed.push({ time: -1, text: line.trim() });
        }
    }

    if (!hasTime) {
        return { 
            lines: lines.map((text, i) => ({ time: i, text: text.trim() })).filter(l => l.text), 
            hasTime: false 
        };
    }
    return { lines: parsed, hasTime: true };
};

const ImmersivePlayer: React.FC<{ song: Song; onClose: () => void }> = ({ song, onClose }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeLineIndex, setActiveLineIndex] = useState(0);

    const { lines, hasTime } = useMemo(() => parseLyrics(song.lyrics || ''), [song.lyrics]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setDuration(audio.duration);
        
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));
        audio.addEventListener('ended', () => setIsPlaying(false));

        if (song.audioUrl) audio.play().catch(() => {});

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
        };
    }, [song.audioUrl]);

    useEffect(() => {
        if (!hasTime) return;
        const index = lines.findIndex((line, i) => {
            const nextLine = lines[i + 1];
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
        });
        
        if (index !== -1 && index !== activeLineIndex) {
            setActiveLineIndex(index);
            if (lyricsContainerRef.current) {
                const activeEl = lyricsContainerRef.current.children[index] as HTMLElement;
                if (activeEl) {
                    activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [currentTime, lines, hasTime, activeLineIndex]);

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = Number(e.target.value);
        if (audioRef.current) audioRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) audioRef.current.pause();
            else audioRef.current.play();
        }
    };

    const formatTime = (t: number) => {
        if (isNaN(t)) return "0:00";
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-fade-in">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center blur-3xl opacity-40 scale-110 transition-all duration-[10s]" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
                <div className="absolute inset-0 bg-black/60"></div>
            </div>

            <div className="relative z-10 flex justify-between items-center p-6">
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center backdrop-blur-md transition-all">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="text-center">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">{song.title}</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">{song.releaseCompany || 'Willwi Music'}</p>
                </div>
                <div className="w-10"></div>
            </div>

            <div className="relative z-10 flex-1 overflow-hidden flex items-center justify-center">
                <div ref={lyricsContainerRef} className="w-full max-w-2xl h-full overflow-y-auto custom-scrollbar px-6 py-20 text-center space-y-12" style={{ scrollBehavior: 'smooth' }}>
                    {lines.length > 0 ? lines.map((line, i) => (
                        <p key={i} onClick={() => { if (hasTime && audioRef.current && line.time >= 0) audioRef.current.currentTime = line.time; }}
                            className={`transition-all duration-700 cursor-pointer font-bold leading-tight ${
                                hasTime ? (i === activeLineIndex ? 'text-4xl md:text-5xl text-white scale-105' : 'text-xl md:text-2xl text-white/20 blur-[1px] hover:blur-0 hover:text-white/50') : 'text-2xl md:text-3xl text-white/80 hover:text-white my-6'
                            }`}>
                            {line.text}
                        </p>
                    )) : <p className="text-slate-500 text-sm uppercase tracking-widest">No Lyrics Available</p>}
                    <div className="h-60"></div>
                </div>
            </div>

            <div className="relative z-20 bg-gradient-to-t from-black via-black/90 to-transparent p-8 md:p-12">
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="flex items-center gap-6">
                         <img src={song.coverUrl} className="w-16 h-16 rounded-lg shadow-2xl object-cover border border-white/10" alt="" />
                         <div>
                             <h3 className="text-xl font-black text-white leading-none mb-1">{song.title}</h3>
                             <p className="text-xs text-brand-gold uppercase tracking-widest font-bold">Willwi • {currentTime.toFixed(1)}s</p>
                         </div>
                    </div>

                    {song.audioUrl ? (
                        <div className="space-y-2">
                            <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full transition-all" />
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                        </div>
                    ) : <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-center"><p className="text-[10px] text-red-400 uppercase tracking-widest">Audio Unavailable</p></div>}

                    {song.audioUrl && (
                        <div className="flex justify-center items-center gap-8">
                            <button onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 5 }} className="text-white/50 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg></button>
                            <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">{isPlaying ? <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}</button>
                            <button onClick={() => { if(audioRef.current) audioRef.current.currentTime += 5 }} className="text-white/50 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></button>
                        </div>
                    )}
                </div>
            </div>
            {song.audioUrl && <audio ref={audioRef} src={song.audioUrl} crossOrigin="anonymous" />}
        </div>
    );
};

const SongDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getSong, updateSong, deleteSong } = useData(); 
  const { isAdmin } = useUser(); 
  const { t } = useTranslation();
  
  const [song, setSong] = useState<Song | undefined>(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Song>>({});
  const [aiReview, setAiReview] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [showLyricsPlayer, setShowLyricsPlayer] = useState(false); 
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) { setSong(found); setEditForm(found); }
    }
  }, [id, getSong]);

  if (!song) return null;

  const getSpotifyEmbedId = (link?: string, id?: string) => {
      if (id) return id;
      if (!link) return null;
      try {
          const url = new URL(link);
          const parts = url.pathname.split('/');
          const trackIndex = parts.indexOf('track');
          if (trackIndex !== -1 && parts[trackIndex + 1]) return parts[trackIndex + 1];
      } catch (e) { return null; }
      return null;
  };

  const getYoutubeEmbedId = (url?: string) => {
      if (!url) return null;
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleSave = async () => {
    if (!isAdmin || !id) return;
    setIsSaving(true);
    const finalForm = { ...editForm };
    if (finalForm.audioUrl) finalForm.audioUrl = convertToDirectStream(finalForm.audioUrl);
    if (await updateSong(id, finalForm)) { setSong({ ...song, ...finalForm } as Song); setIsEditing(false); }
    setIsSaving(false);
  };
  
  const handleDelete = async () => {
      if (!isAdmin || !song) return;
      if (window.confirm(`【確認刪除】\n\n您確定要永久刪除《${song.title}》嗎？`)) {
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
      if (isAdmin) {
          if (!song.audioUrl && !window.confirm("缺少音檔，確定要強制進入測試嗎？")) return;
          navigate('/interactive', { state: { targetSongId: song.id } });
          return;
      }
      if (!song.isInteractiveActive) return;
      if (song.language === Language.Instrumental) { alert("此作品為純音樂，無歌詞可互動。"); return; }
      if (!song.lyrics || song.lyrics.trim().length === 0) { alert("此作品尚未登錄歌詞。"); return; }
      navigate('/interactive', { state: { targetSongId: song.id } });
  };

  const spotifyEmbedId = getSpotifyEmbedId(song.spotifyLink, song.spotifyId);
  const youtubeEmbedId = getYoutubeEmbedId(song.youtubeUrl);
  const isInstrumental = song.language === Language.Instrumental;

  const WILLWI_MBID = '526cc0f8-da20-4d2d-86a5-4bf841a6ba3c';
  const getMusicBrainzSeedingUrl = (s: Song) => {
    const params = new URLSearchParams();
    params.append('name', s.title);
    params.append('artist_credit.names.0.artist.id', WILLWI_MBID);
    if (s.releaseDate) {
        const [y, m, d] = s.releaseDate.split('-');
        if (y) params.append('date.year', y);
        if (m) params.append('date.month', m);
        if (d) params.append('date.day', d);
    }
    if (s.upc) params.append('barcode', s.upc);
    if (s.isrc) params.append('mediums.0.track.0.recording.isrc.0', s.isrc);
    params.append('edit_note', `Seeded from Willwi Database.\nSpotify: ${s.spotifyLink}\nISRC: ${s.isrc}`);
    return `https://musicbrainz.org/release/add?${params.toString()}`;
  };

  return (
    <div className="animate-fade pb-32 max-w-7xl mx-auto px-6">
        {showLyricsPlayer && <ImmersivePlayer song={song} onClose={() => setShowLyricsPlayer(false)} />}
        <div className="mb-6"><Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest">{t('detail_back_link')}</Link></div>
        <div className="bg-slate-900 border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 blur-2xl" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="relative z-10 p-10 flex flex-col md:flex-row gap-12 items-start">
                <div className="w-full md:w-80 flex-shrink-0">
                     <img src={isEditing ? editForm.coverUrl : song.coverUrl} className="w-full aspect-square object-cover shadow-2xl border border-white/10" alt="cover" />
                     {isAdmin && isEditing && (
                         <div className="mt-4 space-y-2">
                            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white/10 text-white font-bold py-3 text-[10px] uppercase tracking-widest border border-white/10">Upload Image</button>
                            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setEditForm(p=>({...p, coverUrl:r.result as string})); r.readAsDataURL(f); } }} />
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
                                {isAdmin && !isEditing && <button onClick={() => setIsEditing(true)} className="text-[10px] border border-white/20 px-3 py-1 uppercase tracking-widest hover:bg-white hover:text-black transition-all">Edit Mode</button>}
                            </div>
                            <div className="mt-8 flex flex-wrap gap-4">
                                <button onClick={() => setShowLyricsPlayer(true)} className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all rounded-full">
                                    <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center text-black shadow-[0_0_15px_rgba(251,191,36,0.5)]"><svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('detail_btn_immersive')}</span>
                                </button>
                                {song.smartLink && !isEditing && <a href={song.smartLink} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 px-6 py-3 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] transition-all rounded-full hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.4)]"><span>{t('detail_btn_smartlink')}</span><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>}
                            </div>
                            <div className="mt-6 flex flex-col gap-4 max-w-sm">
                                {isAdmin ? (
                                    <button onClick={handleStartInteractive} className={`w-full py-4 font-black uppercase tracking-[0.3em] text-xs transition-all shadow-lg ${song.isInteractiveActive ? 'bg-brand-gold text-slate-900 hover:bg-white' : 'bg-red-900 text-white hover:bg-red-700'}`}>
                                        {song.isInteractiveActive ? t('detail_btn_start_session') : 'Admin Force Start (Test)'}
                                    </button>
                                ) : (
                                    song.isInteractiveActive ? (
                                        (isInstrumental || !song.lyrics) ? <div className="w-full py-4 border border-slate-600 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center bg-slate-900 cursor-not-allowed">{t('detail_status_instrumental')}</div> :
                                        <button onClick={handleStartInteractive} className="w-full py-4 bg-brand-gold text-slate-900 font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all shadow-lg animate-pulse">{t('detail_btn_start_session')}</button>
                                    ) : <div className="w-full py-4 border border-white/10 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center bg-black/20">{t('detail_status_closed')}</div>
                                )}
                            </div>
                            {isAdmin && !isEditing && (
                                <div className="mt-8 w-full max-w-md bg-black/40 border border-white/10 p-4 rounded-lg">
                                    <div className="flex items-center gap-2 mb-3 border-b border-white/5 pb-2">
                                        <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse"></div>
                                        <p className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Admin Control Panel</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center"><span className="text-[10px] text-white uppercase tracking-widest">Interactive Status</span><button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded ${song.isInteractiveActive ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-slate-400'}`}>{song.isInteractiveActive ? 'Active (ON)' : 'Inactive (OFF)'}</button></div>
                                        <div className="flex justify-between items-center pt-2 border-t border-white/5"><span className="text-[10px] text-white uppercase tracking-widest">MusicBrainz Data</span><div className="flex gap-2">
                                            {song.musicBrainzId && <a href={`https://musicbrainz.org/recording/${song.musicBrainzId}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded bg-slate-800 text-slate-300 border border-slate-600 hover:bg-white hover:text-black transition-all">View</a>}
                                            <a href={getMusicBrainzSeedingUrl(song)} target="_blank" rel="noopener noreferrer" className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded bg-purple-900/50 text-purple-400 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-all">Submit</a>
                                        </div></div>
                                    </div>
                                </div>
                            )}
                            {isAdmin && isEditing && (
                                <div className="mt-6 space-y-4 bg-slate-800/50 p-4 border border-white/10">
                                    <div className="space-y-1"><label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">MusicBrainz ID</label><input className="w-full bg-black border border-white/10 p-3 text-white text-xs font-mono" value={editForm.musicBrainzId || ''} onChange={e => setEditForm({...editForm, musicBrainzId: e.target.value})} placeholder="MBID..." /></div>
                                    <div className="pt-6 border-t border-white/10 flex justify-between"><button onClick={handleDelete} className="text-red-500 hover:text-white border border-red-900/50 px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded">DELETE</button>
                                    <div className="flex gap-4"><button onClick={() => setIsEditing(false)} className="text-slate-400 px-4 py-3 text-[10px] font-black uppercase tracking-widest">Cancel</button><button onClick={handleSave} disabled={isSaving} className="bg-brand-accent text-slate-900 px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg">{isSaving ? "Saving..." : "Save Changes"}</button></div></div>
                                </div>
                            )}
                        </div>
                        {isAdmin && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-white/5">
                                {['isrc', 'upc', 'spotifyId', 'musicBrainzId'].map(field => (
                                    <div key={field}>
                                        <span className="text-[9px] text-slate-600 uppercase tracking-[0.4em] block mb-2">{field}</span>
                                        {field === 'musicBrainzId' && (song as any)[field] ? <a href={`https://musicbrainz.org/recording/${(song as any)[field]}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-brand-gold hover:underline uppercase">{(song as any)[field]} ↗</a> : <span className="font-mono text-[11px] text-slate-400">{(song as any)[field] || '--'}</span>}
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
                    <div className="flex justify-between items-center mb-8"><h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">{t('detail_section_context')}</h3>{isAdmin && <button onClick={handleAiGenerate} disabled={loadingAi} className="text-[9px] border border-brand-accent/30 text-brand-accent px-4 py-2 uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all">{loadingAi ? "Analyzing..." : "Generate AI Review"}</button>}</div>
                    {isAdmin && isEditing ? <textarea className="w-full h-60 bg-black border border-white/10 p-4 text-white text-sm outline-none" value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} /> : <div className="text-slate-400 text-sm font-light leading-relaxed whitespace-pre-line">{song.description || t('detail_empty_desc')}</div>}
                </div>
                <div className="bg-slate-900/50 p-10 border border-white/5">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8">{t('detail_section_lyrics')}</h3>
                    {isAdmin && isEditing ? <textarea className="w-full h-80 bg-black border border-white/10 p-4 text-white text-xs font-mono" value={editForm.lyrics || ''} onChange={e => setEditForm({...editForm, lyrics: e.target.value})} /> : <div className="font-mono text-xs text-slate-500 whitespace-pre-line leading-loose border-l border-white/5 pl-8">{song.lyrics || t('detail_empty_lyrics')}</div>}
                </div>
            </div>
            <div className="bg-slate-900 p-8 border border-white/5">
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">{t('detail_section_credits')}</h3>
                {isAdmin && isEditing ? <textarea className="w-full h-60 bg-black border border-white/10 p-4 text-white text-xs font-mono" value={editForm.credits || ''} onChange={e => setEditForm({...editForm, credits: e.target.value})} /> : <div className="text-[10px] text-slate-500 font-mono leading-loose uppercase tracking-wider whitespace-pre-line">{song.credits || t('detail_empty_credits')}</div>}
                <div className="mt-8 pt-8 border-t border-white/5 text-[9px] text-slate-600 font-mono"><p>℗ {new Date(song.releaseDate).getFullYear()} {song.releaseCompany}</p></div>
            </div>
        </div>
    </div>
  );
};

export default SongDetail;