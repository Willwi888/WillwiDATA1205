
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

      <div className="relative z-10 w-full max-w-6xl text-center">
           {mode === 'intro' && (
               <div className="space-y-16 md:space-y-24 animate-fade-in-up flex flex-col items-center">
                   <h2 className="text-white/60 font-medium uppercase tracking-[0.8em] text-[10px] md:text-xs">INTERACTIVE STUDIO</h2>
                   <div className="max-w-6xl">
                       <p className="text-4xl md:text-7xl font-medium leading-[1.3] tracking-tight text-white uppercase whitespace-pre-line">
                           {t('studio_process_content')}
                       </p>
                   </div>
                   <div className="pt-12">
                       <button onClick={() => setMode(isSessionUnlocked() ? 'select' : 'unlock')} className="px-20 md:px-28 py-8 md:py-10 bg-white text-black font-medium uppercase text-sm md:text-base tracking-[0.8em] hover:bg-brand-gold transition-all duration-700 shadow-2xl rounded-sm">
                           {t('btn_start_studio')}
                       </button>
                   </div>
               </div>
           )}

           {mode === 'unlock' && (
               <div className="bg-slate-950/80 border border-white/5 p-20 rounded-sm shadow-2xl animate-blur-in max-w-lg mx-auto w-full">
                   <h3 className="text-brand-gold font-medium uppercase tracking-[0.4em] text-[10px] mb-12">Authorization Required</h3>
                   <input type="password" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-8 text-white text-center tracking-[1em] text-5xl mb-10 outline-none focus:border-brand-gold transition-all font-mono" value={unlockInput} onChange={(e) => setUnlockInput(e.target.value)} autoFocus />
                   <button onClick={handleVerifyUnlock} className="w-full py-6 bg-white text-black font-medium uppercase text-xs tracking-widest hover:bg-brand-gold transition-all">Unlock Entrance</button>
               </div>
           )}

           {mode === 'select' && (
               <div className="w-full space-y-20 animate-fade-in">
                   <div className="text-left flex justify-between items-end">
                       <div>
                           <h2 className="text-6xl font-medium text-white uppercase tracking-tighter mb-4">Choose a Work</h2>
                           <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Select a production to begin the synchronization</p>
                       </div>
                       <button onClick={() => setMode('intro')} className="text-slate-600 hover:text-white text-[10px] font-medium uppercase tracking-widest">Back</button>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                       {songs.filter(s => s.isInteractiveActive || isAdmin).map(s => (
                           <div key={s.id} className="relative p-8 bg-white/[0.02] border border-white/5 hover:border-brand-gold cursor-pointer transition-all flex items-center gap-8 group rounded-sm hover:bg-white/[0.05] shadow-xl" onClick={() => { setSelectedSong(s); setMode('philosophy'); }}>
                               <div className="w-20 h-20 bg-slate-900 border border-white/10 overflow-hidden shrink-0">
                                   <img src={s.coverUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" />
                               </div>
                               <div className="text-left flex-1 min-w-0">
                                   <h4 className="font-medium uppercase tracking-widest truncate transition-colors text-white group-hover:text-brand-gold">{s.title}</h4>
                                   <p className="text-[9px] text-slate-500 mt-2 font-mono uppercase tracking-widest">{s.releaseDate.split('-')[0]} • {s.releaseCategory?.replace(' (單曲)', '')}</p>
                               </div>
                               <div className="absolute top-4 right-4 bg-white/10 text-white text-[8px] font-medium px-2 py-1 uppercase opacity-0 group-hover:opacity-100 transition-opacity">Select</div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {mode === 'philosophy' && (
               <div className="space-y-16 animate-fade-in max-w-4xl mx-auto text-center">
                   <div className="bg-[#050a14] border border-white/5 p-16 rounded-sm shadow-2xl text-left space-y-12">
                       <h3 className="text-brand-gold font-medium uppercase tracking-[0.4em] text-sm">{t('before_start_title')}</h3>
                       <p className="text-2xl md:text-3xl text-white leading-relaxed font-medium uppercase tracking-tight whitespace-pre-line">
                           {t('before_start_content')}
                       </p>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/5">
                           <div className="space-y-4">
                               <h4 className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">勞務支持</h4>
                               <p className="text-xs text-slate-600 leading-loose">相關費用係用於支付手工對位與高畫質影片所需的運算製作資源。</p>
                           </div>
                           <div className="space-y-4">
                               <h4 className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">共創邀請</h4>
                               <p className="text-xs text-slate-600 leading-loose">我們相信歌詞不只是文字。當歌詞與時間產生關係，聽眾能更貼近創作者的情緒。</p>
                           </div>
                       </div>
                   </div>
                   <button onClick={() => setMode('playing')} className="px-24 py-10 bg-white text-black font-medium uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-2xl rounded-full flex items-center gap-4 mx-auto group">
                       {t('btn_understand')}
                       <span className="transform group-hover:translate-x-2 transition-transform">→</span>
                   </button>
               </div>
           )}

           {mode === 'playing' && selectedSong && (
               <div className="w-full space-y-20 animate-fade-in">
                   <div className="bg-slate-950/60 backdrop-blur-3xl border border-white/5 p-10 flex flex-col md:flex-row items-center gap-12 rounded-sm shadow-2xl">
                       <button onClick={handleTogglePlay} className="w-24 h-24 bg-brand-gold rounded-full flex items-center justify-center text-black shadow-[0_0_30px_rgba(251,191,36,0.3)] hover:scale-110 transition-transform">
                           {isPaused ? <svg className="w-10 h-10 ml-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
                       </button>
                       <div className="text-left flex-1">
                           <h2 className="text-white font-medium text-4xl uppercase tracking-tighter mb-2">{selectedSong.title}</h2>
                           <div className="flex items-center gap-6">
                               <span className="text-brand-gold font-mono text-[11px] font-medium uppercase tracking-widest">第 {currentLineIndex + 1} / {lyricsLines.length} 句</span>
                               <span className="text-slate-600 font-mono text-[10px] font-medium uppercase tracking-widest">按空白鍵或點擊「標記」按鈕來記錄時間點</span>
                           </div>
                       </div>
                   </div>
                   <div className="h-[50vh] flex items-center justify-center border-y border-white/5 relative bg-slate-900/10">
                        <div className="text-4xl md:text-6xl text-white font-medium uppercase tracking-widest animate-pulse px-10 leading-relaxed">
                            {currentLineIndex === -1 ? '準備開始...' : (lyricsLines[currentLineIndex] || '對時完成')}
                        </div>
                   </div>
                   <div className="flex justify-center gap-8 py-10">
                       <button onClick={handleTogglePlay} className="w-24 h-24 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                           {isPaused ? '▶' : '||'}
                       </button>
                       <button onClick={handleCapture} className="w-40 h-24 bg-[#2563eb] text-white font-medium uppercase tracking-widest rounded-full shadow-[0_0_40px_rgba(37,99,235,0.3)] hover:scale-105 transition-all">
                           標記
                       </button>
                   </div>
                   <div className="pt-10 flex justify-center gap-10">
                       <button onClick={() => setMode('select')} className="text-slate-600 hover:text-white uppercase text-[10px] font-medium tracking-widest">放棄並重新選歌</button>
                       <button onClick={handleFinish} className="text-brand-gold hover:text-white uppercase text-[10px] font-medium tracking-widest">結束對時並生成</button>
                   </div>
               </div>
           )}

           {mode === 'mastered' && (
               <div className="text-center space-y-16 animate-fade-in-up flex flex-col items-center">
                   <div className="w-full max-w-4xl relative">
                       <img src={globalSettings.portraitUrl} className="w-full aspect-video object-cover opacity-50 grayscale rounded-sm" alt="" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-16 text-left space-y-12">
                            <div className="space-y-6">
                                <h2 className="text-brand-gold font-medium uppercase tracking-[0.4em] text-sm">{t('mastered_title')}</h2>
                                <p className="text-2xl md:text-4xl text-white font-medium uppercase tracking-tight">{t('mastered_content')}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-white/10">
                                <div className="space-y-4">
                                    <h4 className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">{t('fee_title')}</h4>
                                    <p className="text-xs text-slate-500 leading-loose">{t('fee_content')}</p>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">{t('download_title')}</h4>
                                    <p className="text-xs text-slate-500 leading-loose">{t('download_content')}</p>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-slate-400 font-medium uppercase tracking-widest text-[10px]">{t('copyright_title')}</h4>
                                    <p className="text-xs text-slate-500 leading-loose">{t('copyright_content')}</p>
                                </div>
                                <div className="space-y-4 bg-white/5 p-6 rounded-sm">
                                    <h4 className="text-white font-medium uppercase tracking-widest text-[10px]">{t('last_note_title')}</h4>
                                    <p className="text-xs text-slate-300 leading-loose">{t('last_note_content')}</p>
                                </div>
                            </div>
                       </div>
                   </div>

                   <button onClick={() => navigate('/database')} className="mt-10 px-24 py-8 bg-white text-black font-medium uppercase text-[11px] tracking-[0.5em] hover:bg-brand-gold transition-all rounded-full">Back to Catalog</button>
               </div>
           )}
      </div>

      <audio ref={audioRef} src={currentAudioSrc} crossOrigin="anonymous" onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} />
    </div>
  );
}; export default Interactive;
