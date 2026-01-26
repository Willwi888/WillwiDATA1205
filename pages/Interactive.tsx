
// Fix: Corrected progress bar width logic to handle initial 0/NaN states
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { generateAiVideo } from '../services/geminiService';
import { useToast } from '../components/Layout';

type InteractionMode = 'intro' | 'select' | 'philosophy' | 'playing' | 'rendering' | 'finished';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    if (index === currentLineIndex + 1 || isAdmin) {
        const newStamps = [...stamps];
        newStamps[index] = now;
        setStamps(newStamps);
        setCurrentLineIndex(index);
        if (window.navigator.vibrate) window.navigator.vibrate(20);
    }
  };

  const startExportProcess = async () => {
      // @ts-ignore
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
          showToast("請選擇 API Key 以進行 8s 噪點背景渲染");
          // @ts-ignore
          await window.aistudio.openSelectKey();
      }
      setMode('rendering');
      try {
          const imgResponse = await fetch(selectedSong?.coverUrl || '');
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

  // 進度計算：確保不出現 NaN
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-brand-gold selection:text-black">
      
      <div className="h-16 border-b border-white/5 flex items-center justify-between px-8 bg-black/50 backdrop-blur-md fixed top-0 w-full z-50">
          <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-gold">Master Studio</span>
              <div className="h-4 w-[1px] bg-white/10"></div>
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest">{selectedSong?.title || 'No Project Selected'}</span>
          </div>
          <div className="flex items-center gap-6">
              <button onClick={() => setMode('intro')} className="text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Close Studio</button>
          </div>
      </div>

      <div className="flex-1 flex pt-16">
          {(mode === 'playing' || mode === 'finished') && (
              <div className="w-80 border-r border-white/5 bg-[#0e0e0e] flex flex-col overflow-y-auto custom-scrollbar animate-fade-in">
                  <div className="p-8 space-y-12">
                      <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Layout Structure</h4>
                          <div className="grid grid-cols-3 gap-3">
                              {(['lyrics', 'subtitles', 'cover'] as LayoutMode[]).map(m => (
                                  <button 
                                    key={m} 
                                    onClick={() => setLayoutMode(m)}
                                    className={`aspect-square rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${layoutMode === m ? 'border-brand-gold bg-brand-gold/10' : 'border-white/5 bg-white/[0.02] hover:bg-white/5'}`}
                                  >
                                      <div className={`w-8 h-8 rounded-sm border ${layoutMode === m ? 'border-brand-gold' : 'border-white/20'}`}></div>
                                      <span className="text-[8px] font-black uppercase tracking-tighter">{m}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div className="space-y-6">
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lyrics Position</h4>
                          <div className="grid grid-cols-2 gap-3">
                              {(['left', 'center'] as LyricsPosition[]).map(pos => (
                                  <button 
                                    key={pos} 
                                    onClick={() => setLyricsPosition(pos)}
                                    className={`h-12 border rounded-md flex items-center justify-center transition-all ${lyricsPosition === pos ? 'border-brand-gold bg-brand-gold/10' : 'border-white/5 bg-white/[0.02]'}`}
                                  >
                                      <div className={`w-4 h-1 bg-white/30 rounded-full ${pos === 'left' ? 'mr-4' : ''}`}></div>
                                      <span className="text-[9px] font-black uppercase">{pos}</span>
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div className="flex justify-between items-center py-6 border-t border-white/5">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Track Info</span>
                          <button 
                            onClick={() => setShowTrackInfo(!showTrackInfo)}
                            className={`w-10 h-5 rounded-full relative transition-all ${showTrackInfo ? 'bg-orange-500' : 'bg-slate-800'}`}
                          >
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${showTrackInfo ? 'right-1' : 'left-1'}`}></div>
                          </button>
                      </div>
                  </div>
              </div>
          )}

          <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
                {mode === 'intro' && (
                    <div className="text-center max-w-xl animate-fade-in-up">
                        <span className="text-brand-gold text-[10px] font-black uppercase tracking-[0.5em] block mb-6">{t('before_start_title')}</span>
                        <p className="text-slate-400 text-sm leading-loose uppercase tracking-widest mb-12 opacity-60">
                            {t('before_start_content')}
                        </p>
                        <button onClick={() => setMode('select')} className="px-16 py-6 bg-brand-gold text-black font-black text-xs uppercase tracking-[0.4em] hover:bg-white transition-all">
                            {t('btn_understand')}
                        </button>
                    </div>
                )}

                {mode === 'select' && (
                    <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 p-12 animate-fade-in">
                        {songs.filter(s => s.isInteractiveActive).map(song => (
                            <div key={song.id} onClick={() => { setSelectedSong(song); setMode('playing'); }} className="group cursor-pointer">
                                <div className="aspect-square bg-slate-900 border border-white/5 rounded-sm overflow-hidden mb-4 group-hover:border-brand-gold transition-all duration-500">
                                    <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[2s]" alt="" />
                                </div>
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white truncate">{song.title}</h4>
                            </div>
                        ))}
                    </div>
                )}

                {mode === 'playing' && selectedSong && (
                    <div className="w-full h-full flex items-center justify-center relative">
                        <div className={`w-full max-w-3xl px-12 transition-all duration-700 ${lyricsPosition === 'center' ? 'text-center' : 'text-left'}`}>
                            {lyricsLines.map((line, idx) => (
                                <p 
                                    key={idx} 
                                    onClick={() => handleLyricClick(idx)}
                                    className={`text-4xl font-black uppercase tracking-tight py-4 cursor-pointer transition-all duration-500 ${idx === currentLineIndex ? 'text-brand-gold scale-110' : idx < currentLineIndex ? 'text-white/10' : 'text-white/30 hover:text-white'}`}
                                >
                                    {line}
                                </p>
                            ))}
                        </div>

                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-12 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-full px-12 py-6 shadow-2xl">
                             <button onClick={handleTogglePlay} className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-brand-gold transition-all">
                                {isPaused ? <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>}
                             </button>
                             <div className="flex flex-col gap-2 w-48">
                                <div className="flex justify-between text-[8px] font-black text-slate-500 uppercase tracking-widest">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                                <div className="h-1 bg-white/10 w-full rounded-full overflow-hidden relative">
                                    <div 
                                      className="h-full bg-brand-gold transition-all duration-300" 
                                      style={{ width: `${progressPercent}%` }}
                                    ></div>
                                </div>
                             </div>
                             <button onClick={startExportProcess} className="h-12 px-8 bg-brand-gold text-black font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-white transition-all">
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
                    <div className="text-center space-y-12 animate-fade-in">
                        <div className="w-24 h-24 border-2 border-brand-gold border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_50px_rgba(251,191,36,0.2)]"></div>
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black uppercase tracking-[0.5em]">Rendering</h2>
                            <p className="text-slate-600 text-[10px] uppercase tracking-widest font-bold">VEO AI generating organic grain background loop...</p>
                        </div>
                    </div>
                )}

                {mode === 'finished' && bgVideoUrl && (
                    <div className="w-full h-full relative flex items-center justify-center animate-fade-in">
                         <video src={bgVideoUrl} autoPlay loop muted className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm" />
                         <div className="relative z-10 text-center space-y-12 bg-black/40 backdrop-blur-3xl p-20 border border-white/5 rounded-sm">
                             <div className="space-y-4">
                                <h2 className="text-6xl font-black uppercase tracking-tighter">Master Ready</h2>
                                <p className="text-slate-400 text-[10px] uppercase tracking-[0.5em]">Handcrafted studio render complete</p>
                             </div>
                             <div className="flex flex-col gap-6">
                                <a href={bgVideoUrl} download={`${selectedSong?.title}_Render.mp4`} className="px-16 py-6 bg-white text-black font-black text-xs uppercase tracking-[0.6em] hover:bg-brand-gold transition-all shadow-2xl">
                                    {t('btn_get_mp4')}
                                </a>
                                <button onClick={() => setMode('intro')} className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest transition-colors">Start New Project</button>
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
