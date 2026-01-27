
import React, { useRef, useState, useEffect } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { useLocation } from 'react-router-dom';

const GlobalPlayer: React.FC = () => {
  const { currentSong, isPlaying, setIsPlaying, globalSettings } = useData();
  const { isAdmin } = useUser();
  const audioRef = useRef<HTMLAudioElement>(null);
  const location = useLocation();
  
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const isInteractiveMode = location.pathname === '/interactive';

  // 錄製室模式下禁用全域播放器以防聲音重疊
  useEffect(() => {
      if (isInteractiveMode && isPlaying) setIsPlaying(false);
  }, [isInteractiveMode, isPlaying, setIsPlaying]);

  useEffect(() => {
      const audio = audioRef.current;
      if (!audio || !currentSong || !isAdmin || isInteractiveMode) return;

      if (isPlaying) {
          setIsLoading(true);
          audio.play().then(() => setIsLoading(false)).catch(() => {
              setIsPlaying(false);
              setIsLoading(false);
          });
      } else {
          audio.pause();
      }
  }, [isPlaying, currentSong, isInteractiveMode, isAdmin, setIsPlaying]);

  // 如果不是管理員或正在錄製室，此全域播放器不可見
  if (!currentSong || isInteractiveMode || !isAdmin) return null;

  const currentAudioSrc = resolveDirectLink(currentSong.audioUrl || '');

  const formatTime = (seconds: number) => {
      if (!seconds || isNaN(seconds)) return "00:00";
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 w-full z-[1000] transition-all">
        <div className="w-full h-[4px] bg-slate-900 cursor-pointer relative group">
            <div className="h-full bg-brand-gold shadow-[0_0_15px_#fbbf24]" style={{ width: `${(progress / (duration || 1)) * 100}%` }}></div>
            <input type="range" min="0" max={duration || 0} value={progress} onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
        <div className="bg-[#020617]/95 backdrop-blur-3xl border-t border-white/10 px-8 py-5 flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-6 w-1/3 min-w-0">
                <img src={currentSong.coverUrl} className="w-14 h-14 object-cover rounded shadow-xl" alt="" />
                <div className="flex-1 min-w-0">
                    <h4 className="text-white text-xs font-black uppercase truncate">{currentSong.title}</h4>
                    <p className="text-[9px] text-brand-gold font-bold uppercase tracking-widest mt-1">Admin Diagnostic Mode</p>
                </div>
            </div>
            <div className="flex items-center justify-center gap-10 w-1/3">
                <button onClick={() => setIsPlaying(!isPlaying)} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-brand-gold hover:scale-110 transition-all shadow-xl active:scale-95">
                    {isPlaying ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                </button>
            </div>
            <div className="flex items-center justify-end gap-10 w-1/3 font-mono text-[10px]">
                <span className="text-white">{formatTime(progress)} / {formatTime(duration)}</span>
                <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => { setVolume(Number(e.target.value)); if(audioRef.current) audioRef.current.volume = Number(e.target.value); }} className="w-20 h-1 bg-white/20 appearance-none cursor-pointer" />
            </div>
        </div>
        <audio 
            ref={audioRef} 
            src={currentAudioSrc} 
            crossOrigin="anonymous"
            onTimeUpdate={() => { if (audioRef.current) setProgress(audioRef.current.currentTime); }}
            onEnded={() => setIsPlaying(false)}
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        />
    </div>
  );
};

export default GlobalPlayer;
