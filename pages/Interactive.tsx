
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import PaymentModal from '../components/PaymentModal';
import { useToast } from '../components/Layout';

type InteractionMode = 'intro' | 'unlock' | 'select' | 'philosophy' | 'guide' | 'playing' | 'mastered';

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
  const [unlockInput, setUnlockInput] = useState('');
  const [isPaused, setIsPaused] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);

  const audioRef = useRef<HTMLAudioElement>(null);

  const isSessionUnlocked = useCallback(() => {
    return isAdmin || sessionStorage.getItem(STUDIO_SESSION_KEY) === 'true';
  }, [isAdmin]);

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
              await audioRef.current.play();
              setIsPaused(false);
              setIsAudioLoading(false);
              if (currentLineIndex === -1) setCurrentLineIndex(0);
          } catch (e) {
              setIsPaused(true);
              setIsAudioLoading(false);
              showToast("音軌加載失敗，請檢查連結", "error");
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
      showToast("解鎖失敗", "error");
    }
  };

  const currentAudioSrc = useMemo(() => {
      if (!selectedSong || mode !== 'playing') return '';
      return resolveDirectLink(selectedSong.audioUrl || '');
  }, [selectedSong, mode]);

  const lyricsLines = useMemo(() => {
      return selectedSong?.lyrics ? selectedSong.lyrics.split('\n').filter(l => l.trim().length > 0) : [];
  }, [selectedSong]);

  return (
    <div className="min-h-screen bg-[#020617] pt-32 pb-40 relative flex flex-col items-center justify-center px-10">
      
      {/* 背景光影 */}
      <div className="fixed inset-0 pointer-events-none opacity-30 blur-[100px] animate-pulse-glow">
          {selectedSong && <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${selectedSong.coverUrl})` }}></div>}
      </div>

      <div className="relative z-10 w-full max-w-4xl text-center">
           {mode === 'intro' && (
               <div className="space-y-12 animate-fade-in-up">
                   <h2 className="text-brand-gold font-black uppercase tracking-[0.5em] text-sm">{t('manifesto_title')}</h2>
                   <p className="text-3xl md:text-5xl font-black leading-relaxed tracking-widest text-white uppercase italic">
                       {t('manifesto_content').split('\n').map((l, i) => <React.Fragment key={i}>{l}<br/></React.Fragment>)}
                   </p>
                   <button onClick={() => setMode(isSessionUnlocked() ? 'select' : 'unlock')} className="w-full py-12 bg-white text-black font-black uppercase text-xl hover:bg-brand-gold transition-all shadow-2xl active:scale-95 duration-700">
                       {t('btn_start_studio')}
                   </button>
               </div>
           )}

           {mode === 'unlock' && (
               <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 p-16 rounded shadow-2xl animate-blur-in max-w-lg mx-auto w-full">
                   <h3 className="text-brand-gold font-black uppercase tracking-widest text-xs mb-10">Studio Access</h3>
                   <input type="password" placeholder="••••" className="w-full bg-black/40 border border-white/10 px-6 py-6 text-white text-center tracking-[0.8em] text-4xl mb-10 outline-none focus:border-brand-gold transition-all" value={unlockInput} onChange={(e) => setUnlockInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleVerifyUnlock()} />
                   <button onClick={handleVerifyUnlock} className="w-full py-5 bg-brand-gold text-black font-black uppercase text-xs tracking-widest hover:bg-white transition-all">Verify Code</button>
               </div>
           )}

           {mode === 'select' && (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                   {songs.filter(s => s.isInteractiveActive || isAdmin).map(s => (
                       <div key={s.id} onClick={() => { setSelectedSong(s); setMode('philosophy'); }} className="p-8 bg-slate-900/50 border border-white/5 hover:border-brand-gold cursor-pointer transition-all flex items-center gap-6 group rounded-sm">
                           <img src={s.coverUrl} className="w-20 h-20 object-cover shadow-lg group-hover:scale-105 transition-transform" alt="" />
                           <div className="text-left">
                               <h4 className="text-white font-bold uppercase tracking-widest group-hover:text-brand-gold">{s.title}</h4>
                               <p className="text-[9px] text-slate-500 mt-2 font-mono">{s.releaseDate}</p>
                           </div>
                       </div>
                   ))}
               </div>
           )}

           {mode === 'philosophy' && (
               <div className="space-y-12 animate-fade-in">
                   <h2 className="text-brand-gold font-black uppercase tracking-widest">{t('before_start_title')}</h2>
                   <p className="text-2xl md:text-3xl text-white leading-loose font-medium italic px-10">{t('before_start_content')}</p>
                   <button onClick={() => setMode('guide')} className="px-16 py-8 bg-white text-black font-black uppercase tracking-widest hover:bg-brand-gold transition-all shadow-xl">{t('btn_understand')}</button>
               </div>
           )}

           {mode === 'guide' && (
               <div className="bg-slate-900/80 p-16 rounded shadow-2xl animate-fade-in space-y-10">
                   <h3 className="text-brand-gold font-black uppercase tracking-widest text-xs">Guidelines</h3>
                   <p className="text-white text-xl leading-relaxed tracking-widest">當旋律與歌詞相遇時點擊。<br/>這不是遊戲，是你的呼吸與紀錄。</p>
                   <button onClick={() => setMode('playing')} className="w-full py-6 bg-brand-gold text-black font-black uppercase tracking-widest hover:bg-white">Enter Recording Mode</button>
               </div>
           )}

           {mode === 'playing' && selectedSong && (
               <div className="w-full space-y-12 animate-fade-in">
                   <div className="bg-black/80 backdrop-blur-3xl border border-white/5 p-10 flex flex-col md:flex-row items-center gap-10 rounded-sm">
                       <button onClick={handleTogglePlay} disabled={isAudioLoading} className="w-24 h-24 bg-brand-gold rounded-full flex items-center justify-center text-black shadow-2xl hover:scale-105 transition-all">
                           {isAudioLoading ? <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div> : (isPaused ? <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>)}
                       </button>
                       <div className="text-left flex-1">
                           <h2 className="text-white font-black text-2xl uppercase tracking-widest">{selectedSong.title}</h2>
                           <p className="text-brand-gold font-mono text-[10px] uppercase mt-2">{Math.floor(currentTime)}s / {Math.floor(duration)}s</p>
                       </div>
                   </div>
                   <div className="h-[40vh] overflow-y-auto custom-scrollbar space-y-16 py-20 border-y border-white/5">
                        {lyricsLines.map((line, idx) => (
                           <div key={idx} onClick={() => { if(!isPaused) setCurrentLineIndex(idx); }} className={`text-4xl md:text-6xl font-black uppercase tracking-widest cursor-pointer transition-all duration-700 ${idx === currentLineIndex ? 'text-white scale-110 opacity-100' : 'text-slate-800 opacity-20 hover:opacity-40'}`}>
                               {line}
                           </div>
                        ))}
                   </div>
                   <button onClick={() => setMode('mastered')} className="px-12 py-5 border border-white/20 text-white font-black uppercase text-[10px] tracking-widest hover:bg-white hover:text-black">Finish Recording</button>
               </div>
           )}

           {mode === 'mastered' && (
               <div className="text-center space-y-10 animate-fade-in-up">
                   <h2 className="text-8xl font-black text-white uppercase italic">Mastered.</h2>
                   <p className="text-slate-500 uppercase tracking-widest">你的紀錄已永久留存在這段旋律中。</p>
                   <button onClick={() => window.location.reload()} className="px-12 py-6 bg-white text-black font-black uppercase text-xs">Return Home</button>
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
      />
    </div>
  );
}; export default Interactive;
