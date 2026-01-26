
import React, { useState, useEffect, useRef } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useToast } from '../components/Layout';

type Mode = 'intro' | 'select' | 'playing' | 'finished';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { isAdmin } = useUser();
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [mode, setMode] = useState<Mode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [lyricsLines, setLyricsLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [stamps, setStamps] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (selectedSong?.lyrics) {
        setLyricsLines(selectedSong.lyrics.split('\n').filter(l => l.trim().length > 0));
        setStamps([]);
        setCurrentLineIndex(-1);
    }
  }, [selectedSong]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && mode === 'playing') {
            e.preventDefault();
            if (isPaused) handleTogglePlay();
            else captureStamp();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isPaused, currentLineIndex]);

  const handleTogglePlay = async () => {
      if (!audioRef.current) return;
      if (isPaused) {
          try { 
              await audioRef.current.play(); 
              setIsPaused(false); 
              if (currentLineIndex === -1) setCurrentLineIndex(0); 
          } catch (e) { 
              showToast("AUDIO LOAD FAILED", "error"); 
          }
      } else { 
          audioRef.current.pause(); 
          setIsPaused(true); 
      }
  };

  const captureStamp = () => {
    if (mode !== 'playing' || isPaused || !audioRef.current) return;
    const now = audioRef.current.currentTime;
    if (currentLineIndex < lyricsLines.length) {
        setStamps(prev => { 
            const next = [...prev]; 
            next[currentLineIndex] = now; 
            return next; 
        });
        setCurrentLineIndex(prev => prev + 1);
        if (window.navigator.vibrate) window.navigator.vibrate(20);
    }
    if (currentLineIndex === lyricsLines.length - 1) {
        setTimeout(() => setMode('finished'), 1500);
    }
  };

  const formatTime = (time: number) => {
      const min = Math.floor(time / 60); const sec = Math.floor(time % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const exportLRC = () => {
      if (!selectedSong || stamps.length === 0) return;
      let lrc = `[ti:${selectedSong.title}]\n[ar:Willwi]\n`;
      lyricsLines.forEach((line, i) => {
          const time = stamps[i] || 0;
          const min = Math.floor(time / 60).toString().padStart(2, '0');
          const sec = (time % 60).toFixed(2).padStart(5, '0');
          lrc += `[${min}:${sec}]${line}\n`;
      });
      const blob = new Blob([lrc], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedSong.title}.lrc`;
      a.click();
      showToast("LRC EXPORTED");
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-brand-gold selection:text-black">
      
      {/* Studio Header */}
      <div className="h-20 border-b border-white/5 flex items-center justify-between px-10 fixed top-0 w-full z-50 bg-black/80 backdrop-blur-3xl">
          <div className="flex items-center gap-6">
              <span className="text-[10px] font-thin uppercase tracking-[1em] text-brand-gold">Sync Pro Engine</span>
              <div className="h-4 w-[0.5px] bg-white/20"></div>
              <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">{selectedSong?.title || 'IDLE'}</span>
              {isAdmin && <span className="px-2 py-0.5 bg-brand-gold/10 text-brand-gold text-[8px] font-black border border-brand-gold/20">ADMIN_OVERRIDE</span>}
          </div>
          <button onClick={() => setMode('intro')} className="text-[9px] font-thin uppercase tracking-widest text-slate-600 hover:text-white transition-all">TERMINATE_SESSION</button>
      </div>

      <div className="flex-1 flex pt-20">
          <div className="flex-1 bg-[#020617] relative flex items-center justify-center overflow-hidden">
                {mode === 'intro' && (
                    <div className="text-center max-w-3xl animate-fade-in-up px-10 py-20">
                        <div className="w-12 h-[0.5px] bg-brand-gold mx-auto mb-16 opacity-30"></div>
                        <h2 className="text-brand-gold text-[10px] font-thin uppercase tracking-[1.5em] block mb-12">{t('before_start_title')}</h2>
                        <div className="space-y-12 mb-20">
                            <p className="text-slate-400 text-sm md:text-xl leading-[2.6] uppercase tracking-[0.4em] font-thin opacity-80 whitespace-pre-line">
                                {t('before_start_content')}
                            </p>
                        </div>
                        <button onClick={() => setMode('select')} className="px-24 py-8 border border-brand-gold/30 text-brand-gold font-thin text-[10px] uppercase tracking-[1em] hover:bg-brand-gold hover:text-black transition-all">
                            {t('btn_understand')}
                        </button>
                    </div>
                )}

                {mode === 'select' && (
                    <div className="w-full h-full max-w-7xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 p-16 animate-fade-in overflow-y-auto custom-scrollbar">
                        {songs.filter(s => s.isInteractiveActive || isAdmin).map(song => (
                            <div key={song.id} onClick={() => { setSelectedSong(song); setMode('playing'); }} className="group cursor-pointer">
                                <div className="aspect-square bg-slate-900 border border-white/5 overflow-hidden mb-6 group-hover:border-brand-gold transition-all duration-1000">
                                    <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[3s] grayscale group-hover:grayscale-0" alt="" />
                                </div>
                                <h4 className="text-[10px] font-thin uppercase tracking-widest text-slate-500 group-hover:text-white truncate">{song.title}</h4>
                            </div>
                        ))}
                    </div>
                )}

                {mode === 'playing' && selectedSong && (
                    <div className="w-full h-full flex flex-col items-center justify-center relative bg-black">
                        <div 
                            className="absolute inset-0 bg-cover bg-center opacity-[0.03] blur-[150px] scale-125" 
                            style={{ backgroundImage: `url(${selectedSong.coverUrl})` }}
                        ></div>
                        
                        <div className="w-full max-w-5xl px-12 text-center relative z-10 flex-1 flex flex-col justify-center">
                            <div className="mb-32 opacity-20 text-[9px] tracking-[1.5em] uppercase font-thin text-brand-gold">{t('interactive_hint')}</div>
                            
                            <div className="space-y-4">
                                {lyricsLines.map((line, idx) => (
                                    <p key={idx} className={`text-3xl md:text-5xl font-thin uppercase tracking-tighter py-5 transition-all duration-[1500ms] ${idx === currentLineIndex ? 'text-brand-gold scale-105 blur-none' : idx < currentLineIndex ? 'text-white/5 blur-[2px]' : 'text-white/20 blur-[1px]'}`}>
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>

                        {/* Capture Controls */}
                        <div className="absolute bottom-32 left-0 w-full flex flex-col items-center gap-12 z-20">
                            <div className="text-[8px] text-white/20 uppercase tracking-[1em] mb-4">{t('interactive_action')}</div>
                            
                            <div className="flex items-center gap-20">
                                <button onClick={handleTogglePlay} className="w-20 h-20 rounded-full border border-white/5 flex items-center justify-center text-white/40 hover:border-brand-gold hover:text-brand-gold transition-all">
                                    {isPaused ? <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
                                </button>
                                
                                <button 
                                    onClick={captureStamp} 
                                    disabled={isPaused}
                                    className="w-40 h-40 border border-brand-gold/30 rounded-full flex flex-col items-center justify-center text-brand-gold text-[10px] tracking-[0.4em] uppercase hover:bg-brand-gold/10 transition-all active:scale-90 disabled:opacity-20 disabled:scale-95"
                                >
                                    <span className="mb-2 font-mono">SPACE</span>
                                    <span className="opacity-40">CAPTURE</span>
                                </button>

                                <div className="w-20 h-20 flex flex-col items-center justify-center border border-white/5 text-[9px] font-mono text-slate-700">
                                    {currentLineIndex + 1} / {lyricsLines.length}
                                </div>
                            </div>

                            <div className="w-full max-w-2xl h-[1px] bg-white/5 relative overflow-hidden">
                                <div className="h-full bg-brand-gold transition-all duration-300" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-700 tracking-widest">{formatTime(currentTime)} / {formatTime(duration)}</span>
                        </div>

                        <audio 
                            ref={audioRef} 
                            src={resolveDirectLink(selectedSong.audioUrl || selectedSong.dropboxUrl || '')} 
                            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)} 
                            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)} 
                            onEnded={() => { setIsPaused(true); setMode('finished'); }} 
                            crossOrigin="anonymous" 
                        />
                    </div>
                )}

                {mode === 'finished' && (
                    <div className="text-center space-y-20 animate-fade-in p-24 bg-white/[0.01] border border-white/5 backdrop-blur-3xl relative overflow-hidden">
                         <div className="absolute top-0 left-0 w-full h-[0.5px] bg-gradient-to-r from-transparent via-brand-gold/20 to-transparent"></div>
                         
                         <div className="space-y-12">
                            <h2 className="text-7xl font-thin uppercase tracking-tighter text-white">{t('finished_title')}</h2>
                            <p className="text-slate-400 text-sm md:text-lg uppercase tracking-[0.4em] font-thin max-w-2xl mx-auto leading-loose whitespace-pre-line opacity-80">
                                {t('finished_content')}
                            </p>
                         </div>
                         
                         <div className="flex flex-col gap-10 items-center">
                            <button onClick={exportLRC} className="px-24 py-8 bg-white text-black font-thin text-[10px] uppercase tracking-[1em] hover:bg-brand-gold transition-all shadow-[0_30px_60px_rgba(0,0,0,0.5)]">
                                {t('btn_get_mp4')}
                            </button>
                            <div className="flex gap-12">
                                <button onClick={() => setMode('select')} className="text-[9px] font-thin text-slate-600 hover:text-white uppercase tracking-widest transition-colors">NEW_TRACK</button>
                                <button onClick={() => setMode('intro')} className="text-[9px] font-thin text-slate-600 hover:text-white uppercase tracking-widest transition-colors">END_SESSION</button>
                            </div>
                         </div>
                    </div>
                )}
          </div>
      </div>
    </div>
  );
}; export default Interactive;
