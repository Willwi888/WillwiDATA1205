import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import PaymentModal from '../components/PaymentModal';
import { useTranslation } from '../context/LanguageContext';
import { GoogleGenAI } from "@google/genai";

type InteractionMode = 'menu' | 'lyric-maker' | 'ai-director';
type GameState = 'select' | 'ready' | 'standby' | 'playing' | 'processing' | 'finished';

const LoginModal = ({ onClose, onLogin }: { onClose: () => void, onLogin: (name: string, email: string) => void }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/98 backdrop-blur-xl" onClick={onClose}></div>
            <div className="relative z-10 max-w-md w-full bg-slate-950 border border-white/10 p-12 shadow-2xl">
                <h2 className="text-xl font-black text-white mb-8 uppercase tracking-[0.3em] text-center">Studio Session Access</h2>
                <div className="space-y-6">
                    <input className="w-full bg-transparent border-b border-white/20 px-2 py-4 text-white text-center outline-none focus:border-brand-accent transition-all text-sm tracking-widest" placeholder="NAME" value={name} onChange={e => setName(e.target.value)} />
                    <input className="w-full bg-transparent border-b border-white/20 px-2 py-4 text-white text-center outline-none focus:border-brand-accent transition-all text-sm tracking-widest" placeholder="EMAIL" value={email} onChange={e => setEmail(e.target.value)} />
                    <button onClick={() => onLogin(name, email)} className="w-full py-4 mt-8 bg-white text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-brand-accent transition-colors">Establish Connection</button>
                </div>
            </div>
        </div>
    );
};

