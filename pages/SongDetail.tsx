
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Song, getLanguageColor, Language, ReleaseCategory, ProjectType } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';

// 強化版直連轉換器
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
                </div>
                <div className="flex-grow w-full">
                    {isEditing ? (
                        <div className="space-y-4">
                            <input className="text-3xl font-black text-white bg-black/50 border-b border-white/20 px-4 py-2 w-full outline-none focus:border-brand-accent" value={editForm.title} name="title" onChange={handleEditChange} />
                            <div className="grid grid-cols-2 gap-4">
                                <input className="bg-black/50 border border-white/10 p-3 text-white text-xs" value={editForm.releaseDate} name="releaseDate" type="date" onChange={handleEditChange} />
                                <div className="flex items-center gap-3 p-3 bg-slate-800 rounded">
                                    <input type="checkbox" name="isOfficialExclusive" checked={editForm.isOfficialExclusive} onChange={handleEditChange} className="w-4 h-4" />
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
                            <input className="w-full bg-black/50 border border-white/10 p-3 text-white text-xs font-mono" value={editForm.cloudVideoUrl} name="cloudVideoUrl" placeholder="雲端影音網址 (僅供線上觀看)" onChange={handleEditChange} />
                            <div className="pt-4 flex justify-end gap-3">
                                <button onClick={() => setIsEditing(false)} className="px-6 py-2 text-xs text-slate-400">取消</button>
                                <button onClick={handleSave} className="px-8 py-2 bg-brand-accent text-slate-950 text-xs font-black uppercase rounded shadow-lg">儲存變更</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-4 leading-none">{song.title}</h1>
                            <div className="flex flex-wrap items-center gap-4 mt-6">
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white ${getLanguageColor(song.language)}`}>{song.language}</span>
                                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">{song.releaseDate}</span>
                                {song.isOfficialExclusive && <span className="bg-brand-gold text-slate-950 text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest shadow-[0_0_10px_rgba(251,191,36,0.5)]">官網獨家</span>}
                                
                                {song.isrc && (
                                    <span className="bg-brand-gold/20 border border-brand-gold/80 text-brand-gold text-[10px] font-mono px-3 py-1 rounded-sm uppercase tracking-widest animate-[glowPulse_4s_infinite] shadow-[0_0_20px_rgba(251,191,36,0.4)] font-bold">
                                        ISRC: {song.isrc}
                                    </span>
                                )}
                                {song.upc && (
                                    <span className="bg-brand-gold/20 border border-brand-gold/80 text-brand-gold text-[10px] font-mono px-3 py-1 rounded-sm uppercase tracking-widest animate-[glowPulse_4s_infinite] shadow-[0_0_20px_rgba(251,191,36,0.4)] font-bold delay-500">
                                        UPC: {song.upc}
                                    </span>
                                )}
                            </div>
                            <div className="mt-8 flex flex-wrap gap-4">
                                <button onClick={() => setShowLyricsPlayer(true)} className="group flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all rounded-full" disabled={!song.audioUrl}>
                                    <div className="w-8 h-8 rounded-full bg-brand-gold flex items-center justify-center text-black shadow-[0_0_15px_rgba(251,191,36,0.5)]"><svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" /></svg></div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('detail_btn_immersive')}</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* 官網獨家影音區塊 - 線上欣賞模式 */}
        {!isEditing && song.isOfficialExclusive && song.cloudVideoUrl && (
            <div className="mt-12 bg-slate-900 border border-brand-gold/30 rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
                <div className="bg-brand-gold/10 px-8 py-4 border-b border-brand-gold/20 flex items-center justify-between">
                    <h3 className="text-[10px] font-black text-brand-gold uppercase tracking-[0.4em]">官網獨家影音 VAULT</h3>
                    <span className="text-[8px] text-brand-gold/50 font-bold uppercase tracking-widest">AUTHENTIC CONTENT</span>
                </div>
                <div className="p-10 flex flex-col md:flex-row items-center gap-10">
                    <div className="w-20 h-20 bg-brand-gold/10 rounded-full flex items-center justify-center text-brand-gold border border-brand-gold/30 flex-shrink-0">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <div className="flex-grow text-center md:text-left">
                        <h4 className="text-2xl font-black text-white uppercase tracking-tight mb-2">專屬高品質影像檔案</h4>
                        <p className="text-sm text-slate-400 font-light leading-relaxed">
                            這是為官網贊助者與聽眾準備的獨家高品質影片檔案。點擊下方按鈕即可在受保護的空間中「立即觀賞」完整作品。
                        </p>
                    </div>
                    <a 
                        href={song.cloudVideoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="w-full md:w-auto px-12 py-5 bg-brand-gold text-slate-950 font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-lg rounded-full text-center"
                    >
                        立即觀賞
                    </a>
                </div>
            </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-12">
            <div className="lg:col-span-2 space-y-12">
                <div className="bg-slate-900/50 p-10 border border-white/5 rounded-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8">{t('detail_section_context')}</h3>
                    <div className="text-slate-400 text-sm font-light leading-relaxed whitespace-pre-line">{song.description || t('detail_empty_desc')}</div>
                </div>
                <div className="bg-slate-900/50 p-10 border border-white/5 rounded-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.4em] mb-8">{t('detail_section_lyrics')}</h3>
                    <div className="font-mono text-xs text-slate-500 whitespace-pre-line leading-loose border-l border-white/5 pl-8">{song.lyrics || t('detail_empty_lyrics')}</div>
                </div>
            </div>
            <div className="bg-slate-900 p-8 border border-white/5 rounded-xl">
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.4em] mb-6">{t('detail_section_credits')}</h3>
                <div className="text-[10px] text-slate-500 font-mono leading-loose uppercase tracking-wider whitespace-pre-line">{song.credits || t('detail_empty_credits')}</div>
                {isAdmin && (
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
