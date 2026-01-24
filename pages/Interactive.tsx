
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { generateAiVideo } from '../services/geminiService';
import PaymentModal from '../components/PaymentModal';
import { useToast } from '../components/Layout';

type InteractionMode = 'intro' | 'unlock' | 'select' | 'philosophy' | 'guide' | 'gate' | 'playing' | 'mastered' | 'rendering' | 'finished';

const STUDIO_SESSION_KEY = 'willwi_studio_unlocked';

const Interactive: React.FC = () => {
  const { songs, globalSettings } = useData();
  const { isAdmin } = useUser();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const [unlockInput, setUnlockInput] = useState('');
  const [lyricsLines, setLyricsLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [bgVideoUrl, setBgVideoUrl] = useState<string | null>(null);
  const [stamps, setStamps] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isSessionUnlocked = useCallback(() => {
    return isAdmin || sessionStorage.getItem(STUDIO_SESSION_KEY) === 'true';
  }, [isAdmin]);

  useEffect(() => {
    if (location.state?.targetSongId) {
        const s = songs.find(x => x.id === location.state.targetSongId);
        if (s) { 
          setSelectedSong(s); 
          if (isSessionUnlocked()) setMode('philosophy');
          else setMode('unlock');
        }
    }
  }, [location.state, songs, isSessionUnlocked]);

  useEffect(() => {
    if (selectedSong?.lyrics) {
        setLyricsLines(selectedSong.lyrics.split('\n').filter(l => l.trim().length > 0));
    }
    setCurrentLineIndex(-1);
    setStamps([]);
    setAudioError(null);
  }, [selectedSong]);

  useEffect(() => {
    if (currentLineIndex >= 0 && scrollRef.current) {
        const activeElement = scrollRef.current.children[currentLineIndex] as HTMLElement;
        if (activeElement) {
            scrollRef.current.scrollTo({
                top: activeElement.offsetTop - scrollRef.current.offsetHeight / 2,
                behavior: 'smooth'
            });
        }
    }
  }, [currentLineIndex]);

  const handleLyricClick = (index: number) => {
    if (mode !== 'playing' || isPaused || !audioRef.current) return;
    const now = audioRef.current.currentTime;
    if (index === currentLineIndex + 1 || isAdmin) {
        const newStamps = [...stamps];
        newStamps[index] = now;
        setStamps(newStamps);
        setCurrentLineIndex(index);
        if (window.navigator.vibrate) window.navigator.vibrate(10);
    } else if (index === currentLineIndex) {
        const newStamps = [...stamps];
        newStamps[index] = now;
        setStamps(newStamps);
    }
  };

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
          } catch (error: any) {
              console.error("Playback failed:", error);
              setIsPaused(true);
              setIsAudioLoading(false);
              setAudioError("音訊載入失敗：請檢查後台連結是否為「檔案分享連結」而非「Showcase 頁面」。");
              showToast("播放失敗，請檢查網路或音訊連結格式", "error");
          }
      } else {
          audioRef.current.pause();
          setIsPaused(true);
      }
  };

  const handleEnterStudio = () => {
    if (isSessionUnlocked()) setMode('select');
    else setMode('unlock');
  };

  const handleVerifyUnlock = () => {
    const correctCode = globalSettings.accessCode || '8888';
    if (unlockInput === correctCode) {
      sessionStorage.setItem(STUDIO_SESSION_KEY, 'true');
      showToast("存取驗證成功");
      setMode(selectedSong ? 'philosophy' : 'select');
    } else {
      showToast("存取密碼不正確", "error");
    }
  };

  const startExportProcess = async () => {
      // @ts-ignore
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
      }
      setMode('rendering');
      setRenderProgress(10);
      try {
          const imgResponse = await fetch(selectedSong?.coverUrl || '');
          const blob = await imgResponse.blob();
          const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
          });
          setRenderProgress(40);
          const aiBg = await generateAiVideo(base64, selectedSong?.title || 'Unknown');
          if (aiBg) {
              setRenderProgress(100);
              setBgVideoUrl(aiBg);
              setMode('finished');
          } else throw new Error("Render failed");
      } catch (e) {
          showToast("渲染失敗，請重試", "error");
          setMode('mastered');
      }
  };

  const currentAudioSrc = useMemo(() => {
      if (!selectedSong) return '';
      const rawUrl = selectedSong.audioUrl || selectedSong.dropboxUrl || '';
      return resolveDirectLink(rawUrl);
  }, [selectedSong]);

  return (
    <div className="min-h-screen flex flex-col pt-24 pb-32 relative overflow-hidden bg-[#020617] transition-colors duration-1000">
      <div className="fixed inset-0 z-0 overflow-hidden">
          {bgVideoUrl ? (
              <video src={bgVideoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover blur-sm opacity-30" />
          ) : (
              <img src={selectedSong?.coverUrl || ''} className="w-full h-full object-cover blur-[120px] scale-125 opacity-10 animate-studio-breathe" alt="" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black"></div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-10 animate-fade-in">
           {mode === 'intro' && (
               <div className="max-w-4xl mx-auto text-center space-y-12">
                   <h2 className="text-brand-gold font-black uppercase tracking-[1em] text-sm">{t('manifesto_title')}</h2>
                   <div className="text-2xl md:text-4xl font-bold leading-relaxed tracking-widest text-slate-200">
                       {t('manifesto_content').split('\n').map((s, i) => <React.Fragment key={i}>{s}<br/></React.Fragment>)}
                   </div>
                   <button onClick={handleEnterStudio} className="w-full py-16 bg-white text-black font-black uppercase tracking-[0.5em] text-2xl rounded-sm hover:bg-brand-gold transition-all shadow-2xl">
                       {t('btn_start_studio')}
                   </button>
               </div>
           )}

           {mode === 'unlock' && (
             <div className="max-w-md w-full bg-slate-900/80 border border-white/10 p-16 rounded-sm backdrop-blur-3xl animate-fade-in-up text-center shadow-2xl">
                <h3 className="text-brand-gold font-black uppercase tracking-[0.4em] text-xs mb-10">Studio Access Required</h3>
                <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-10 font-bold leading-relaxed">此區域僅供獲得授權的使用者進入。<br/>請輸入專屬解鎖碼以繼續。</p>
                <div className="space-y-8">
                  <input type="text" placeholder="••••" className="w-full bg-black border border-white/10 px-6 py-8 text-white text-center tracking-[1em] font-mono text-4xl outline-none focus:border-brand-gold" value={unlockInput} onChange={(e) => setUnlockInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVerifyUnlock()} autoFocus />
                  <button onClick={handleVerifyUnlock} className="w-full py-6 bg-brand-gold text-black font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-xl">Verify & Unlock</button>
                  <button onClick={() => setMode('intro')} className="text-slate-600 hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors">Back to Manifesto</button>
                </div>
             </div>
           )}

           {mode === 'select' && (
               <div className="w-full max-w-6xl mx-auto py-10">
                   <h2 className="text-4xl font-black uppercase tracking-[0.4em] mb-12 border-b border-white/10 pb-6 text-white">Recording Vault</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {songs.filter(s => s.isInteractiveActive || isAdmin).map(song => (
                           <div key={song.id} onClick={() => { setSelectedSong(song); setMode('philosophy'); }} className="group cursor-pointer bg-slate-900/40 p-10 rounded-sm border border-white/20 hover:border-brand-gold transition-all flex items-center gap-10">
                               <img src={song.coverUrl} className="w-32 h-32 object-cover shadow-2xl" alt="" />
                               <div className="text-left">
                                 <h4 className="text-2xl font-black uppercase tracking-widest text-white group-hover:text-brand-gold">{song.title}</h4>
                                 <span className="text-[11px] text-brand-gold font-mono tracking-widest uppercase font-bold">{song.isrc}</span>
                               </div>
                           </div>
                       ))}
                   </div>
                   <div className="mt-16 text-center">
                       <button onClick={() => setMode('intro')} className="text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors border-b border-slate-800">返回宣言</button>
                   </div>
               </div>
           )}

           {mode === 'philosophy' && (
               <div className="max-w-5xl mx-auto space-y-20 text-center">
                   <div className="space-y-12">
                       <h3 className="text-brand-gold font-black uppercase tracking-[0.8em] text-lg">{t('before_start_title')}</h3>
                       <div className="text-2xl md:text-4xl text-slate-100 leading-loose tracking-[0.2em] font-medium px-10 border-l border-white/10">
                           {t('before_start_content')}
                       </div>
                   </div>
                   <button onClick={() => setMode('guide')} className="w-full max-w-2xl py-10 bg-white text-black font-black uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-2xl">
                       {t('btn_understand')}
                   </button>
               </div>
           )}

           {mode === 'guide' && (
               <div className="max-w-4xl w-full bg-slate-900/80 border border-white/10 p-16 rounded-sm backdrop-blur-3xl animate-fade-in shadow-2xl">
                   <h3 className="text-brand-gold font-black uppercase tracking-[0.5em] text-sm mb-12 border-b border-white/5 pb-6 text-center">開始前 (STUDIO RULES)</h3>
                   <div className="space-y-8 text-center mb-16 px-4">
                       <p className="text-xl md:text-2xl text-slate-200 font-bold leading-relaxed tracking-widest">
                           這裡沒有再來一次也沒有修到完美<br/>
                           你現在做的就是最後的樣子<br/>
                           對歌詞的時候慢一點沒關係<br/>
                           你只是在找這一句應該落在哪裡
                       </p>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
                       <div className="space-y-4 p-6 bg-white/5 border border-white/5 rounded-sm">
                           <div className="w-8 h-8 bg-brand-gold text-black flex items-center justify-center font-black text-xs rounded-full">01</div>
                           <h4 className="text-white font-black text-xs uppercase tracking-widest">播放與聆聽</h4>
                           <p className="text-slate-400 text-[9px] leading-relaxed uppercase tracking-widest">點擊橘色按鈕開始。請聆聽人聲進場的精確瞬間。</p>
                       </div>
                       <div className="space-y-4 p-6 bg-white/5 border border-white/5 rounded-sm">
                           <div className="w-8 h-8 bg-brand-gold text-black flex items-center justify-center font-black text-xs rounded-full">02</div>
                           <h4 className="text-white font-black text-xs uppercase tracking-widest">點擊第一字</h4>
                           <p className="text-slate-400 text-[9px] leading-relaxed uppercase tracking-widest">聽見該行「第一個字」唱出的瞬間，立即點擊畫面中央的文字。</p>
                       </div>
                       <div className="space-y-4 p-6 bg-white/5 border border-white/5 rounded-sm">
                           <div className="w-8 h-8 bg-brand-gold text-black flex items-center justify-center font-black text-xs rounded-full">03</div>
                           <h4 className="text-white font-black text-xs uppercase tracking-widest">真實紀錄</h4>
                           <p className="text-slate-400 text-[9px] leading-relaxed uppercase tracking-widest">依序錄製到最後。你的節奏就是這首歌這次的呼吸。</p>
                       </div>
                   </div>
                   <button onClick={() => isAdmin ? setMode('playing') : setMode('gate')} className="w-full py-10 bg-brand-gold text-black font-black uppercase tracking-[0.4em] text-sm hover:bg-white transition-all shadow-2xl">進入錄製室 (GO TO STUDIO)</button>
               </div>
           )}

           {mode === 'gate' && (
               <div className="w-full flex items-center justify-center animate-fade-in">
                   <div className="max-w-xl w-full bg-slate-900/80 border border-white/10 p-16 text-center rounded-sm shadow-2xl space-y-12 backdrop-blur-3xl">
                       <img src={selectedSong?.coverUrl} className="w-48 h-48 mx-auto border-2 border-brand-gold shadow-2xl" alt="" />
                       <h3 className="text-3xl font-black uppercase tracking-widest text-white">{selectedSong?.title}</h3>
                       <button onClick={() => setShowPayment(true)} className="w-full py-10 bg-brand-gold text-black font-black uppercase text-xl tracking-[0.2em] hover:bg-white transition-all">ACCESS STUDIO</button>
                   </div>
               </div>
           )}

           {mode === 'playing' && (
               <div className="w-full max-w-5xl h-full flex flex-col items-center animate-fade-in">
                   <div className="w-full mb-16 animate-fade-in-up">
                       <div className="bg-[#0f172a] border-x border-t border-white/10 px-8 py-4 flex justify-between items-center rounded-t-sm">
                           <div className="flex items-center gap-4">
                               <div className={`w-2 h-2 rounded-full ${isPaused ? (isAudioLoading ? 'bg-brand-gold animate-bounce' : 'bg-slate-600') : 'bg-brand-gold animate-pulse'}`}></div>
                               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                                   {isAudioLoading ? 'BUFFERING...' : isPaused ? 'SESSION STANDBY' : 'LIVE RECORDING...'}
                               </span>
                           </div>
                           <span className="text-[11px] font-mono font-bold text-brand-gold/60">{Math.floor(currentTime)} / {Math.floor(duration)}s</span>
                       </div>
                       <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-10 flex flex-col gap-6 shadow-2xl">
                           <div className="flex items-center gap-12">
                               <button 
                                  onClick={handleTogglePlay} 
                                  disabled={isAudioLoading}
                                  className="w-28 h-28 bg-brand-gold rounded-full flex items-center justify-center text-black transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(251,191,36,0.2)] shrink-0 group disabled:opacity-50"
                               >
                                   {isAudioLoading ? (
                                       <div className="w-10 h-10 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
                                   ) : (
                                       isPaused ? <svg className="w-14 h-14 ml-1.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                   )}
                               </button>
                               <div className="flex-1 h-24 bg-black/80 relative overflow-hidden flex items-center border border-white/5 rounded-sm">
                                   <div className="w-full flex items-end gap-[2px] h-12 opacity-10 px-2">{Array.from({ length: 180 }).map((_, i) => (<div key={i} className="flex-1 bg-white" style={{ height: `${Math.random() * 60 + 20}%` }}></div>))}</div>
                                   <div className="absolute top-0 bottom-0 w-[3px] bg-brand-gold shadow-[0_0_20px_#fbbf24] transition-all duration-300 z-10" style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}></div>
                               </div>
                           </div>
                           {audioError && (
                               <div className="text-center p-3 bg-rose-950/40 border border-rose-500/30 rounded-sm">
                                   <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">{audioError}</p>
                               </div>
                           )}
                       </div>
                   </div>
                   <div ref={scrollRef} className="w-full flex-1 max-h-[60vh] overflow-y-auto custom-scrollbar pr-10 space-y-24 py-48 text-center">
                       {lyricsLines.map((line, idx) => {
                           const isStamped = stamps[idx] !== undefined;
                           const isActive = idx === currentLineIndex;
                           return (
                               <div key={idx} onClick={() => handleLyricClick(idx)} className={`transition-all duration-1000 cursor-pointer py-4 group origin-center ${isActive ? 'scale-110 translate-y-[-5px]' : 'hover:opacity-90'}`}>
                                   <p className={`text-3xl md:text-6xl font-black tracking-[0.2em] leading-relaxed transition-all duration-1000 ${isActive ? 'text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.7)]' : isStamped ? 'text-brand-gold/20' : 'text-slate-800'}`}>{line}</p>
                                   {isStamped && <div className="flex items-center justify-center gap-2 mt-4 opacity-30"><div className="h-[1px] w-8 bg-brand-gold/40"></div><span className="text-[10px] font-mono text-brand-gold font-bold tracking-[0.3em]">{stamps[idx].toFixed(2)}s</span><div className="h-[1px] w-8 bg-brand-gold/40"></div></div>}
                               </div>
                           );
                       })}
                       <div className="pt-60 pb-60"><button onClick={() => { audioRef.current?.pause(); setMode('mastered'); }} className="bg-white text-black px-32 py-10 text-[11px] font-black uppercase tracking-[0.5em] rounded-sm hover:bg-brand-gold transition-all shadow-2xl active:scale-95">SAVE STUDIO SESSION</button></div>
                   </div>
               </div>
           )}

           {(mode === 'mastered' || mode === 'rendering' || mode === 'finished') && (
               <div className="w-full flex flex-col items-center justify-center px-10 text-white animate-fade-in">
                   {mode === 'mastered' && (
                       <div className="max-w-4xl w-full bg-slate-900/90 border border-white/10 rounded-sm p-24 text-center space-y-16 shadow-[0_50px_100px_rgba(0,0,0,0.5)] backdrop-blur-3xl">
                           <div className="space-y-6">
                               <h2 className="text-7xl font-black uppercase tracking-tighter leading-none">完成後 (MASTERED)</h2>
                               <p className="text-brand-gold font-black uppercase tracking-[0.5em] text-sm">這是最好屬於你的版本因為它是真的</p>
                           </div>
                           <div className="bg-black/40 p-10 border border-white/5 space-y-6 text-left">
                               <h4 className="text-white font-black text-xs uppercase tracking-widest border-b border-white/5 pb-3">下載說明 (DOWNLOAD NOTES)</h4>
                               <ul className="text-slate-400 text-[10px] leading-relaxed uppercase tracking-widest space-y-4 font-bold">
                                   <li className="flex gap-4"><span className="text-brand-gold">●</span> 你可以下載你完成的影片，那是你陪這首歌走過的紀錄。</li>
                                   <li className="flex gap-4"><span className="text-brand-gold">●</span> 歌曲與歌詞的權利仍屬原創者，這裡不是授權也不是買賣。</li>
                               </ul>
                           </div>
                           <button onClick={startExportProcess} className="w-full bg-brand-gold text-black py-14 rounded-sm font-black text-3xl uppercase tracking-[0.3em] hover:bg-white transition-all shadow-2xl active:scale-95">🎬 {t('btn_get_mp4')}</button>
                       </div>
                   )}

                   {mode === 'rendering' && (
                       <div className="space-y-16 text-center">
                           <div className="w-96 h-96 relative mx-auto">
                               <svg className="w-full h-full transform -rotate-90">
                                   <circle cx="192" cy="192" r="180" stroke="#0f172a" strokeWidth="4" fill="transparent" />
                                   <circle cx="192" cy="192" r="180" stroke="#fbbf24" strokeWidth="8" fill="transparent" strokeDasharray={1131} strokeDashoffset={1131 - (1131 * renderProgress) / 100} className="transition-all duration-1000 shadow-[0_0_20px_#fbbf24]" strokeLinecap="round" />
                               </svg>
                               <div className="absolute inset-0 flex items-center justify-center flex-col"><span className="text-9xl font-black font-mono tracking-tighter text-white">{Math.floor(renderProgress)}%</span><span className="text-[11px] font-black uppercase tracking-[0.8em] mt-8 text-brand-gold animate-pulse">VEO 3.1 RENDERING</span></div>
                           </div>
                           <p className="text-slate-400 text-xs uppercase tracking-[0.6em] animate-pulse font-bold">正在運算一段 8 秒抽象氛圍... 請稍候</p>
                       </div>
                   )}

                   {mode === 'finished' && (
                       <div className="text-center space-y-20 w-full max-w-7xl animate-blur-in">
                           <div className="aspect-video bg-black/90 rounded-sm overflow-hidden border border-white/10 shadow-[0_60px_120px_rgba(0,0,0,0.8)] relative group">
                               <video src={bgVideoUrl || ''} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover blur-sm opacity-40" />
                               <div className="absolute inset-0 flex items-center justify-between px-32 py-24 z-10 bg-gradient-to-r from-black/60 to-transparent">
                                   <div className="flex-1 text-left space-y-12">
                                       <div className="h-[2px] w-20 bg-brand-gold"></div>
                                       <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-2xl max-w-2xl">{lyricsLines[Math.floor(lyricsLines.length / 2)]}</h2>
                                       <p className="text-brand-gold text-sm uppercase tracking-[1em] font-black opacity-80">{selectedSong?.title} • WILLWI OFFICIAL</p>
                                   </div>
                                   <img src={selectedSong?.coverUrl} className="w-[450px] h-[450px] object-cover rounded-sm shadow-2xl relative z-20 border border-white/10" alt="" />
                               </div>
                           </div>
                           <div className="flex flex-col md:flex-row gap-10 justify-center items-center">
                               <a href={bgVideoUrl || '#'} download={`WILLWI_STUDIO_${selectedSong?.title}.mp4`} className="px-24 py-8 bg-white text-black font-black uppercase text-2xl tracking-[0.2em] rounded-sm hover:bg-brand-gold transition-all shadow-2xl">📥 下載手作影片</a>
                               <button onClick={() => setMode('select')} className="text-slate-500 font-black uppercase text-[12px] tracking-[0.6em] hover:text-white transition-colors">BACK TO STUDIO ARCHIVE</button>
                           </div>
                       </div>
                   )}
               </div>
           )}
      </div>

      <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); setMode('playing'); }} />
      {selectedSong && (
          <audio 
            key={currentAudioSrc} 
            ref={audioRef} 
            src={currentAudioSrc} 
            crossOrigin="anonymous"
            onLoadedMetadata={() => {
                setDuration(audioRef.current?.duration || 0);
                setAudioError(null);
            }} 
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} 
            onError={(e) => {
                console.error("Audio Load Error:", e);
                setAudioError("音訊無法加載。原因可能為：1. 連結格式錯誤 2. 檔案權限未開啟 3. 此連結為網頁而非原始音訊檔案。");
            }}
            preload="auto" 
          />
      )}
    </div>
  );
}; export default Interactive;
