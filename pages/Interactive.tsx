import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import PaymentModal from '../components/PaymentModal';
import { useTranslation } from '../context/LanguageContext';

type InteractionMode = 'menu' | 'lyric-maker';
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
  const [lineIndex, setLineIndex] = useState(0); 
  
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
      if (!user) { setShowLoginModal(true); return; }
      setMode(targetMode);
  };

  const handleSelectSong = (song: Song) => {
    if (!song.lyrics) { alert("Data Incomplete: No Lyrics Found."); return; }
    lyricsArrayRef.current = ["(Ready)", ...song.lyrics.split('\n').filter(l => l.trim()), "TERMINATE"]; 
    setSelectedSong(song);
    setGameState('ready');
  };

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
      const canvasStream = canvasRef.current.captureStream(30);
      let stream = canvasStream;
      try {
          if (audioRef.current) {
               // @ts-ignore
               const audioStream = audioRef.current.captureStream?.() || audioRef.current.mozCaptureStream?.();
               if (audioStream) stream = new MediaStream([...canvasStream.getTracks(), ...audioStream.getAudioTracks()]);
          }
      } catch (e) { console.warn("Audio node restricted", e); }

      try {
        const options = { mimeType: 'video/webm;codecs=vp8' };
        const recorder = new MediaRecorder(stream, options);
        recorder.ondataavailable = e => e.data.size > 0 && recordedChunksRef.current.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `WILLWI_LYRIC_ARCHIVE_${selectedSong?.title}.webm`;
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
      
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      if (coverImageRef.current) {
          ctx.save();
          ctx.filter = 'blur(100px) opacity(0.3)';
          ctx.drawImage(coverImageRef.current, -w*0.1, -h*0.1, w*1.2, h*1.2);
          ctx.restore();
          
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 40;
          ctx.drawImage(coverImageRef.current, w*0.6, h*0.2, 550, 550);
          ctx.restore();
      }

      ctx.fillStyle = 'white';
      ctx.font = '900 64px Montserrat';
      ctx.fillText(selectedSong.title, 120, h - 220);
      ctx.font = '700 24px Montserrat';
      ctx.fillStyle = '#fbbf24';
      ctx.fillText("WILLWI MUSIC ARCHIVE", 120, h - 165);

      const currentLyric = lyricsArrayRef.current[lineIndex];
      ctx.fillStyle = 'white';
      ctx.font = '900 80px Montserrat';
      ctx.textAlign = 'left';
      ctx.fillText(currentLyric || "", 120, h/2);
  };

  const handleNext = () => {
      if (lineIndex < lyricsArrayRef.current.length - 1) {
          setLineIndex(prev => prev + 1);
          if (lyricsArrayRef.current[lineIndex+1] === "TERMINATE") {
            setTimeout(finish, 1500);
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
                 <div className="h-96 bg-slate-950 border border-white/5 p-12 flex flex-col items-center justify-center text-center opacity-20 cursor-not-allowed">
                     <div className="text-[10px] text-slate-500 font-bold tracking-[0.5em] uppercase mb-4">Module 02</div>
                     <h3 className="text-xl font-bold text-slate-400 mb-2 uppercase tracking-widest">AI Vision Director</h3>
                     <p className="text-slate-600 text-[10px] uppercase tracking-widest">Awaiting system update.</p>
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto pt-10 px-6 pb-20">
        {showPaymentModal && <PaymentModal isOpen={true} onClose={() => setShowPaymentModal(false)} />}
        {gameState === 'select' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {songs.map(s => (
                    <div key={s.id} onClick={() => handleSelectSong(s)} className="bg-slate-900 p-4 border border-white/5 cursor-pointer hover:border-brand-accent transition-all">
                        <img src={s.coverUrl} className="w-full aspect-square mb-4 object-cover" alt="cover" />
                        <h4 className="font-bold text-white text-[11px] uppercase tracking-widest px-2">{s.title}</h4>
                    </div>
                ))}
            </div>
        )}
        {selectedSong && gameState !== 'select' && (
            <div className="flex flex-col items-center">
                <div className="mb-12 text-center">
                    {gameState === 'ready' && <button onClick={enterStandby} className="px-12 py-5 border border-white/20 text-white font-black uppercase tracking-[0.4em] text-[10px] hover:bg-white hover:text-black transition-all">Initialize Studio</button>}
                    {gameState === 'standby' && <div className="text-white font-black animate-pulse text-xs tracking-[0.5em] cursor-pointer" onClick={startRecording}>[ PRESS SPACE OR CLICK TO START CAPTURE ]</div>}
                    {gameState === 'playing' && <div className="text-red-500 font-black animate-pulse uppercase tracking-[0.5em] text-xs" onClick={handleNext}>● CAPTURING STREAM</div>}
                </div>
                <div className="relative overflow-hidden border border-white/10 shadow-2xl bg-black">
                    <canvas ref={canvasRef} width={1920} height={1080} className="w-full max-w-4xl cursor-none" onClick={() => (gameState === 'playing' ? handleNext() : gameState === 'standby' ? startRecording() : null)} />
                </div>
                {selectedSong.audioUrl && <audio ref={audioRef} src={selectedSong.audioUrl} crossOrigin="anonymous" className="hidden" />}
            </div>
        )}
    </div>
  );
};

export default Interactive;
