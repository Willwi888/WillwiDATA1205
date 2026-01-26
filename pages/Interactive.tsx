
import React, { useState, useEffect, useRef } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { Song } from '../types';
import { useToast } from '../components/Layout';

interface SyncData {
  time: number;
  text: string;
}

const Interactive: React.FC = () => {
  const { songs, updateSong } = useData();
  const { showToast } = useToast();
  
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [syncPoints, setSyncPoints] = useState<Record<number, number>>({}); // lineIndex -> timestamp

  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lyricsLines = selectedSong?.lyrics?.split('\n').filter(l => l.trim().length > 0) || [];

  const handleTogglePlay = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) { showToast("Playback Init Failed", "error"); }
    }
  };

  // 真正的同步標定功能：當播放時，點擊該行即紀錄目前時間
  const markSyncPoint = (index: number) => {
    if (!isPlaying) return;
    setSyncPoints(prev => ({
      ...prev,
      [index]: currentTime
    }));
  };

  const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${min}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // 自動追蹤播放進度並高亮
  const activeIndex = lyricsLines.findIndex((_, i) => {
    const currentPoint = syncPoints[i];
    const nextPoint = syncPoints[i + 1];
    if (currentPoint === undefined) return false;
    if (nextPoint === undefined) return currentTime >= currentPoint;
    return currentTime >= currentPoint && currentTime < nextPoint;
  });

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-mono selection:bg-brand-accent selection:text-black pt-16">
      
      {/* SYNC TERMINAL HEADER */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-10 bg-black sticky top-0 z-[100]">
          <div className="flex items-center gap-12">
              <span className="text-[11px] uppercase tracking-[0.8em] text-brand-accent font-black">CURATOR_MASTER_STATION</span>
              {selectedSong && (
                  <div className="flex items-center gap-8 border-l border-white/10 pl-8">
                    <span className="text-[11px] text-white uppercase tracking-widest font-bold">{selectedSong.title}</span>
                    <span className="text-[10px] text-white/20 uppercase tracking-widest">ISRC: {selectedSong.isrc}</span>
                  </div>
              )}
          </div>
          {selectedSong && (
              <div className="flex gap-4">
                <button 
                    onClick={() => { setSelectedSong(null); setIsPlaying(false); setSyncPoints({}); }} 
                    className="px-6 py-2 border border-white/10 text-[9px] uppercase tracking-widest text-white/40 hover:text-white"
                >
                    Close Session
                </button>
              </div>
          )}
      </div>

      <div className="flex-1 flex overflow-hidden">
          
          {!selectedSong ? (
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 p-20 overflow-y-auto custom-scrollbar">
                {songs.map(song => (
                    <div key={song.id} onClick={() => setSelectedSong(song)} className="group cursor-pointer">
                        <div className="aspect-square bg-slate-900 border border-white/5 overflow-hidden mb-6 group-hover:border-brand-accent transition-all">
                            <img src={song.coverUrl} className="w-full h-full object-cover grayscale opacity-20 group-hover:opacity-100 group-hover:grayscale-0 duration-700" />
                        </div>
                        <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/40 group-hover:text-white font-bold truncate">{song.title}</h4>
                        <div className="text-[8px] text-white/10 mt-1 uppercase font-mono">{song.isrc}</div>
                    </div>
                ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col relative">
                
                {/* SYNC WORKSPACE (LINE-BY-LINE) */}
                <div ref={scrollRef} className="flex-1 bg-black flex flex-col items-center justify-start py-40 overflow-y-auto custom-scrollbar">
                    <div className="max-w-6xl w-full px-10 space-y-1">
                        {lyricsLines.map((line, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => markSyncPoint(idx)}
                                className={`group flex items-center gap-16 p-8 border-b border-white/[0.03] cursor-pointer transition-all 
                                    ${activeIndex === idx ? 'bg-white/[0.05] border-l-4 border-l-brand-accent' : 'hover:bg-white/[0.02]'}
                                `}
                            >
                                <div className="w-40 flex items-center gap-4">
                                    <span className={`text-[11px] font-mono tracking-tighter ${syncPoints[idx] !== undefined ? 'text-brand-accent' : 'text-white/10'}`}>
                                        {syncPoints[idx] !== undefined ? formatTime(syncPoints[idx]) : '0:00.00'}
                                    </span>
                                    {activeIndex === idx && <span className="w-2 h-2 bg-brand-accent rounded-full animate-ping"></span>}
                                </div>
                                <div className={`text-4xl lg:text-7xl tracking-tighter uppercase leading-none 
                                    ${activeIndex === idx ? 'text-white font-black' : 'text-white/20 font-thin group-hover:text-white/40'}
                                `}>
                                    {line}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* HARDWARE CONTROL CONSOLE */}
                <div className="h-28 bg-black border-t border-white/20 px-12 flex items-center gap-16 shadow-[0_-20px_100px_rgba(0,0,0,1)]">
                     <button onClick={handleTogglePlay} className="text-brand-accent hover:text-white transition-all transform active:scale-95">
                        {isPlaying ? (
                            <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                        ) : (
                            <svg className="w-14 h-14" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        )}
                     </button>
                     
                     <div className="flex-1 flex flex-col gap-4">
                        <div className="flex justify-between items-end">
                            <div className="space-y-1">
                                <span className="block text-[10px] text-white/20 uppercase tracking-widest">Master Timecode</span>
                                <span className="text-2xl font-mono text-white font-bold">{formatTime(currentTime)}</span>
                            </div>
                            <div className="text-right">
                                <span className="block text-[10px] text-white/20 uppercase tracking-widest">Duration</span>
                                <span className="text-[11px] font-mono text-white/40">{formatTime(duration)}</span>
                            </div>
                        </div>
                        <div className="h-[3px] bg-white/5 relative overflow-hidden">
                            <div 
                                className="h-full bg-brand-accent transition-all duration-100 ease-linear" 
                                style={{ width: `${(currentTime/duration)*100}%` }}
                            ></div>
                        </div>
                     </div>

                     <div className="flex gap-6">
                        <div className="text-right space-y-2">
                             <div className="text-[9px] text-white/20 uppercase tracking-widest">Status</div>
                             <div className="text-[11px] text-emerald-500 font-bold uppercase tracking-widest">Linked_Operational</div>
                        </div>
                        <button className="px-10 py-4 bg-brand-accent text-black text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all">
                            Submit To Global DB
                        </button>
                     </div>
                </div>

                <audio 
                    ref={audioRef} 
                    src={resolveDirectLink(selectedSong.audioUrl || '')} 
                    onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} 
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} 
                    onEnded={() => setIsPlaying(false)}
                    crossOrigin="anonymous" 
                />
            </div>
          )}
      </div>
    </div>
  );
};

export default Interactive;
