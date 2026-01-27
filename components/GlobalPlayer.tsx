
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useLocation } from 'react-router-dom';

const GlobalPlayer: React.FC = () => {
  const { currentSong, isPlaying, setIsPlaying, globalSettings } = useData();
  const { isAdmin } = useUser(); // 引入權限檢查
  const audioRef = useRef<HTMLAudioElement>(null);
  const location = useLocation();
  
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-pause and hide when entering Interactive mode (Studio)
  const isInteractiveMode = location.pathname === '/interactive';

  useEffect(() => {
      if (isInteractiveMode && isPlaying) {
          setIsPlaying(false);
      }
  }, [isInteractiveMode, setIsPlaying]);

  useEffect(() => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isPlaying && !isInteractiveMode) {
          const playPromise = audio.play();
          if (playPromise !== undefined) {
              playPromise.catch(error => {
                  console.error("Auto-play prevented or failed:", error);
                  setIsPlaying(false);
              });
          }
      } else {
          audio.pause();
      }
  }, [isPlaying, currentSong, isInteractiveMode, setIsPlaying]);

  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.volume = volume;
      }
  }, [volume]);

  const handleTimeUpdate = () => {
      if (audioRef.current) {
          setProgress(audioRef.current.currentTime);
          setDuration(audioRef.current.duration || 0);
      }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTime = Number(e.target.value);
      if (audioRef.current) {
          audioRef.current.currentTime = newTime;
          setProgress(newTime);
      }
  };

  const formatTime = (seconds: number) => {
      if (!seconds || isNaN(seconds)) return "00:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentAudioSrc = useMemo(() => {
      if (!currentSong) return '';
      const rawUrl = currentSong.audioUrl || currentSong.dropboxUrl || '';
      return resolveDirectLink(rawUrl);
  }, [currentSong]);

  // CRITICAL: 只有管理員可以看見並使用播放器
  // 一般聽眾只能看資料，不能聽原始檔
  if (!isAdmin || !currentSong || isInteractiveMode) return null;

  return (
    <div 
        className="fixed bottom-0 left-0 w-full z-[1000] transition-transform duration-500 ease-out translate-y-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
    >
        {/* Progress Bar (Floating on top of player) */}
        <div className="w-full h-[4px] bg-slate-900 cursor-pointer relative group">
            <div 
                className="h-full bg-brand-gold shadow-[0_0_15px_#fbbf24] relative" 
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
            >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-gold rounded-full scale-0 group-hover:scale-100 transition-transform shadow-lg border-2 border-black"></div>
            </div>
            <input 
                type="range" 
                min="0" 
                max={duration || 0} 
                value={progress} 
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
        </div>

        {/* Player Body */}
        <div className="bg-[#020617]/95 backdrop-blur-2xl border-t border-white/10 px-8 py-5 flex items-center justify-between shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
            
            {/* Info - Enhanced Prominence */}
            <div className="flex items-center gap-6 w-1/3 min-w-0">
                <div className="relative group shrink-0">
                    <img 
                        src={currentSong.coverUrl || globalSettings.defaultCoverUrl} 
                        className={`w-16 h-16 object-cover rounded shadow-2xl border border-white/10 transition-transform duration-700 ${isPlaying ? 'scale-105 shadow-brand-gold/20' : 'grayscale'}`} 
                        alt="" 
                    />
                    {/* Tiny playing indicator overlay on cover */}
                    {isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded backdrop-blur-[1px]">
                            <div className="flex items-end gap-[2px] h-4">
                                <div className="w-1 bg-brand-gold animate-[bounce_1s_infinite]"></div>
                                <div className="w-1 bg-brand-gold animate-[bounce_1.2s_infinite]"></div>
                                <div className="w-1 bg-brand-gold animate-[bounce_0.8s_infinite]"></div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h4 className="text-white text-sm md:text-base font-black uppercase tracking-widest truncate leading-tight mb-1 group-hover:text-brand-gold transition-colors">{currentSong.title}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] truncate opacity-70">Willwi Official Database</p>
                </div>
            </div>

            {/* Controls - Centered & Enlarged */}
            <div className="flex items-center justify-center gap-10 w-1/3">
                <button 
                    onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 10; }}
                    className="text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-95"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" /></svg>
                </button>

                <button 
                    onClick={() => setIsPlaying(!isPlaying)} 
                    className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:bg-brand-gold hover:scale-110 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-95 border-4 border-[#020617] ring-1 ring-white/20"
                >
                    {isPlaying ? (
                        <svg className="w-5 h-5 ml-[1px]" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                        <svg className="w-5 h-5 ml-[3px]" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>

                <button 
                    onClick={() => { if(audioRef.current) audioRef.current.currentTime += 10; }}
                    className="text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-95"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" /></svg>
                </button>
            </div>

            {/* Volume & Time - Volume Slider Always Visible */}
            <div className="flex items-center justify-end gap-8 w-1/3">
                <div className="flex flex-col items-end gap-1 hidden md:flex">
                    <span className="text-[11px] font-mono font-bold text-white tracking-widest">
                        {formatTime(progress)}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 tracking-widest">
                        / {formatTime(duration)}
                    </span>
                </div>
                
                {/* Enhanced Volume Slider */}
                <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/5 hover:border-white/20 transition-colors">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.01" 
                        value={volume} 
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-20 md:w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:transition-colors"
                    />
                </div>
            </div>
        </div>

        <audio 
            ref={audioRef} 
            src={currentAudioSrc} 
            crossOrigin="anonymous"
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onError={() => {
                console.error("Audio Load Error");
                setIsPlaying(false);
            }}
        />
    </div>
  );
};

export default GlobalPlayer;
