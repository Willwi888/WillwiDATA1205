
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, getLanguageColor, Language, ReleaseCategory, ProjectType } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

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

interface LyricsLine {
    time: number;
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
        const updateDuration = () => { setDuration(audio.duration); setIsLoading(false); };
        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));
        if (convertedUrl) { audio.play().catch(() => setIsLoading(false)); }
        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
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
                if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [currentTime, lines, hasTime, activeLineIndex]);

    const formatTime = (t: number) => {
        if (isNaN(t)) return "0:00";
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-fade-in">
            <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute inset-0 bg-cover bg-center blur-3xl opacity-40" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
                <div className="absolute inset-0 bg-black/60"></div>
            </div>
            <div className="relative z-10 flex justify-between items-center p-6">
                <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="text-center">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest">{song.title}</h4>
                </div>
                <div className="w-10"></div>
            </div>
            <div className="relative z-10 flex-1 overflow-hidden flex items-center justify-center">
                <div ref={lyricsContainerRef} className="w-full max-w-2xl h-full overflow-y-auto custom-scrollbar px-6 py-20 text-center space-y-12">
                    {lines.map((line, i) => (
                        <p key={i} className={`transition-all duration-700 font-bold ${hasTime ? (i === activeLineIndex ? 'text-4xl text-white' : 'text-xl text-white/20 blur-[1px]') : 'text-2xl text-white/80 my-6'}`}>
                            {line.text}
                        </p>
                    ))}
                </div>
            </div>
            <div className="relative z-20 bg-black/80 p-8">
                <div className="max-w-3xl mx-auto flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <img src={song.coverUrl} className="w-12 h-12 rounded object-cover" alt="" />
                        <div><h3 className="text-white font-black text-sm">{song.title}</h3><p className="text-[10px] text-brand-gold uppercase">{formatTime(currentTime)}</p></div>
                    </div>
                    {convertedUrl && <audio ref={audioRef} src={convertedUrl} crossOrigin="anonymous" className="w-full" controls />}
                </div>
            </div>
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
  const [showLyricsPlayer, setShowLyricsPlayer] = useState(false); 

  useEffect(() => {
    if (id) {
      const found = getSong(id);
      if (found) { setSong(found); setEditForm(found); }
    }
  }, [id, getSong]);

  const convertedAudioUrl = useMemo(() => {
      return song?.audioUrl ? convertToDirectStream(song.audioUrl) : '';
  }, [song?.audioUrl]);

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
    if (await updateSong(id, editForm)) { 
        setSong({ ...song, ...editForm } as Song); 
        setIsEditing(false); 
    }
    setIsSaving(false);
  };
  
  const handleDelete = async () => {
      if (!isAdmin || !song) return;
      if (window.confirm(`確定刪除《${song.title}》？`)) {
          await deleteSong(song.id);
          navigate('/database');
      }
  };

  return (
    <div className="animate-fade pb-32 max-w-7xl mx-auto px-6 pt-10">
        {showLyricsPlayer && <ImmersivePlayer song={song} onClose={() => setShowLyricsPlayer(false)} />}
        <div className="mb-6 flex justify-between items-center">
            <Link to="/database" className="text-[10px] text-slate-500 hover:text-white uppercase tracking-widest">{t('detail_back_link')}</Link>
            {isAdmin && !isEditing && (
                <button onClick={() => setIsEditing(true)} className="text-[10px] border border-brand-accent/50 text-brand-accent px-4 py-2 uppercase tracking-widest hover:bg-brand-accent hover:text-black transition-all font-bold">
                    {t('detail_edit_mode')}
                </button>
            )}
        </div>

        <div className="bg-slate-900 border border-white/5 relative overflow-hidden rounded-xl">
            <div className="absolute inset-0 bg-cover bg-center opacity-10 blur-2xl" style={{ backgroundImage: `url(${song.coverUrl})` }}></div>
            <div className="relative z-10 p-10 flex flex-col md:flex-row gap-12 items-start">
                <div className="w-full md:w-80 flex-shrink-0">
                     <img src={song.coverUrl} className="w-full aspect-square object-cover shadow-2xl border border-white/10 rounded-lg" alt="cover" />
                     {isEditing && (
                         <div className="mt-4 space-y-1">
                             <label className="text-[9px] text-slate-500 uppercase tracking-widest">封面圖片網址</label>
                             <input className="w-full bg-black/50 border border-white/10 p-3 text-white text-xs font-mono" value={editForm.coverUrl || ''} name="coverUrl" placeholder="Cover Image URL" onChange={handleEditChange} />
                         </div>
                     )}
                </div>
                <div className="flex-grow w-full">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 uppercase tracking-widest">{t('form_label_title')}</label>
                                    <input className="text-xl font-bold text-white bg-black/50 border border-white/10 px-4 py-2 w-full outline-none focus:border-brand-accent" value={editForm.title} name="title" onChange={handleEditChange} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 uppercase tracking-widest">{t('form_label_version')}</label>
                                    <input className="text-xl font-bold text-white bg-black/50 border border-white/10 px-4 py-2 w-full outline-none focus:border-brand-accent" value={editForm.versionLabel || ''} name="versionLabel" onChange={handleEditChange} placeholder="e.g. Acoustic" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 uppercase tracking-widest">發行日期</label>
                                    <input className="bg-black/50 border border-white/10 p-3 w-full text-white text-xs" value={editForm.releaseDate} name="releaseDate" type="date" onChange={handleEditChange} />
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded mt-4">
                                    <input type="checkbox" name="isOfficialExclusive" checked={editForm.isOfficialExclusive} onChange={handleEditChange} className="w-4 h-4 accent-brand-gold" />
                                    <span className="text-xs text-brand-gold font-bold">官網獨家作品</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 uppercase tracking-widest">ISRC</label>
                                    <input className="w-full bg-black/50 border border-white/10 p-3 text-white text-xs font-mono" value={editForm.isrc || ''} name="isrc" placeholder="ISRC Code" onChange={handleEditChange} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 uppercase tracking-widest">UPC</label>
                                    <input className="w-full bg-black/50 border border-white/10 p-3 text-white text-xs font-mono" value={editForm.upc || ''} name="upc" placeholder="UPC Code" onChange={handleEditChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] text-brand-accent uppercase tracking-widest">主音源網址 (Audio URL)</label>
                                    <input className="w-full bg-black/50 border border-brand-accent/30 p-3 text-white text-xs font-mono" value={editForm.audioUrl || ''} name="audioUrl" placeholder="Direct Audio Link" onChange={handleEditChange} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] text-slate-500 uppercase tracking-widest">外部/自定義連結</label>
                                    <input className="w-full bg-black/50 border border-white/10 p-3 text-white text-xs font-mono" value={editForm.customAudioLink || ''} name="customAudioLink" placeholder="備用音源或外部連結" onChange={handleEditChange} />
                                </div>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-xs text-slate-400 font-bold uppercase tracking-widest">取消</button>
                                <button onClick={handleSave} className="px-8 py-2 bg-brand-accent text-slate-950 text-xs font-black uppercase rounded shadow-lg tracking-widest">儲存變更</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-2 leading-none">{song.title}</h1>
                            {song.versionLabel && <h2 className="text-xl md:text-2xl font-bold text-slate-500 uppercase tracking-widest mb-4">{song.versionLabel}</h2>}
                            
                            <div className="flex flex-wrap items-center gap-4 mt-6">
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white ${getLanguageColor(song.language)}`}>{song.language}</span>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">{song.releaseDate}</span>
                                {song.isOfficialExclusive && <span className="bg-brand-gold text-slate-950 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.5)]">官網獨家</span>}
                                
                                {song.isrc && (
                                    <span className="bg-brand-gold/20 border border-brand-gold/80 text-brand-gold text-[10px] font-mono px-3 py-1 rounded-sm uppercase tracking-widest font-bold">
                                        ISRC: {song.isrc}
                                    </span>
                                )}
                            </div>

                            {/* Persistent Audio Player */}
                            <div className="mt-8 bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-md max-w-md">
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.4em] mb-3">Official Stream Preview</p>
                                {convertedAudioUrl ? (
                                    <audio src={convertedAudioUrl} controls className="w-full h-8 accent-brand-gold" />
                                ) : (
                                    <p className="text-[10px] text-slate-600 italic">No audio preview link available.</p>
                                )}
                            </div>

                            <div className="mt-8 flex flex-wrap gap-4">
                                <button onClick={() => setShowLyricsPlayer(true)} className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all rounded-full" disabled={!song.audioUrl}>
                                    <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center text-black shadow-[0_0_15px_rgba(251,191,36,0.5)]"><svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('detail_btn_immersive')}</span>
                                </button>
                                {song.customAudioLink && (
                                    <a href={song.customAudioLink} target="_blank" rel="noopener noreferrer" className="px-6 py-3 border border-white/20 text-slate-400 hover:text-white rounded-full text-[10px] font-bold uppercase tracking-widest transition-all">
                                        外部連結
                                    </a>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
            <div className="lg:col-span-2 space-y-12">
                <div className="bg-slate-900/50 p-10 border border-white/5 rounded-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8">{t('detail_section_context')}</h3>
                    {isEditing ? (
                        <textarea name="description" className="w-full h-40 bg-black/50 border border-white/10 p-4 text-white text-sm outline-none focus:border-brand-accent font-light leading-relaxed" value={editForm.description || ''} onChange={handleEditChange} placeholder="作品創作背景描述..." />
                    ) : (
                        <div className="text-slate-400 text-sm font-light leading-relaxed whitespace-pre-line">{song.description || t('detail_empty_desc')}</div>
                    )}
                </div>
                <div className="bg-slate-900/50 p-10 border border-white/5 rounded-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8">{t('detail_section_lyrics')}</h3>
                    {isEditing ? (
                        <textarea name="lyrics" className="w-full h-80 bg-black/50 border border-white/10 p-6 text-brand-accent text-xs font-mono leading-loose outline-none focus:border-brand-accent" value={editForm.lyrics || ''} onChange={handleEditChange} placeholder="[00:10.00] 歌詞內容..." />
                    ) : (
                        <div className="font-mono text-xs text-slate-500 whitespace-pre-line leading-loose border-l border-white/5 pl-8">{song.lyrics || t('detail_empty_lyrics')}</div>
                    )}
                </div>
            </div>
            <div className="bg-slate-900 p-8 border border-white/5 rounded-xl">
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">{t('detail_section_credits')}</h3>
                {isEditing ? (
                    <textarea name="credits" className="w-full h-80 bg-black/50 border border-white/10 p-4 text-slate-400 text-[10px] font-mono leading-loose outline-none focus:border-brand-accent uppercase tracking-wider" value={editForm.credits || ''} onChange={handleEditChange} placeholder="Production Credits..." />
                ) : (
                    <div className="text-[10px] text-slate-500 font-mono leading-loose uppercase tracking-wider whitespace-pre-line">{song.credits || t('detail_empty_credits')}</div>
                )}
                {isAdmin && !isEditing && (
                    <div className="mt-10 pt-10 border-t border-white/5">
                        <button onClick={handleDelete} className="text-red-900 hover:text-red-500 text-[10px] font-black uppercase tracking-widest">{t('detail_delete')}</button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default SongDetail;
