
import React, { useRef, useState, useEffect } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useLocation } from 'react-router-dom';

const GlobalPlayer: React.FC = () => {
  const { currentSong, isPlaying, setIsPlaying, globalSettings } = useData();
  const audioRef = useRef<HTMLAudioElement>(null);
  const location = useLocation();
  
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isInteractiveMode = location.pathname === '/interactive';

  useEffect(() => {
      if (isInteractiveMode && isPlaying) setIsPlaying(false);
  }, [isInteractiveMode, isPlaying, setIsPlaying]);

  useEffect(() => {
      const audio = audioRef.current;
      if (!audio || !currentSong || isInteractiveMode) return;

      if (isPlaying) {
          setErrorMsg(null);
          setIsLoading(true);
          audio.play().then(() => setIsLoading(false)).catch((e) => {
              console.error("Playback failed:", e);
              setIsPlaying(false);
              setIsLoading(false);
              setErrorMsg("無法連接音訊源。");
          });
      } else {
          audio.pause();
      }
  }, [isPlaying, currentSong, isInteractiveMode, setIsPlaying]);

  if (!currentSong || isInteractiveMode) return null;

  const currentAudioSrc = resolveDirectLink(currentSong.audioUrl || '');

  const formatTime = (seconds: number) => {
      if (!seconds || isNaN(seconds)) return "00:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-[1000] animate-fade-in-up">
        {errorMsg && (
            <div className="bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest px-8 py-1.5 text-center">
                {errorMsg}
            </div>
        )}
        
        {/* 進度條 */}
        <div className="w-full h-1 bg-white/5 cursor-pointer relative group">
            <div className="h-full bg-brand-gold shadow-[0_0_15px_#fbbf24] transition-all duration-300" style={{ width: `${(progress / (duration || 1)) * 100}%` }}></div>
            <input 
              type="range" 
              min="0" 
              max={duration || 0} 
              value={progress} 
              onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
            />
        </div>

        {/* 主播放面板 */}
        <div className="bg-black/80 backdrop-blur-3xl border-t border-white/5 px-8 py-5 flex items-center justify-between shadow-2xl">
            {/* 左側：資訊 */}
            <div className="flex items-center gap-6 w-1/3">
                <div className="relative shrink-0 overflow-hidden rounded-sm">
                    <img src={currentSong.coverUrl} className={`w-14 h-14 object-cover border border-white/10 transition-transform duration-1000 ${isPlaying ? 'scale-110' : ''}`} alt="" />
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="w-5 h-5 border border-brand-gold border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <h4 className="text-white text-sm font-medium uppercase truncate tracking-[0.2em]">{currentSong.title}</h4>
                    <p className="text-[10px] text-slate-500 font-medium uppercase tracking-[0.1em] mt-1">{currentSong.releaseCategory?.split(' (')[0] || 'TRACK'}</p>
                </div>
            </div>
            
            {/* 中央：控制 */}
            <div className="flex items-center justify-center gap-10 w-1/3">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)} 
                  className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-brand-gold hover:scale-110 transition-all shadow-xl active:scale-95"
                >
                    {isPlaying ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                      <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>
            </div>
            
            {/* 右側：音量與時間 */}
            <div className="flex items-center justify-end gap-10 w-1/3 font-mono text-[10px] tracking-widest text-slate-400">
                <div className="hidden md:flex items-center gap-4 group">
                    <svg className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.01" 
                      value={volume} 
                      onChange={(e) => { setVolume(Number(e.target.value)); if(audioRef.current) audioRef.current.volume = Number(e.target.value); }} 
                      className="w-20 h-1 bg-white/10 appearance-none cursor-pointer rounded-full accent-white" 
                    />
                </div>
                <span className="min-w-[80px] text-right">{formatTime(progress)} <span className="opacity-20 mx-1">/</span> {formatTime(duration)}</span>
            </div>
        </div>
        <audio 
            ref={audioRef} 
            src={currentAudioSrc} 
            crossOrigin="anonymous"
            onTimeUpdate={() => { if (audioRef.current) setProgress(audioRef.current.currentTime); }}
            onEnded={() => setIsPlaying(false)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onWaiting={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
        />
    </div>
  );
};

export default GlobalPlayer;
