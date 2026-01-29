
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { useToast } from '../components/Layout';

type InteractionMode = 'intro' | 'unlock' | 'select' | 'philosophy' | 'playing' | 'mastered';
const STUDIO_SESSION_KEY = 'willwi_studio_unlocked';

interface SyncTimestamp {
    time: number;
    text: string;
}

const Interactive: React.FC = () => {
  const { songs, globalSettings, updateSong, playSong, currentSong, isPlaying: isGlobalPlaying } = useData();
  const { isAdmin } = useUser();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [unlockInput, setUnlockInput] = useState('');
  const [isPaused, setIsPaused] = useState(true);
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
    <div className="min-h-screen pt-32 pb-40 relative flex flex-col items-center justify-center px-10 bg-transparent">
      
      <div className="relative z-10 w-full text-center">
           {mode === 'intro' && (
               <div className="space-y-24 animate-fade-in-up flex flex-col items-center">
                   <h2 className="text-white/30 font-medium uppercase tracking-[0.8em] text-[10px] md:text-xs">INTERACTIVE STUDIO</h2>
                   
                   <div className="max-w-6xl space-y-8">
                       {[
                           "選擇：於作品庫挑選欲對位之曲目",
                           "對時：隨旋律節奏點擊進行感官同步",
                           "生成：自動產出專屬手作對位影像",
                           "永恆：將您的時間脈絡留存於雲端"
                       ].map((line, i) => (
                           <p key={i} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white uppercase whitespace-nowrap drop-shadow-2xl">
                               {line}
                           </p>
                       ))}
                   </div>

                   <div className="pt-20">
                       <button 
                         onClick={() => setMode(isSessionUnlocked() ? 'select' : 'unlock')} 
                         className="w-[480px] h-28 bg-white text-black font-black uppercase text-xl tracking-[1.2em] hover:bg-brand-gold transition-all duration-700 shadow-2xl rounded-none flex items-center justify-center pl-[1.2em] hover:scale-105"
                       >
                           進入工作室
                       </button>
                   </div>
               </div>
           )}

           {mode === 'unlock' && (
               <div className="animate-blur-in max-w-lg mx-auto w-full space-y-12">
                   <h3 className="text-brand-gold font-medium uppercase tracking-[0.4em] text-xs">Authorization Required</h3>
                   <input type="password" placeholder="••••" className="w-full bg-black/40 backdrop-blur-xl border border-white/10 px-6 py-10 text-white text-center tracking-[1em] text-6xl outline-none focus:border-brand-gold transition-all font-mono" value={unlockInput} onChange={(e) => setUnlockInput(e.target.value)} autoFocus />
                   <button onClick={handleVerifyUnlock} className="w-full py-8 bg-white text-black font-medium uppercase text-sm tracking-widest hover:bg-brand-gold transition-all">Unlock Entrance</button>
               </div>
           )}

           {mode === 'select' && (
               <div className="w-full space-y-20 animate-fade-in max-w-6xl">
                   <div className="text-left border-b border-white/10 pb-10">
                       <h2 className="text-6xl font-medium text-white uppercase tracking-tighter mb-4">Choose a Work</h2>
                       <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Select a production to begin the synchronization</p>
                   </div>
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12">
                       {songs.filter(s => s.isInteractiveActive || isAdmin).map(s => (
                           <div key={s.id} className="group cursor-pointer flex flex-col items-center" onClick={() => { setSelectedSong(s); setMode('philosophy'); }}>
                               <div className="aspect-square w-full relative overflow-hidden bg-slate-900 border border-white/5 group-hover:border-white/20 transition-all shadow-2xl mb-6">
                                   <img src={s.coverUrl} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110" alt="" />
                               </div>
                               <h4 className="text-xs font-medium text-white uppercase tracking-widest truncate group-hover:text-brand-gold transition-colors">{s.title}</h4>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {mode === 'philosophy' && (
               <div className="animate-fade-in max-w-5xl mx-auto flex flex-col items-center gap-20">
                   <div className="bg-black/60 backdrop-blur-3xl border border-white/5 p-20 rounded-none shadow-2xl text-left space-y-16">
                       <h3 className="text-brand-gold font-medium uppercase tracking-[0.4em] text-lg">歌詞同步對位邀請</h3>
                       <p className="text-2xl md:text-3xl text-slate-300 leading-relaxed font-medium">
                           這是一個專屬創作者與聽眾的共感空間。您可以挑選曲目並提交「動態歌詞對時」請求，Willwi 將親自為您製作專屬的沈浸式影音內容。
                       </p>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-20 pt-16 border-t border-white/5">
                           <div className="space-y-6">
                               <h4 className="text-white font-medium uppercase tracking-widest text-sm">勞務支持</h4>
                               <p className="text-sm text-slate-500 leading-loose">相關費用係用於支付手工對位與高畫質影片所需的運算製作資源。</p>
                           </div>
                           <div className="space-y-6">
                               <h4 className="text-white font-medium uppercase tracking-widest text-sm">共創邀請</h4>
                               <p className="text-sm text-slate-500 leading-loose">我們相信歌詞不只是文字。當歌詞與時間產生關係，聽眾能更貼近創作者的情緒。</p>
                           </div>
                       </div>
                   </div>
                   <button onClick={() => setMode('playing')} className="px-32 py-10 bg-white text-black font-black uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-2xl rounded-full flex items-center gap-8 group">
                       挑 選 作 品 開 始 共 創
                       <span className="transform group-hover:translate-x-3 transition-transform text-2xl">→</span>
                   </button>
               </div>
           )}

           {mode === 'playing' && selectedSong && (
               <div className="w-full h-screen fixed inset-0 flex flex-col items-center justify-center animate-fade-in bg-transparent">
                   <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-center gap-24 px-20 relative z-10">
                       <div className="flex-1 text-center md:text-left">
                           <p className="text-5xl md:text-8xl font-bold text-white tracking-tighter uppercase leading-[1.1] transition-all duration-500 drop-shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                               {currentLineIndex === -1 ? '準備開始...' : (lyricsLines[currentLineIndex] || '對時完成')}
                           </p>
                       </div>
                       
                       <div className="w-full md:w-[480px] shrink-0 space-y-12">
                           <div className="relative group aspect-square shadow-[0_50px_100px_rgba(0,0,0,1)] rounded-sm overflow-hidden border border-white/10">
                               <img src={selectedSong.coverUrl} className="w-full h-full object-cover" alt="" />
                               <div className="absolute inset-0 bg-brand-gold/10 mix-blend-overlay"></div>
                           </div>
                           <div className="text-center md:text-left space-y-3">
                               <h2 className="text-white text-3xl font-medium uppercase tracking-widest drop-shadow-lg">{selectedSong.title}</h2>
                               <p className="text-slate-500 font-mono text-[10px] uppercase tracking-[0.5em]">HANDCRAFTED VISUAL SEQUENCE</p>
                           </div>
                       </div>
                   </div>

                   <div className="absolute bottom-24 flex flex-col items-center gap-12 z-20">
                       <div className="flex gap-16 items-center">
                           <button onClick={handleTogglePlay} className="w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                               {isPaused ? '▶' : '||'}
                           </button>
                           <button onClick={handleCapture} className="w-56 h-56 bg-brand-accent text-slate-950 font-black uppercase text-2xl tracking-[0.2em] rounded-full shadow-[0_0_100px_rgba(56,189,248,0.4)] hover:scale-105 transition-all active:scale-95 flex items-center justify-center">
                               標記
                           </button>
                           <button onClick={handleFinish} className="w-24 h-24 bg-emerald-600/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all">
                               ✓
                           </button>
                       </div>
                       <div className="flex items-center gap-8 text-[11px] uppercase tracking-[0.6em] text-slate-400 font-black">
                           <span>PROGRESS: {currentLineIndex + 1} / {lyricsLines.length}</span>
                           <span className="opacity-40">|</span>
                           <span>[ SPACE ] TO MARK</span>
                       </div>
                   </div>
               </div>
           )}

           {mode === 'mastered' && (
               <div className="text-center space-y-24 animate-fade-in-up flex flex-col items-center">
                   <h2 className="massive-text font-black text-white uppercase tracking-tighter">MASTERED.</h2>
                   <p className="text-white uppercase tracking-[0.8em] font-medium text-2xl max-w-5xl leading-relaxed opacity-60">
                       {t('mastered_content')}
                   </p>
                   <button onClick={() => navigate('/database')} className="px-32 py-10 bg-white text-black font-black uppercase text-xl tracking-[0.8em] hover:bg-brand-gold transition-all pl-[0.8em]">
                       返回作品庫
                   </button>
               </div>
           )}
      </div>

      <audio ref={audioRef} src={currentAudioSrc} crossOrigin="anonymous" onTimeUpdate={() => {}} />
    </div>
  );
}; export default Interactive;
