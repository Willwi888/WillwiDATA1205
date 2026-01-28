
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
  const [duration, setDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  // Sync Pro Logic
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
    
    // Aesthetic feedback
    if (window.navigator.vibrate) window.navigator.vibrate(20);
  }, [isPaused, currentLineIndex, lyricsLines]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (mode === 'playing') {
            if (e.code === 'Space') {
                e.preventDefault();
                handleCapture();
            }
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
              setIsAudioLoading(true);
              setAudioError(null);
              await audioRef.current.play();
              setIsPaused(false);
              setIsAudioLoading(false);
              if (currentLineIndex === -1) setCurrentLineIndex(0);
          } catch (e) {
              setAudioError("Stream unreachable.");
              setIsPaused(true);
              setIsAudioLoading(false);
              showToast("音軌加載失敗，請檢查權限連結", "error");
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

  const generateLRC = () => {
      return timestamps.map(ts => {
          const m = Math.floor(ts.time / 60).toString().padStart(2, '0');
          const s = (ts.time % 60).toFixed(2).padStart(5, '0');
          return `[${m}:${s}]${ts.text}`;
      }).join('\n');
  };

  const handleFinish = async () => {
      if (isAdmin && selectedSong) {
          const lrc = generateLRC();
          const confirmSync = window.confirm("管理員權限偵測：是否要將此對位結果回填至資料庫？");
          if (confirmSync) {
              await updateSong(selectedSong.id, { lyrics: lrc });
              showToast("同步成功：LRC 資料已回填雲端", "success");
          }
      }
      setMode('mastered');
  };

  const currentAudioSrc = useMemo(() => {
      if (!selectedSong || mode !== 'playing') return '';
      // Audio Robustness: Use the enhanced resolveDirectLink
      return resolveDirectLink(selectedSong.audioUrl || selectedSong.dropboxUrl || '');
  }, [selectedSong, mode]);

  return (
    <div className="min-h-screen bg-black pt-32 pb-40 relative flex flex-col items-center justify-center px-10">
      
      <div className="fixed inset-0 pointer-events-none opacity-20 blur-[100px]">
          {selectedSong && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selectedSong.coverUrl})` }}></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-5xl text-center">
           {mode === 'intro' && (
               <div className="space-y-12 animate-fade-in-up">
                   <h2 className="text-brand-gold font-black uppercase tracking-[0.5em] text-sm">Interactive Studio</h2>
                   <p className="text-3xl md:text-5xl font-black leading-relaxed tracking-widest text-white uppercase italic">
                       {t('manifesto_content').split('\n').map((l, i) => <React.Fragment key={i}>{l}<br/></React.Fragment>)}
                   </p>
                   <button onClick={() => setMode(isSessionUnlocked() ? 'select' : 'unlock')} className="w-full py-12 bg-white text-black font-black uppercase text-xl hover:bg-brand-gold transition-all shadow-2xl active:scale-95 duration-700">
                       {t('btn_start_studio')}
                   </button>
               </div>
           )}

           {mode === 'unlock' && (
               <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-16 rounded-sm shadow-2xl animate-blur-in max-w-lg mx-auto w-full">
                   <h3 className="text-brand-gold font-black uppercase tracking-widest text-xs mb-10">Access Verification</h3>
                   <input type="password" placeholder="••••" className="w-full bg-black/60 border border-white/10 px-6 py-6 text-white text-center tracking-[0.8em] text-4xl mb-6 outline-none focus:border-brand-gold transition-all font-mono" value={unlockInput} onChange={(e) => setUnlockInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVerifyUnlock()} />
                   <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-10">請輸入由 Willwi 提供的互動通行碼</p>
                   <div className="space-y-4">
                        <button onClick={handleVerifyUnlock} className="w-full py-5 bg-brand-gold text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-all">Authorize Entry</button>
                        {isAdmin && <button onClick={() => setMode('select')} className="w-full py-4 text-brand-accent text-[9px] font-black uppercase tracking-widest border border-brand-accent/20">Admin: Bypass Lock</button>}
                   </div>
               </div>
           )}

           {mode === 'select' && (
               <div className="w-full space-y-16 animate-fade-in">
                   <div className="flex justify-between items-center border-b border-white/5 pb-6">
                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Choose a Work</h2>
                        <span className="text-[10px] text-slate-500 font-mono">AVAILABLE FOR SYNC: {songs.length}</span>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {songs.filter(s => s.isInteractiveActive || isAdmin).map(s => (
                           <div key={s.id} onClick={() => { setSelectedSong(s); setMode('philosophy'); }} className="p-6 bg-white/[0.02] border border-white/5 hover:border-brand-gold cursor-pointer transition-all flex items-center gap-6 group rounded-sm hover:bg-white/[0.05]">
                               <img src={s.coverUrl} className="w-16 h-16 object-cover shadow-lg group-hover:scale-110 transition-transform" alt="" />
                               <div className="text-left flex-1 overflow-hidden">
                                   <h4 className="text-white font-bold uppercase tracking-widest truncate group-hover:text-brand-gold">{s.title}</h4>
                                   <p className="text-[9px] text-slate-500 mt-2 font-mono">{s.isrc || s.releaseDate}</p>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {mode === 'philosophy' && (
               <div className="space-y-12 animate-fade-in max-w-2xl mx-auto text-center">
                   <h2 className="text-brand-gold font-black uppercase tracking-widest text-xs">A Moment of Intent</h2>
                   <p className="text-2xl md:text-4xl text-white leading-loose font-medium italic">{t('before_start_content')}</p>
                   <button onClick={() => setMode('guide')} className="px-16 py-8 bg-white text-black font-black uppercase tracking-widest hover:bg-brand-gold transition-all shadow-xl">{t('btn_understand')}</button>
               </div>
           )}

           {mode === 'guide' && (
               <div className="bg-slate-950 p-16 rounded shadow-2xl animate-fade-in space-y-12 border border-white/5 max-w-2xl mx-auto">
                   <h3 className="text-brand-gold font-black uppercase tracking-widest text-xs">Sync Pro Protocol</h3>
                   <div className="space-y-8">
                        <p className="text-white text-3xl leading-relaxed tracking-[0.1em] font-black uppercase">當旋律與歌詞相遇時點擊。<br/><span className="text-brand-accent">或按 [ 空白鍵 ] 即時對位。</span></p>
                        <p className="text-slate-500 text-sm uppercase tracking-widest leading-loose">對位結束後，系統會生成專屬於你的 LRC 指標，並在未來用於 Cinema Player 播放。</p>
                   </div>
                   <button onClick={() => setMode('playing')} className="w-full py-8 bg-brand-gold text-black font-black uppercase tracking-[0.4em] hover:bg-white transition-all shadow-2xl">Start Recording</button>
               </div>
           )}

           {mode === 'playing' && selectedSong && (
               <div className="w-full space-y-12 animate-fade-in">
                   <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/5 p-8 flex flex-col md:flex-row items-center gap-10 rounded-sm shadow-2xl relative overflow-hidden">
                       {isAudioLoading && <div className="absolute bottom-0 left-0 h-1 bg-brand-accent animate-pulse w-full opacity-50"></div>}
                       <button onClick={handleTogglePlay} disabled={isAudioLoading} className="w-20 h-20 bg-brand-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 transition-all">
                           {isAudioLoading ? <div className="w-6 h-6 border-4 border-black border-t-transparent rounded-full animate-spin"></div> : (isPaused ? <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>)}
                       </button>
                       <div className="text-left flex-1">
                           <h2 className="text-white font-black text-2xl uppercase tracking-[0.2em]">{selectedSong.title}</h2>
                           <div className="flex items-center gap-4 mt-2">
                               <p className="text-brand-gold font-mono text-[10px] uppercase tracking-widest">Captured: {timestamps.length} / {lyricsLines.length}</p>
                               {audioError && <span className="text-rose-500 text-[9px] font-black uppercase">{audioError}</span>}
                           </div>
                       </div>
                   </div>

                   <div className="h-[50vh] overflow-y-auto custom-scrollbar space-y-24 py-32 border-y border-white/5 relative">
                        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none"></div>
                        
                        {lyricsLines.map((line, idx) => (
                           <div 
                                key={idx} 
                                onClick={handleCapture}
                                className={`text-4xl md:text-7xl font-black uppercase tracking-tighter cursor-pointer transition-all duration-700 select-none ${idx === currentLineIndex ? 'text-white opacity-100 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]' : (idx < currentLineIndex ? 'text-brand-gold opacity-10' : 'text-slate-900 opacity-20 hover:opacity-40')}`}
                            >
                               {line}
                           </div>
                        ))}
                        
                        <div className="py-24">
                            <button 
                                onClick={handleFinish} 
                                disabled={timestamps.length === 0}
                                className={`px-20 py-8 text-black font-black uppercase text-xs tracking-[0.5em] transition-all shadow-2xl ${timestamps.length > 0 ? 'bg-white hover:bg-brand-gold' : 'bg-slate-800 opacity-20'}`}
                            >
                                Finish Sync Recording
                            </button>
                        </div>
                   </div>
               </div>
           )}

           {mode === 'mastered' && (
               <div className="text-center space-y-16 animate-fade-in-up">
                   <h2 className="text-7xl md:text-[10rem] font-black text-white uppercase italic tracking-tighter leading-none">Synced.</h2>
                   <p className="text-slate-500 uppercase tracking-[0.8em] font-black opacity-60">你的感官對位已記錄。這段作品已在雲端留下了屬於你的時間脈絡。</p>
                   <div className="flex flex-col md:flex-row gap-6 justify-center">
                        <button onClick={() => navigate('/database')} className="px-12 py-6 border border-white/10 text-white font-black uppercase text-[10px] tracking-[0.6em] hover:bg-white hover:text-black transition-all">Catalog</button>
                        <button onClick={() => { setMode('intro'); window.location.reload(); }} className="px-12 py-6 bg-brand-gold text-black font-black uppercase text-[10px] tracking-[0.6em] hover:bg-white transition-all shadow-xl">New Session</button>
                   </div>
               </div>
           )}
      </div>

      <audio 
        key={`${selectedSong?.id}-${mode}`}
        ref={audioRef} 
        src={currentAudioSrc} 
        crossOrigin="anonymous"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onWaiting={() => setIsAudioLoading(true)}
        onCanPlay={() => setIsAudioLoading(false)}
        onError={() => { setIsAudioLoading(false); setAudioError("Resource Error"); }}
      />
    </div>
  );
}; export default Interactive;
