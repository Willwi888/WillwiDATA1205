
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useToast } from '../components/Layout';

type InteractionMode = 'intro' | 'unlock' | 'select' | 'philosophy' | 'guide' | 'playing' | 'mastered';
const STUDIO_SESSION_KEY = 'willwi_studio_unlocked';

interface SyncTimestamp {
    time: number;
    text: string;
}

const Interactive: React.FC = () => {
  const { songs, globalSettings, updateSong } = useData();
  const { isAdmin } = useUser();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [unlockInput, setUnlockInput] = useState('');
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [timestamps, setTimestamps] = useState<SyncTimestamp[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);

  const isSessionUnlocked = useCallback(() => {
    return isAdmin || sessionStorage.getItem(STUDIO_SESSION_KEY) === 'true';
  }, [isAdmin]);

  const lyricsLines = useMemo(() => {
    return selectedSong?.lyrics ? selectedSong.lyrics.split('\n').filter(l => l.trim().length > 0) : [];
  }, [selectedSong]);

  const handleCapture = useCallback(() => {
    if (isPaused || !audioRef.current || currentLineIndex >= lyricsLines.length) return;
    const time = audioRef.current.currentTime;
    const text = lyricsLines[currentLineIndex];
    setTimestamps(prev => [...prev, { time, text }]);
    setCurrentLineIndex(prev => prev + 1);
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  }, [isPaused, currentLineIndex, lyricsLines]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (mode === 'playing' && e.code === 'Space') {
            e.preventDefault();
            handleCapture();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleCapture]);

  useEffect(() => {
    if (location.state?.targetSongId) {
        const s = songs.find(x => x.id === location.state.targetSongId);
        if (s) { 
          setSelectedSong(s); 
          setMode(isSessionUnlocked() ? 'philosophy' : 'unlock'); 
        }
    }
  }, [location.state, songs, isSessionUnlocked]);

  const handleTogglePlay = async () => {
      if (!audioRef.current) return;
      if (isPaused) {
          try {
              await audioRef.current.play();
              setIsPaused(false);
              if (currentLineIndex === -1) setCurrentLineIndex(0);
          } catch (e) {
              showToast("無法播放音訊串流", "error");
          }
      } else {
          audioRef.current.pause();
          setIsPaused(true);
      }
  };

  const handleVerifyUnlock = () => {
    if (unlockInput === (globalSettings.accessCode || '8888')) {
      sessionStorage.setItem(STUDIO_SESSION_KEY, 'true');
      setMode(selectedSong ? 'philosophy' : 'select');
    } else {
      showToast("通行碼錯誤", "error");
    }
  };

  const handleFinish = async () => {
      if (isAdmin && selectedSong) {
          const lrc = timestamps.map(ts => {
            const m = Math.floor(ts.time / 60).toString().padStart(2, '0');
            const s = (ts.time % 60).toFixed(2).padStart(5, '0');
            return `[${m}:${s}]${ts.text}`;
          }).join('\n');
          if (window.confirm("管理員：是否將對時結果同步至雲端資料庫？")) {
              await updateSong(selectedSong.id, { lyrics: lrc });
              showToast("雲端同步完成", "success");
          }
      }
      setMode('mastered');
  };

  const currentAudioSrc = useMemo(() => {
      if (!selectedSong || mode !== 'playing') return '';
      return resolveDirectLink(selectedSong.audioUrl || selectedSong.dropboxUrl || '');
  }, [selectedSong, mode]);

  return (
    <div className="min-h-screen bg-black pt-32 pb-40 relative flex flex-col items-center justify-center px-10">
      <div className="fixed inset-0 pointer-events-none opacity-20 blur-[100px]">
          {selectedSong && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selectedSong.coverUrl})` }}></div>}
      </div>

      <div className="relative z-10 w-full max-w-5xl text-center">
           {mode === 'intro' && (
               <div className="space-y-20 animate-fade-in-up">
                   <h2 className="text-brand-gold font-black uppercase tracking-[0.8em] text-[11px]">INTERACTIVE STUDIO</h2>
                   <div className="space-y-6">
                       <p className="text-4xl md:text-7xl font-black leading-[1.1] tracking-tighter text-white uppercase">
                           {t('manifesto_content').split('\n').map((l, i) => <React.Fragment key={i}>{l}<br/></React.Fragment>)}
                       </p>
                   </div>
                   <button onClick={() => setMode(isSessionUnlocked() ? 'select' : 'unlock')} className="px-24 py-8 bg-white text-black font-black uppercase text-sm tracking-[0.8em] hover:bg-brand-gold transition-all duration-700 shadow-2xl">
                       {t('btn_start_studio')}
                   </button>
               </div>
           )}

           {mode === 'unlock' && (
               <div className="bg-slate-950/80 border border-white/5 p-20 rounded-sm shadow-2xl animate-blur-in max-w-lg mx-auto w-full">
                   <h3 className="text-brand-gold font-black uppercase tracking-[0.4em] text-[10px] mb-12">Authorization Required</h3>
                   <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-8 text-white text-center tracking-[1em] text-5xl mb-10 outline-none focus:border-brand-gold transition-all font-mono" value={unlockInput} onChange={(e) => setUnlockInput(e.target.value)} autoFocus />
                   <button onClick={handleVerifyUnlock} className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-widest hover:bg-brand-gold transition-all">Unlock Entrance</button>
               </div>
           )}

           {mode === 'select' && (
               <div className="w-full space-y-20 animate-fade-in">
                   <div className="text-left">
                       <h2 className="text-6xl font-black text-white uppercase tracking-tighter mb-4">Choose a Work</h2>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Select a production to begin the synchronization</p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                       {songs.filter(s => s.isInteractiveActive || isAdmin).map(s => (
                           <div key={s.id} onClick={() => { setSelectedSong(s); setMode('philosophy'); }} className="p-8 bg-white/[0.02] border border-white/5 hover:border-brand-gold cursor-pointer transition-all flex items-center gap-8 group rounded-sm hover:bg-white/[0.05] shadow-xl">
                               <div className="w-20 h-20 bg-slate-900 border border-white/10 overflow-hidden">
                                   <img src={s.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                               </div>
                               <div className="text-left flex-1 min-w-0">
                                   <h4 className="text-white font-black uppercase tracking-widest truncate group-hover:text-brand-gold">{s.title}</h4>
                                   <p className="text-[9px] text-slate-500 mt-2 font-mono">{s.releaseDate.split('-')[0]}</p>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {mode === 'philosophy' && (
               <div className="space-y-16 animate-fade-in max-w-4xl mx-auto text-center">
                   <span className="text-brand-gold font-black uppercase tracking-[0.4em] text-[10px]">A MOMENT OF INTENT</span>
                   <p className="text-3xl md:text-5xl text-white leading-[1.3] font-black uppercase tracking-tight">{t('before_start_content')}</p>
                   <button onClick={() => setMode('guide')} className="px-20 py-10 bg-white text-black font-black uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-2xl">{t('btn_understand')}</button>
               </div>
           )}

           {mode === 'playing' && selectedSong && (
               <div className="w-full space-y-20 animate-fade-in">
                   <div className="bg-slate-950/60 backdrop-blur-3xl border border-white/5 p-10 flex flex-col md:flex-row items-center gap-12 rounded-sm shadow-2xl">
                       <button onClick={handleTogglePlay} className="w-24 h-24 bg-brand-gold rounded-full flex items-center justify-center text-black shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:scale-110 transition-transform">
                           {isPaused ? <svg className="w-10 h-10 ml-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
                       </button>
                       <div className="text-left flex-1">
                           <h2 className="text-white font-black text-4xl uppercase tracking-tighter mb-2">{selectedSong.title}</h2>
                           <div className="flex items-center gap-6">
                               <span className="text-brand-gold font-mono text-[11px] font-bold uppercase tracking-widest">Progress: {timestamps.length} / {lyricsLines.length}</span>
                               <span className="text-slate-600 font-mono text-[10px] font-bold uppercase tracking-widest">[ SPACE ] TO SYNC</span>
                           </div>
                       </div>
                   </div>
                   <div className="h-[60vh] overflow-y-auto custom-scrollbar space-y-32 py-40 border-y border-white/5 relative">
                        {lyricsLines.map((line, idx) => (
                           <div key={idx} onClick={handleCapture} className={`text-4xl md:text-8xl font-black uppercase tracking-tighter cursor-pointer transition-all duration-1000 ${idx === currentLineIndex ? 'text-white opacity-100 scale-105' : (idx < currentLineIndex ? 'text-brand-gold opacity-10' : 'text-slate-900 opacity-20')}`}>
                               {line}
                           </div>
                        ))}
                        <div className="py-40">
                            <button onClick={handleFinish} className="px-24 py-10 bg-white text-black font-black uppercase text-sm tracking-[0.6em] hover:bg-brand-gold transition-all shadow-2xl">Complete Production</button>
                        </div>
                   </div>
               </div>
           )}

           {mode === 'mastered' && (
               <div className="text-center space-y-20 animate-fade-in-up">
                   <h2 className="text-8xl md:text-[14rem] font-black text-white uppercase tracking-tighter leading-none">SYNCED.</h2>
                   <p className="text-slate-500 uppercase tracking-[0.6em] font-black opacity-60 text-sm">您的感官對位已完成。作品在雲端留下了屬於您的時間脈絡。</p>
                   <button onClick={() => navigate('/database')} className="px-16 py-8 bg-white text-black font-black uppercase text-[11px] tracking-[0.5em] hover:bg-brand-gold transition-all">Back to Catalog</button>
               </div>
           )}
      </div>

      <audio ref={audioRef} src={currentAudioSrc} crossOrigin="anonymous" onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} />
    </div>
  );
}; export default Interactive;