const Interactive: React.FC = () => {
  const { user, login, deductCredit, isAdmin } = useUser();
  const { songs } = useData();
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [gameState, setGameState] = useState<GameState>('select');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // Video Generation Specific State
  const [videoPrompt, setVideoPrompt] = useState('');
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  
  const [lineIndex, setLineIndex] = useState(0); 
  const [showEndMarker, setShowEndMarker] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const coverImageRef = useRef<HTMLImageElement | null>(null);
  const lyricsArrayRef = useRef<string[]>([]);
  
  const handleLoginSubmit = (name: string, email: string) => {
      login(name, email);
      setShowLoginModal(false);
  };

  const handleToolClick = (targetMode: InteractionMode) => {
      if (!user && !isAdmin) { setShowLoginModal(true); return; }
      setMode(targetMode);
      setGameState('select');
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    if (mode === 'lyric-maker') {
        if (!song.lyrics) { alert("Data Incomplete: No Lyrics Found."); return; }
        // Clean lyrics and prepare for 3-line display
        const rawLines = song.lyrics.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        lyricsArrayRef.current = ["(SYSTEM INITIALIZED)", ...rawLines, "(ARCHIVE COMPLETE)"]; 
        setGameState('ready');
    } else {
        setVideoPrompt(`A cinematic visual representation of a song titled "${song.title}". Mood: ${song.description || "Experimental, artistic, emotional"}. Cinematic style, high quality.`);
        setGameState('ready');
    }
  };

  // --- AI VIDEO GENERATION (VEO) ---
  const handleGenerateVideo = async () => {
    if (!isAdmin && user!.credits < 5) {
        alert("Insufficient Credits. AI Video requires 5 credits.");
        setShowPaymentModal(true);
        return;
    }

    const hasKey = await (window as any).aistudio?.hasSelectedApiKey();
    if (!hasKey) {
        alert("This module requires a paid API Project. Please select your API Key in the next dialog.");
        await (window as any).aistudio?.openSelectKey();
    }

    setIsGeneratingVideo(true);
    setGameState('processing');
    setVideoProgress('INITIALIZING VEO ENGINE...');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        setVideoProgress('CRAFTING CINEMATIC SEQUENCE... (Est. 1-3 mins)');
        let operation = await ai.models.generateVideos({
            model: 'veo-3.1-fast-generate-preview',
            prompt: videoPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 8000));
            setVideoProgress('RENDERING TEMPORAL COHERENCE...');
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
            setVideoProgress('FETCHING BINARY STREAM...');
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setGeneratedVideoUrl(url);
            setGameState('finished');
            if (!isAdmin) deductCredit();
        } else {
            throw new Error("Generation Failed");
        }
    } catch (e) {
        console.error(e);
        alert("Engine Error: " + (e as Error).message);
        setGameState('ready');
    } finally {
        setIsGeneratingVideo(false);
    }
  };

  // --- LYRIC MAKER LOGIC ---
  const enterStandby = () => {
      if (!selectedSong) return;
      if (!isAdmin && user!.credits <= 0) {
          setShowPaymentModal(true);
          return;
      }
      setGameState('standby');
      setLineIndex(0);
      recordedChunksRef.current = [];
      setTimeout(() => drawFrame(), 100);
  };

  const startRecording = () => {
      if (!canvasRef.current) return;
      const canvasStream = canvasRef.current.captureStream(60); // 60fps for smoother motion
      let stream = canvasStream;
      try {
          if (audioRef.current) {
               // @ts-ignore
               const audioStream = audioRef.current.captureStream?.() || audioRef.current.mozCaptureStream?.();
               if (audioStream) stream = new MediaStream([...canvasStream.getTracks(), ...audioStream.getAudioTracks()]);
          }
      } catch (e) { console.warn("Audio node restricted", e); }

      try {
        // Preference for MP4 if supported
        const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4;codecs=avc1' : 'video/webm;codecs=vp9';
        const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
        
        recorder.ondataavailable = e => e.data.size > 0 && recordedChunksRef.current.push(e.data);
        recorder.onstop = () => {
            const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
            const blob = new Blob(recordedChunksRef.current, { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `WILLWI_LYRIC_MASTER_${selectedSong?.title}.${extension}`;
            a.click();
            setGameState('finished');
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        audioRef.current?.play();
        setGameState('playing');
        requestAnimationFrame(loop);
      } catch (e) { alert("Recording Engine Initialization Failed."); setGameState('ready'); }
  };

  const loop = () => {
      drawFrame();
      if (gameState === 'playing') animationFrameRef.current = requestAnimationFrame(loop);
  };

  const drawFrame = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;
      const w = canvas.width, h = canvas.height;
      
      // 1. BASE BACKGROUND
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      // 2. BLURRED COVER BACKGROUND
      if (coverImageRef.current) {
          ctx.save();
          ctx.filter = 'blur(120px) brightness(0.4)';
          // Cover the whole canvas with aspect-fill logic
          const scale = Math.max(w / coverImageRef.current.width, h / coverImageRef.current.height);
          const iw = coverImageRef.current.width * scale;
          const ih = coverImageRef.current.height * scale;
          ctx.drawImage(coverImageRef.current, (w - iw) / 2, (h - ih) / 2, iw, ih);
          ctx.restore();
      }

      // 3. OVERLAYS
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, 0, w, h);

      // 4. LOWER IDENTITY SECTION (1:1 Cover Below Lyrics)
      const coverSize = 360;
      const bottomY = h - 180;
      const coverX = w / 2 - coverSize / 2;
      const coverY = bottomY - coverSize / 2;

      if (coverImageRef.current) {
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 60;
          ctx.drawImage(coverImageRef.current, coverX, coverY, coverSize, coverSize);
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          ctx.strokeRect(coverX, coverY, coverSize, coverSize);
          ctx.restore();
      }

      // Song Info (Centered below/around the identity)
      ctx.textAlign = 'center';
      ctx.fillStyle = 'white';
      ctx.font = '900 32px Montserrat';
      ctx.fillText(selectedSong.title.toUpperCase(), w / 2, coverY + coverSize + 50);
      ctx.font = '700 14px Montserrat';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText("WILLWI MUSIC ARCHIVE ● OFFICIAL MASTER", w / 2, coverY + coverSize + 80);

      // 5. LYRICS AREA (3 lines visible)
      const centerY = h / 2 - 180;
      const lineSpacing = 100;
      
      const prevLine = lyricsArrayRef.current[lineIndex - 1] || "";
      const currLine = lyricsArrayRef.current[lineIndex] || "";
      const nextLine = lyricsArrayRef.current[lineIndex + 1] || "";

      // Previous Line (Faded)
      ctx.font = '600 40px Montserrat';
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillText(prevLine, w / 2, centerY - lineSpacing);
      
      // END Marker for previous line (briefly shows when synced)
      if (showEndMarker && prevLine && prevLine !== "(SYSTEM INITIALIZED)") {
          ctx.font = '900 10px Montserrat';
          ctx.fillStyle = '#fbbf24';
          ctx.fillText("● END", w / 2 + (ctx.measureText(prevLine).width / 2) + 40, centerY - lineSpacing);
      }

      // Current Line (Bold & Bright)
      ctx.font = '900 72px Montserrat';
      ctx.fillStyle = 'white';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 20;
      ctx.fillText(currLine, w / 2, centerY);
      ctx.shadowBlur = 0;

      // Next Line (Faded)
      ctx.font = '600 40px Montserrat';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillText(nextLine, w / 2, centerY + lineSpacing);

      // 6. RECORDING INDICATOR
      if (gameState === 'playing') {
          ctx.save();
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(80, 80, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '900 12px Montserrat';
          ctx.fillStyle = 'white';
          ctx.textAlign = 'left';
          ctx.fillText("LIVE CAPTURE MASTERING", 100, 85);
          ctx.restore();
      }
  };

  const handleNext = () => {
      if (lineIndex < lyricsArrayRef.current.length - 1) {
          setLineIndex(prev => prev + 1);
          setShowEndMarker(true);
          setTimeout(() => setShowEndMarker(false), 800);

          if (lyricsArrayRef.current[lineIndex+1] === "(ARCHIVE COMPLETE)") {
            setTimeout(finish, 2000);
          }
      } else finish();
  };

  const finish = () => {
      if (gameState !== 'playing') return;
      setGameState('processing');
      audioRef.current?.pause();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
      }
      if (!isAdmin) deductCredit(); 
  };

  useEffect(() => {
      if (selectedSong && mode === 'lyric-maker') {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = selectedSong.coverUrl;
          img.onload = () => { coverImageRef.current = img; drawFrame(); };
      }
  }, [selectedSong, mode]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (gameState === 'standby') startRecording();
            else if (gameState === 'playing') handleNext();
        }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, lineIndex]);

  // --- MENU VIEW ---
  if (mode === 'menu') {
      return (
        <div className="max-w-6xl mx-auto pt-24 px-6 pb-20">
             {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={handleLoginSubmit} />}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <button onClick={() => handleToolClick('lyric-maker')} className="h-96 bg-slate-900 border border-white/5 p-12 text-left hover:border-brand-accent transition-all group relative overflow-hidden flex flex-col justify-end">
                     <div className="absolute top-10 left-10 text-[10px] text-brand-gold font-bold tracking-[0.5em] uppercase opacity-50">Module 01</div>
                     <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Dynamic Lyric Engine</h3>
                     <div className="h-px w-12 bg-white/20 mb-4 group-hover:w-full transition-all duration-700"></div>
                     <p className="text-slate-500 text-xs tracking-widest uppercase leading-loose">Manual synchronization studio for high-fidelity lyric video production.</p>
                 </button>
                 <button 
                    onClick={() => handleToolClick('ai-director')} 
                    className={`h-96 border p-12 text-left transition-all group relative overflow-hidden flex flex-col justify-end ${isAdmin || (user && user.credits >= 5) ? 'bg-slate-900 border-white/5 hover:border-brand-accent' : 'bg-slate-950 border-white/5 opacity-40 cursor-not-allowed'}`}
                 >
                     <div className="absolute top-10 left-10 text-[10px] text-brand-accent font-bold tracking-[0.5em] uppercase opacity-50">Module 02</div>
                     <h3 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">AI Vision Director</h3>
                     <div className="h-px w-12 bg-brand-accent/30 mb-4 group-hover:w-full transition-all duration-700"></div>
                     <p className="text-slate-500 text-xs tracking-widest uppercase leading-loose">
                         {isAdmin || (user && user.credits >= 5) ? 'Neural-driven cinematic video generation powered by Veo.' : 'Access Restricted: Credits or Admin privileges required.'}
                     </p>
                 </button>
             </div>
        </div>
      );
  }

  // --- INTERACTIVE STUDIO VIEW ---
  return (
    <div className="max-w-7xl mx-auto pt-10 px-6 pb-20">
        {showPaymentModal && <PaymentModal isOpen={true} onClose={() => setShowPaymentModal(false)} />}
        
        <div className="mb-10 flex justify-between items-center border-b border-white/5 pb-4">
            <button onClick={() => setMode('menu')} className="text-[10px] font-bold text-slate-500 hover:text-white transition-all tracking-[0.2em] uppercase">← Return to Modules</button>
            <div className="text-[10px] font-mono text-brand-accent tracking-widest uppercase">{mode.replace('-', ' ')} Studio</div>
        </div>

        {gameState === 'select' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {songs.map(s => (
                    <div key={s.id} onClick={() => handleSelectSong(s)} className="bg-slate-900 p-4 border border-white/5 cursor-pointer hover:border-brand-accent transition-all animate-fade">
                        <img src={s.coverUrl} className="w-full aspect-square mb-4 object-cover" alt="cover" />
                        <h4 className="font-bold text-white text-[11px] uppercase tracking-widest px-2">{s.title}</h4>
                    </div>
                ))}
            </div>
        )}

        {selectedSong && gameState !== 'select' && (
            <div className="max-w-4xl mx-auto">
                {mode === 'lyric-maker' ? (
                    <div className="flex flex-col items-center">
                        <div className="mb-12 text-center h-20 flex flex-col justify-center">
                            {gameState === 'ready' && <button onClick={enterStandby} className="px-12 py-5 border border-white/20 text-white font-black uppercase tracking-[0.4em] text-[10px] hover:bg-white hover:text-black transition-all">Initialize Studio</button>}
                            {gameState === 'standby' && <div className="text-white font-black animate-pulse text-xs tracking-[0.5em] cursor-pointer" onClick={startRecording}>[ PRESS SPACE OR CLICK TO START CAPTURE ]</div>}
                            {gameState === 'playing' && <div className="text-red-500 font-black animate-pulse uppercase tracking-[0.5em] text-xs" onClick={handleNext}>● CAPTURING STREAM</div>}
                            {gameState === 'processing' && <div className="text-brand-accent font-black animate-pulse uppercase tracking-[0.5em] text-xs">ENCODING MASTER...</div>}
                        </div>
                        <div className="relative overflow-hidden border border-white/10 shadow-2xl bg-black w-full rounded-lg">
                            <canvas ref={canvasRef} width={1920} height={1080} className="w-full cursor-pointer" onClick={() => (gameState === 'playing' ? handleNext() : gameState === 'standby' ? startRecording() : null)} />
                        </div>
                        {selectedSong.audioUrl && <audio ref={audioRef} src={selectedSong.audioUrl} crossOrigin="anonymous" className="hidden" />}
                    </div>
                ) : (
                    <div className="bg-slate-900 border border-white/5 p-12">
                        <div className="flex flex-col md:flex-row gap-12 items-start mb-12">
                            <img src={selectedSong.coverUrl} className="w-48 aspect-square object-cover border border-white/10 shadow-2xl" alt="cover" />
                            <div className="flex-grow space-y-4">
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{selectedSong.title}</h3>
                                <p className="text-slate-500 text-[10px] uppercase tracking-[0.3em]">AI Director Terminal</p>
                                
                                {gameState === 'ready' && (
                                    <div className="space-y-6 pt-6 animate-fade">
                                        <div className="bg-black/50 p-4 border border-white/5">
                                            <label className="block text-[9px] text-slate-600 uppercase tracking-widest mb-2 font-mono">Generation Prompt</label>
                                            <textarea 
                                                className="w-full bg-transparent text-slate-300 text-sm font-mono focus:outline-none h-24 leading-relaxed"
                                                value={videoPrompt}
                                                onChange={e => setVideoPrompt(e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleGenerateVideo}
                                            className="w-full py-5 bg-brand-accent text-slate-950 font-black uppercase tracking-[0.4em] text-[10px] hover:bg-white transition-all shadow-lg"
                                        >
                                            Generate Cinematic Vision
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {gameState === 'processing' && (
                            <div className="flex flex-col items-center justify-center py-24 text-center space-y-6 animate-pulse">
                                <div className="w-16 h-16 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin"></div>
                                <div className="text-xs font-mono text-brand-accent uppercase tracking-[0.5em]">{videoProgress}</div>
                                <div className="max-w-md text-[10px] text-slate-600 uppercase tracking-widest leading-loose">
                                    Our servers are orchestrating millions of parameters to visualize your sound. Please remain connected.
                                </div>
                            </div>
                        )}

                        {gameState === 'finished' && generatedVideoUrl && (
                            <div className="animate-fade-in-up">
                                <video src={generatedVideoUrl} controls autoPlay className="w-full aspect-video border border-white/10 shadow-2xl mb-8" />
                                <div className="flex justify-between items-center">
                                    <div className="text-[10px] text-slate-500 font-mono uppercase">Render Complete ● VEO 3.1 PRO</div>
                                    <a 
                                        href={generatedVideoUrl} 
                                        download={`WILLWI_VISION_${selectedSong.title}.mp4`}
                                        className="text-[10px] font-black text-brand-accent border border-brand-accent/30 px-6 py-2 hover:bg-brand-accent hover:text-black transition-all uppercase tracking-widest"
                                    >
                                        Download Master
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default Interactive;
