
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
  
  // Studio UI States (Matching Screenshot)
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize Lyrics
  useEffect(() => {
    if (selectedSong?.lyrics) {
        setLyricsLines(selectedSong.lyrics.split('\n').filter(l => l.trim().length > 0));
        setStamps([]);
        setCurrentLineIndex(-1);
    }
  }, [selectedSong]);

  // Audio Control
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

  // Mock Waveform Visualization
  useEffect(() => {
      if (mode === 'playing' && canvasRef.current) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          
          const draw = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
              const barWidth = 4;
              const gap = 2;
              const count = canvas.width / (barWidth + gap);
              for (let i = 0; i < count; i++) {
                  const h = Math.random() * canvas.height * 0.6;
                  ctx.fillRect(i * (barWidth + gap), (canvas.height - h) / 2, barWidth, h);
              }
              if (!isPaused) requestAnimationFrame(draw);
          };
          draw();
      }
  }, [mode, isPaused]);

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-brand-gold selection:text-black">
      
      {/* Top Header - Studio Status */}
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
          {/* Sidebar - Controls (Matching Screenshot Left Panel) */}
          {(mode === 'playing' || mode === 'finished') && (
              <div className="w-80 border-r border-white/5 bg-[#0e0e0e] flex flex-col overflow-y-auto custom-scrollbar animate-fade-in">
                  <div className="p-8 space-y-12">
                      {/* Structure Tab */}
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

                      {/* Lyrics Position */}
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

                      {/* Track Info Toggle */}
                      <div className="flex justify-between items-center py-6 border-t border-white/5">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Track Info</span>
                          <button 
                            onClick={() => setShowTrackInfo(!showTrackInfo)}
                            className={`w-10 h-5 rounded-full relative transition-all ${showTrackInfo ? 'bg-orange-500' : 'bg-slate-800'}`}
                          >
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all