
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, getLanguageColor, Language, ReleaseCategory, ProjectType } from '../types';
import { generateMusicCritique } from '../services/geminiService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

// 統一的音檔轉換工具
const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        const u = new URL(url);
        
        // Dropbox 處理
        if (u.hostname.includes('dropbox.com')) {
            u.searchParams.set('raw', '1');
            u.searchParams.delete('dl');
            return u.toString();
        }
        
        // Google Drive 處理
        if (u.hostname.includes('drive.google.com') && u.pathname.includes('/file/d/')) {
            const id = u.pathname.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        
        return url;
    } catch (e) {
        return url;
    }
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
    const [isLoading, setIsLoading] = useState(true);
    const [activeLineIndex, setActiveLineIndex] = useState(0);

    const { lines, hasTime } = useMemo(() => parseLyrics(song.lyrics || ''), [song.lyrics]);
    const convertedUrl = useMemo(() => convertToDirectStream(song.audioUrl || ''), [song.audioUrl]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => {
            setDuration(audio.duration);
            setIsLoading(false);
        };
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleError = () => {
            setIsLoading(false);
            console.error("Audio Load Error");
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handlePause);
        audio.addEventListener('error', handleError);
        audio.addEventListener('waiting', () => setIsLoading(true));
        audio.addEventListener('playing', () => setIsLoading(false));

        // 啟動播放
        if (convertedUrl) {
            audio.play().catch(err => {
                console.warn("Autoplay blocked or failed:", err);
                setIsLoading(false);
            });
        }

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('error', handleError);
        };
    }, [convertedUrl]);

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
            else audioRef.current.play().catch(() => {});
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
                    {isLoading && <div className="text-brand-gold animate-pulse text-xs font-black tracking-[0.3em] uppercase mb-10">Loading Audio Stream...</div>}
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
                         <div className="relative">
                            <img src={song.coverUrl} className="w-16 h-16 rounded-lg shadow-2xl object-cover border border-white/10" alt="" />
                            {isPlaying && (
                                <div className="absolute -right-1 -bottom-1 flex gap-0.5 items-end h-4 bg-black/60 p-1 rounded">
                                    <div className="w-1 bg-brand-gold animate-[playing-wave_0.8s_ease-in-out_infinite]"></div>
                                    <div className="w-1 bg-brand-gold animate-[playing-wave_0.8s_ease-in-out_infinite_0.2s]"></div>
                                    <div className="w-1 bg-brand-gold animate-[playing-wave_0.8s_ease-in-out_infinite_0.4s]"></div>
                                </div>
                            )}
                         </div>
                         <div>
                             <h3 className="text-xl font-black text-white leading-none mb-1">{song.title}</h3>
                             <p className="text-xs text-brand-gold uppercase tracking-widest font-bold">Willwi • {formatTime(currentTime)}</p>
                         </div>
                    </div>

                    {song.audioUrl ? (
                        <div className="space-y-2">
                            <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full transition-all" />
                            <div className="flex justify-between text-[10px] text-slate-400 font-mono"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                        </div>
                    ) : <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-center"><p className="text-[10px] text-red-400 uppercase tracking-widest">Audio URL Missing</p></div>}

                    <div className="flex justify-center items-center gap-8">
                        <button onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 5 }} className="text-white/50 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg></button>
                        <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50" disabled={isLoading || !song.audioUrl}>
                            {isLoading ? (
                                <div className="w-6 h-6 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin"></div>
                            ) : isPlaying ? (
                                <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                            ) : (
                                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                            )}
                        </button>
                        <button onClick={() => { if(audioRef.current) audioRef.current.currentTime += 5 }} className="text-white/50 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></button>
                    </div>
                </div>
            </div>
            {convertedUrl && <audio ref={audioRef} src={convertedUrl} crossOrigin="anonymous" />}
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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setEditForm(prev => ({ ...prev, [name]: checked }));
    } else {
        setEditForm(prev => ({ ...prev, [name]: value }));
    }
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

  const isInstrumental = song.language === Language.Instrumental;
  const WILLWI_MBID = '526cc0f8-da20-4d2d-86a5-4bf841a6ba3c';
  
  const getMusicBrainzSeedingUrl = (s: Song) => {
    const params = new URLSearchParams();
    params.append('name', s.title);
    params.append('artist_credit.names.0.name', 'Willwi');
    params.append('artist_credit.names.0.artist.id', WILLWI_MBID);
    
    let type = 'album';
    if (s.releaseCategory?.includes('Single')) type = 'single';
    else if (s.releaseCategory?.includes('EP')) type = 'ep';
    params.append('type', type);

    const langCodes: Record<string, string> = {
        '華語': 'cmn', '台語': 'nan', '日語': 'jpn', '韓語': 'kor', '英語': 'eng', '法語': 'fra'
    };
    if (langCodes[s.language]) params.append('language', langCodes[s.language]);

    if (s.releaseDate) {
        const [y, m, d] = s.releaseDate.split('-');
        if (y) params.append('date.year', y);
        if (m) params.append('date.month', m);
        if (d) params.append('date.day', d);
    }

    if (s.upc) params.append('barcode', s.upc);
    params.append('mediums.0.format', 'Digital Media');
    params.append('mediums.0.track.0.name', s.title);
    if (s.isrc) params.append('mediums.0.track.0.recording.isrc.0', s.isrc);

    let note = `Seeded from Willwi Creative Database.\n`;
    if (s.spotifyLink) note += `Source Spotify: ${s.spotifyLink}\n`;
    if (s.coverUrl) note += `Cover Source: ${s.coverUrl}\n`;
    params.append('edit_note', note);

    return `https://musicbrainz.org/release/add?${params.toString()}`;
  };

  return (
    <div className="animate-fade pb-32 max-w-7xl mx-auto px-6 pt-10">
        <style>{`
            @keyframes playing-wave {
                0%, 100% { height: 4px; }
                50% { height: 12px; }
            }
        `}</style>
        {showLyricsPlayer && <ImmersivePlayer song={song} onClose={() => setShowLyricsPlayer(false)} />}
        <div className="mb-6 flex justify-between items-center">
            <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest">{t('detail_back_link')}</Link>
            {isAdmin && !isEditing && (
                <button onClick={() => setIsEditing(true)} className="text-[10px] border border-brand-accent/50 text-brand-accent px-4 py-2 uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all font-bold">
                    {t('detail_edit_mode')}
                </button>
            )}
        </div>

        <div className="bg-slate-900 border border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 blur-2xl" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="relative z-10 p-10 flex flex-col md:flex-row gap-12 items-start">
                <div className="w-full md:w-80 flex-shrink-0">
                     <img src={isEditing ? (editForm.coverUrl || song.coverUrl) : song.coverUrl} className="w-full aspect-square object-cover shadow-2xl border border-white/10" alt="cover" />
                     {isAdmin && isEditing && (
                         <div className="mt-4 space-y-2">
                            <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white/10 text-white font-bold py-3 text-[10px] uppercase tracking-widest border border-white/10 hover:bg-white hover:text-black transition-all">{t('detail_upload_image')}</button>
                            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f){ const r=new FileReader(); r.onloadend=()=>setEditForm(p=>({...p, coverUrl:r.result as string})); r.readAsDataURL(f); } }} />
                            <input className="w-full bg-black border border-white/10 p-2 text-[10px] text-white font-mono outline-none focus:border-brand-accent" value={editForm.coverUrl || ''} onChange={handleEditChange} name="coverUrl" placeholder="IMAGE URL" />
                         </div>
                     )}
                </div>
                <div className="flex-grow w-full">
                    <div className="flex justify-between items-start">
                        <div className="w-full">
                            {isAdmin && isEditing ? (
                                <input className="text-5xl font-black text-white bg-black/50 border-b border-white/20 px-0 py-2 w-full uppercase tracking-tighter outline-none focus:border-brand-accent mb-4" value={editForm.title} name="title" onChange={handleEditChange} placeholder="SONG TITLE" />
                            ) : (
                                <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4 leading-none">{song.title}</h1>
                            )}
                            
                            {!isEditing && (
                                <div className="flex items-center gap-4 mt-6">
                                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white ${getLanguageColor(song.language)}`}>{song.language}</span>
                                    <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">{song.releaseDate}</span>
                                </div>
                            )}

                            {isAdmin && isEditing ? (
                                // EXPANDED EDIT FORM
                                <div className="mt-6 bg-slate-950/80 p-6 border border-white/10 rounded-lg space-y-6 animate-fade-in">
                                    <div className="flex justify-between items-center border-b border-white/10 pb-2">
                                        <h4 className="text-xs font-black text-brand-gold uppercase tracking-widest">Metadata & Links</h4>
                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest">Admin Control</span>
                                    </div>
                                    
                                    {/* Core Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-400 uppercase font-bold">Version Label</label>
                                            <input name="versionLabel" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs outline-none focus:border-brand-accent" value={editForm.versionLabel || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-400 uppercase font-bold">Release Date</label>
                                            <input type="date" name="releaseDate" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs outline-none focus:border-brand-accent" value={editForm.releaseDate || ''} onChange={handleEditChange} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-400 uppercase font-bold">Language</label>
                                            <select name="language" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs outline-none focus:border-brand-accent" value={editForm.language} onChange={handleEditChange}>
                                                {Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-400 uppercase font-bold">Category</label>
                                            <select name="releaseCategory" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs outline-none focus:border-brand-accent" value={editForm.releaseCategory} onChange={handleEditChange}>
                                                {Object.values(ReleaseCategory).map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-400 uppercase font-bold">Project Type</label>
                                            <select name="projectType" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs outline-none focus:border-brand-accent" value={editForm.projectType} onChange={handleEditChange}>
                                                {Object.values(ProjectType).map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] text-slate-400 uppercase font-bold">Publisher</label>
                                            <input name="publisher" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs outline-none focus:border-brand-accent" value={editForm.publisher || ''} onChange={handleEditChange} />
                                        </div>
                                    </div>

                                    {/* IDs */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-bold">ISRC</label><input name="isrc" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.isrc || ''} onChange={handleEditChange} /></div>
                                        <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-bold">UPC</label><input name="upc" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.upc || ''} onChange={handleEditChange} /></div>
                                        <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-bold">Spotify ID</label><input name="spotifyId" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.spotifyId || ''} onChange={handleEditChange} /></div>
                                        <div className="space-y-1"><label className="text-[9px] text-slate-400 uppercase font-bold">MusicBrainz ID</label><input name="musicBrainzId" className="w-full bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.musicBrainzId || ''} onChange={handleEditChange} /></div>
                                    </div>

                                    {/* Links */}
                                    <div className="space-y-2 border-t border-white/10 pt-4">
                                        <label className="text-[9px] text-brand-accent uppercase font-bold">External Links</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <input name="youtubeUrl" className="bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.youtubeUrl || ''} onChange={handleEditChange} placeholder="YouTube Video URL" />
                                            <input name="spotifyLink" className="bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.spotifyLink || ''} onChange={handleEditChange} placeholder="Spotify Link" />
                                            <input name="appleMusicLink" className="bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.appleMusicLink || ''} onChange={handleEditChange} placeholder="Apple Music Link" />
                                            <input name="smartLink" className="bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.smartLink || ''} onChange={handleEditChange} placeholder="Smart Link / HyperFollow" />
                                            <input name="musixmatchUrl" className="bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.musixmatchUrl || ''} onChange={handleEditChange} placeholder="Musixmatch URL" />
                                            <input name="distrokidManageUrl" className="bg-black/50 border border-white/10 p-2 text-white text-xs font-mono outline-none focus:border-brand-accent" value={editForm.distrokidManageUrl || ''} onChange={handleEditChange} placeholder="DistroKid Admin URL" />
                                        </div>
                                    </div>

                                    {/* Audio - CRITICAL FOR INTERACTION */}
                                    <div className="space-y-1 border-t border-white/10 pt-4">
                                        <label className="text-[9px] text-brand-gold uppercase font-bold flex items-center gap-2">
                                            Source Audio (Dropbox Link)
                                            <span className="bg-brand-gold text-black px-1 rounded text-[8px]">REQUIRED FOR INTERACTIVE MODE</span>
                                        </label>
                                        <input name="audioUrl" className="w-full bg-black/50 border border-brand-gold/30 p-2 text-brand-gold text-xs font-mono outline-none focus:border-brand-gold" value={editForm.audioUrl || ''} onChange={handleEditChange} placeholder="Paste Dropbox DL Link here..." />
                                        {editForm.audioUrl && <audio controls src={convertToDirectStream(editForm.audioUrl)} className="w-full h-8 mt-2" />}
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-4 flex justify-between items-center border-t border-white/10 mt-4">
                                        <button onClick={handleDelete} className="text-red-500 hover:text-white border border-red-900/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded hover:bg-red-900">{t('detail_delete')}</button>
                                        <div className="flex gap-4">
                                            <button onClick={() => setIsEditing(false)} className="text-slate-400 px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:text-white">{t('form_btn_cancel')}</button>
                                            <button onClick={handleSave} disabled={isSaving} className="bg-brand-accent text-slate-900 px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-lg">{isSaving ? t('form_btn_saving') : t('form_btn_save')}</button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="mt-8 flex flex-wrap gap-4">
                                        <button onClick={() => setShowLyricsPlayer(true)} className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all rounded-full" disabled={!song.audioUrl}>
                                            <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center text-black shadow-[0_0_15px_rgba(251,191,36,0.5)]"><svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg></div>
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('detail_btn_immersive')}</span>
                                        </button>
                                    </div>
                                    <div className="mt-6 flex flex-col gap-4 max-w-sm">
                                        {isAdmin ? (
                                            <button onClick={handleStartInteractive} className={`w-full py-4 font-black uppercase tracking-[0.3em] text-xs transition-all shadow-lg ${song.isInteractiveActive ? 'bg-brand-gold text-slate-900 hover:bg-white' : 'bg-red-900 text-white hover:bg-red-700'}`}>
                                                {song.isInteractiveActive ? t('detail_btn_start_session') : t('detail_admin_force')}
                                            </button>
                                        ) : (
                                            song.isInteractiveActive ? (
                                                (isInstrumental || !song.lyrics) ? <div className="w-full py-4 border border-slate-600 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center bg-slate-900 cursor-not-allowed">{t('detail_status_instrumental')}</div> :
                                                <button onClick={handleStartInteractive} className="w-full py-4 bg-brand-gold text-slate-900 font-black uppercase tracking-[0.3em] text-xs hover:bg-white transition-all shadow-lg animate-pulse">{t('detail_btn_start_session')}</button>
                                            ) : <div className="w-full py-4 border border-white/10 text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] text-center bg-black/20">{t('detail_status_closed')}</div>
                                        )}
                                    </div>
                                    {isAdmin && (
                                        <div className="mt-8 w-full max-w-md bg-black/40 border border-white/10 p-5 rounded-lg shadow-xl">
                                            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                                                <div className="w-2 h-2 rounded-full bg-brand-gold animate-pulse"></div>
                                                <p className="text-[10px] text-brand-gold font-black uppercase tracking-[0.2em]">{t('detail_admin_control')}</p>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] text-white uppercase tracking-widest">{t('detail_interactive_status')}</span>
                                                    <button onClick={() => updateSong(song.id, { isInteractiveActive: !song.isInteractiveActive })} className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded ${song.isInteractiveActive ? 'bg-emerald-500 text-black' : 'bg-slate-700 text-slate-400'}`}>{song.isInteractiveActive ? 'Active (ON)' : 'Inactive (OFF)'}</button>
                                                </div>
                                                <div className="pt-4 border-t border-white/5 space-y-3">
                                                    <span className="text-[10px] text-slate-500 uppercase tracking-widest block mb-2">{t('detail_mb_indexing')}</span>
                                                    <div className="flex gap-3">
                                                        {song.musicBrainzId ? (
                                                            <a href={`https://musicbrainz.org/recording/${song.musicBrainzId}`} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 text-[9px] font-black uppercase text-center rounded bg-slate-800 text-white border border-white/10 hover:bg-white hover:text-black transition-all">{t('detail_mb_view')}</a>
                                                        ) : (
                                                            <div className="flex-1 py-2 text-[9px] font-bold uppercase text-center rounded bg-black/40 text-slate-600 border border-white/5">{t('detail_mb_none')}</div>
                                                        )}
                                                        <a href={getMusicBrainzSeedingUrl(song)} target="_blank" rel="noopener noreferrer" className="flex-1 py-2 text-[9px] font-black uppercase text-center rounded bg-purple-600 text-white shadow-lg shadow-purple-900/40 hover:bg-white hover:text-purple-600 transition-all">{t('detail_mb_submit')}</a>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        {isAdmin && !isEditing && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-white/5">
                                {['isrc', 'upc', 'spotifyId', 'musicBrainzId'].map(field => (
                                    <div key={field}>
                                        <span className="text-[9px] text-slate-600 uppercase tracking-[0.4em] block mb-2">{field}</span>
                                        {field === 'musicBrainzId' && (song as any)[field] ? (
                                            <a href={`https://musicbrainz.org/recording/${(song as any)[field]}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-brand-gold hover:underline uppercase">{(song as any)[field]} ↗</a>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[11px] text-slate-400">{(song as any)[field] || '--'}</span>
                                                {field === 'musicBrainzId' && (
                                                    <a href={getMusicBrainzSeedingUrl(song)} target="_blank" rel="noopener noreferrer" className="text-[9px] bg-purple-900/50 text-purple-300 px-2 py-1 rounded hover:bg-purple-600 hover:text-white transition-colors uppercase font-bold">
                                                        Submit
                                                    </a>
                                                )}
                                            </div>
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
                    <div className="flex justify-between items-center mb-8"><h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">{t('detail_section_context')}</h3>{isAdmin && <button onClick={handleAiGenerate} disabled={loadingAi} className="text-[9px] border border-brand-accent/30 text-brand-accent px-4 py-2 uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all">{loadingAi ? t('btn_processing') : t('detail_ai_generate')}</button>}</div>
                    {isAdmin && isEditing ? <textarea className="w-full h-60 bg-black border border-white/10 p-4 text-white text-sm outline-none" value={editForm.description || ''} name="description" onChange={handleEditChange} /> : <div className="text-slate-400 text-sm font-light leading-relaxed whitespace-pre-line">{song.description || t('detail_empty_desc')}</div>}
                </div>
                <div className="bg-slate-900/50 p-10 border border-white/5">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-sm font-black text-white uppercase tracking-[0.4em]">{t('detail_section_lyrics')}</h3>
                        {isAdmin && isEditing && <span className="text-[9px] text-brand-gold bg-brand-gold/10 px-2 py-1 uppercase tracking-widest font-bold">REQUIRED FOR INTERACTIVE</span>}
                    </div>
                    {isAdmin && isEditing ? <textarea className="w-full h-80 bg-black border border-white/10 p-4 text-white text-xs font-mono" value={editForm.lyrics || ''} name="lyrics" onChange={handleEditChange} placeholder="Paste plain text lyrics here..." /> : <div className="font-mono text-xs text-slate-500 whitespace-pre-line leading-loose border-l border-white/5 pl-8">{song.lyrics || t('detail_empty_lyrics')}</div>}
                </div>
            </div>
            <div className="bg-slate-900 p-8 border border-white/5">
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">{t('detail_section_credits')}</h3>
                {isAdmin && isEditing ? <textarea className="w-full h-60 bg-black border border-white/10 p-4 text-white text-xs font-mono" value={editForm.credits || ''} name="credits" onChange={handleEditChange} /> : <div className="text-[10px] text-slate-500 font-mono leading-loose uppercase tracking-wider whitespace-pre-line">{song.credits || t('detail_empty_credits')}</div>}
                <div className="mt-8 pt-8 border-t border-white/5 text-[9px] text-slate-600 font-mono"><p>℗ {new Date(song.releaseDate).getFullYear()} {song.releaseCompany}</p></div>
            </div>
        </div>
    </div>
  );
};

export default SongDetail;
