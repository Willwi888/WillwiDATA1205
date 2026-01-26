
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { generateAiVideo } from '../services/geminiService';
import { useToast } from '../components/Layout';

type InteractionMode = 'intro' | 'select' | 'playing' | 'rendering' | 'finished';
type LayoutMode = 'lyrics' | 'subtitles' | 'cover';
type LyricsPosition = 'left' | 'center';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { isAdmin } = useUser();
  const { t } = useTranslation();
  const { showToast } = useToast();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [isPaused, setIsPaused] = useState(true);
  
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('lyrics');
  const [lyricsPosition, setLyricsPosition] = useState<LyricsPosition>('left');
  const [showTrackInfo, setShowTrackInfo] = useState(true);
  
  const [lyricsLines, setLyricsLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bgVideoUrl, setBgVideoUrl] = useState<string | null>(null);
  const [stamps, setStamps] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (selectedSong?.lyrics) {
        setLyricsLines(selectedSong.lyrics.split('\n').filter(l => l.trim().length > 0));
        setStamps([]);
        setCurrentLineIndex(-1);
    }
  }, [selectedSong]);

  const handleTogglePlay = async () => {
      if (!audioRef.current) return;
      if (isPaused) {
          try {
              await audioRef.current.play();
              setIsPaused(false);
              if (currentLineIndex === -1) setCurrentLineIndex(0);
          } catch (e) { showToast("音軌載入失敗", "error"); }
      } else {
          audioRef.current.pause();
          setIsPaused(true);
      }
  };

  const handleLyricClick = (index: number) => {
    if (mode !== 'playing' || isPaused || !audioRef.current) return;
    const now = audioRef.current.currentTime;
    
    // 錄製模式：更新當前行並紀錄時間戳
    if (index >= currentLineIndex) {
        const newStamps = [...stamps];
        newStamps[index] = now;
        setStamps(newStamps);
        setCurrentLineIndex(index);
        if (window.navigator.vibrate) window.navigator.vibrate(10);
    }
  };

  const startExportProcess = async () => {
      // @ts-ignore
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
          showToast("請選擇 API Key 以進行渲染");
          // @ts-ignore
          await window.aistudio.openSelectKey();
      }
      setMode('rendering');
      try {
          const imgUrl = selectedSong?.coverUrl || 'https://placehold.co/1000x1000/000000/FFFFFF?text=COVER';
          const imgResponse = await fetch(imgUrl);
          const blob = await imgResponse.blob();
          const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
          });
          const aiBg = await generateAiVideo(base64, selectedSong?.title || 'Track');
          if (aiBg) {
              setBgVideoUrl(aiBg);
              setMode('finished');
          } else throw new Error();
      } catch (e) {
          showToast("渲染中斷", "error");
          setMode('playing');
      }
  };

  const formatTime = (time: number) => {
      const min = Math.floor(time / 60);
      const sec = Math.floor(time % 60);
      return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans overflow-hidden">
      
      {/* Top Studio Header */}
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black z-50">
          <div className="flex items-center gap-6">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-brand-gold">Master Studio</span>
              <div className="h-4 w-[1px] bg-white/10"></div>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{selectedSong?.title || 'Standalone Project'}</span>
          </div>
          <div className="flex items-center gap-6">
              <button onClick={() => setMode('intro')} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Close Studio</button>
          </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Control Panel (Matching Screenshot) */}
          {mode === 'playing' && (
              <div className="w-64 md:w-80 border-r border-white/5 bg-[#050505] flex flex-col animate-fade-in shrink-0">
                  <div className="p-10 space-y-16">
                      
                      {/* Layout Structure */}
                      <div className="space-y-6">
                          <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Layout Structure</h4>
                          <div className="grid grid-cols-3 gap-3">
                              {(['lyrics', 'subtitles', 'cover'] as LayoutMode[]).map(m => (
                                  <button 
                                    key={m} 
                                    onClick={() => setLayoutMode(m)}
                                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-3 transition-all ${layoutMode === m ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05]'}`}
                                  >
                                      <div className={`w-10 h-10 rounded border ${layoutMode === m ? 'border-brand-gold' : 'border-white/10'}`}></div>
                                      <span className={`text-[8px] font-black uppercase tracking-tighter ${layoutMode === m ? 'text-brand-gold' : 'text-slate-500'}`}>{m}</span>
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Lyrics Position */}
                      <div className="space-y-6">
                          <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Lyrics Position</h4>
                          <div className="grid grid-cols-2 gap-3">
                              {(['left', 'center'] as LyricsPosition[]).map(pos => (
                                  <button 
                                    key={pos} 
                                    onClick={() => setLyricsPosition(pos)}
                                    className={`h-14 border rounded-lg flex items-center justify-center gap-4 transition-all ${lyricsPosition === pos ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5 bg-white/[0.02]'}`}
                                  >
                                      <div className={`w-5 h-0.5 bg-slate-600 rounded-full ${pos === 'left' ? 'mr-1' : ''}`}></div>
                                      <span className={`text-[9px] font-black uppercase tracking-widest ${lyricsPosition === pos ? 'text-brand-gold' : 'text-slate-500'}`}>{pos}</span>
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Track Info Toggle */}
                      <div className="pt-10 border-t border-white/5 flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Track Info</span>
                          <button 
                            onClick={() => setShowTrackInfo(!showTrackInfo)}
                            className={`w-12 h-6 rounded-full relative transition-all duration-300 ${showTrackInfo ? 'bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-slate-800'}`}
                          >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${showTrackInfo ? 'left-7' : 'left-1'}`}></div>
                          </button>
                      </div>
                  </div>
              </div>
          )}

          {/* Center Main Stage Area */}
          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                
                {/* Mode Selectors */}
                {mode === 'intro' && (
                    <div className="text-center max-w-xl animate-fade-in-up px-10">
                        <span className="text-brand-gold text-[10px] font-black uppercase tracking-[1em] block mb-8">{t('before_start_title')}</span>
                        <p className="text-slate-500 text-xs md:text-sm leading-loose uppercase tracking-[0.3em] mb-16 opacity-60">
                            {t('before_start_content')}
                        </p>
                        <button onClick={() => setMode('select')} className="px-20 py-6 bg-brand-gold text-black font-black text-[11px] uppercase tracking-[0.6em] hover:bg-white transition-all shadow-2xl">
                            {t('btn_understand')}
                        </button>
                    </div>
                )}

                {mode === 'select' && (
                    <div className="w-full max-w-7xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 p-12 animate-fade-in overflow-y-auto custom-scrollbar h-full content-start">
                        {songs.filter(s => s.isInteractiveActive).map(song => (
                            <div key={song.id} onClick={() => { setSelectedSong(song); setMode('playing'); }} className="group cursor-pointer">
                                <div className="aspect-square bg-slate-900 border border-white/5 rounded-lg overflow-hidden mb-4 group-hover:border-brand-gold transition-all duration-500">
                                    <img src={song.coverUrl} className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-[2s]" alt="" />
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white truncate">{song.title}</h4>
                            </div>
                        ))}
                    </div>
                )}

                {mode === 'playing' && selectedSong && (
                    <div className="w-full h-full flex items-center justify-center relative">
                        
                        {/* Immersive Preview (Matching Screenshot Style) */}
                        <div className={`w-full h-full flex items-center px-12 md:px-24 transition-all duration-1000 ${lyricsPosition === 'center' ? 'justify-center text-center' : 'justify-start text-left'}`}>
                            <div className="max-w-4xl space-y-4">
                                {lyricsLines.map((line, idx) => (
                                    <p 
                                        key={idx} 
                                        onClick={() => handleLyricClick(idx)}
                                        className={`text-4xl md:text-6xl font-black uppercase tracking-tight py-3 cursor-pointer transition-all duration-500 select-none ${idx === currentLineIndex ? 'text-white scale-100 opacity-100' : idx < currentLineIndex ? 'text-white/5 line-through decoration-brand-gold/20' : 'text-white/20 hover:text-white/40'}`}
                                        style={{ filter: idx === currentLineIndex ? 'drop-shadow(0 0 20px rgba(255,255,255,0.3))' : 'none' }}
                                    >
                                        {line}
                                    </p>
                                ))}
                            </div>
                        </div>

                        {/* Bottom Floating Control Bar (Matching Screenshot) */}
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl h-24 bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-full flex items-center px-10 gap-10 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
                             <button 
                                onClick={handleTogglePlay} 
                                className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:bg-brand-gold transition-all shadow-xl group"
                             >
                                {isPaused ? <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
                             </button>
                             
                             <div className="flex-1 flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-mono text-slate-500 tracking-wider">{formatTime(currentTime)}</span>
                                    {showTrackInfo && (
                                        <div className="text-[8px] font-black uppercase tracking-[0.5em] text-white/40">
                                            {selectedSong.title} — {selectedSong.projectType}
                                        </div>
                                    )}
                                    <span className="text-[9px] font-mono text-slate-500 tracking-wider">{formatTime(duration)}</span>
                                </div>
                                <div className="h-1 bg-white/5 w-full rounded-full overflow-hidden relative">
                                    <div 
                                      className="h-full bg-brand-gold transition-all duration-500 shadow-[0_0_10px_rgba(251,191,36,0.8)]" 
                                      style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                             </div>

                             <button 
                                onClick={startExportProcess} 
                                className="h-14 px-10 bg-brand-gold text-black font-black text-[10px] uppercase tracking-[0.6em] rounded-full hover:bg-white transition-all shadow-lg"
                             >
                                Export Master
                             </button>
                        </div>

                        <audio 
                            ref={audioRef}
                            src={resolveDirectLink(selectedSong.audioUrl || '')}
                            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                            onEnded={() => { setIsPaused(true); setMode('finished'); }}
                            crossOrigin="anonymous"
                        />
                    </div>
                )}

                {mode === 'rendering' && (
                    <div className="text-center space-y-16 animate-fade-in">
                        <div className="relative w-32 h-32 mx-auto">
                            <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-brand-gold border-t-transparent rounded-full animate-spin shadow-[0_0_30px_rgba(251,191,36,0.3)]"></div>
                        </div>
                        <div className="space-y-6">
                            <h2 className="text-4xl font-black uppercase tracking-[0.8em]">Rendering</h2>
                            <p className="text-slate-600 text-[10px] uppercase tracking-widest font-bold opacity-60">VEO AI generating cinema noise textures...</p>
                        </div>
                    </div>
                )}

                {mode === 'finished' && bgVideoUrl && (
                    <div className="w-full h-full relative flex items-center justify-center animate-fade-in">
                         <video src={bgVideoUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover opacity-30" />
                         <div className="relative z-10 text-center space-y-16 bg-black/60 backdrop-blur-3xl p-24 border border-white/5 rounded-sm max-w-2xl">
                             <div className="space-y-4">
                                <span className="text-brand-gold text-[9px] font-black uppercase tracking-[1em] block mb-2">Success</span>
                                <h2 className="text-6xl font-black uppercase tracking-tighter leading-none">Master Ready</h2>
                                <p className="text-slate-500 text-[9px] uppercase tracking-[0.5em] mt-4">Handcrafted studio export complete</p>
                             </div>
                             <div className="flex flex-col gap-4">
                                <a href={bgVideoUrl} download={`${selectedSong?.title}_MASTER.mp4`} className="px-20 py-6 bg-white text-black font-black text-[11px] uppercase tracking-[0.6em] hover:bg-brand-gold transition-all shadow-2xl">
                                    {t('btn_get_mp4')}
                                </a>
                                <button onClick={() => setMode('intro')} className="text-[10px] font-black text-slate-700 hover:text-white uppercase tracking-widest transition-colors py-4">Start New Project</button>
                             </div>
                         </div>
                    </div>
                )}
          </div>
      </div>
    </div>
  );
};

export default Interactive;
