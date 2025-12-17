
import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import PaymentModal from '../components/PaymentModal';
import { useTranslation } from '../context/LanguageContext';

type InteractionMode = 'menu' | 'lyric-maker' | 'ai-video';
type GameState = 'select' | 'ready' | 'standby' | 'playing' | 'processing' | 'finished';

const LoginModal = ({ onClose, onLogin }: { onClose: () => void, onLogin: (name: string, email: string) => void }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative z-10 max-w-md w-full bg-[#0f172a] border border-white/10 rounded-[40px] p-10 shadow-2xl">
                <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest text-center">Studio Login</h2>
                <div className="space-y-4">
                    <input className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-white text-center outline-none focus:border-brand-accent" placeholder="您的姓名" value={name} onChange={e => setName(e.target.value)} />
                    <input className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-white text-center outline-none focus:border-brand-accent" placeholder="電子信箱" value={email} onChange={e => setEmail(e.target.value)} />
                    <button onClick={() => onLogin(name, email)} className="w-full py-4 bg-white text-black font-black rounded-full uppercase tracking-widest hover:bg-brand-accent transition-colors">Start Creating</button>
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
  const [searchTerm, setSearchTerm] = useState('');
  
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
    if (!song.lyrics) { alert("此歌曲無歌詞。"); return; }
    lyricsArrayRef.current = ["(Intro)", ...song.lyrics.split('\n').filter(l => l.trim()), "END"]; 
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
      } catch (e) { console.warn("Audio capture restricted", e); }

      try {
        const options = { mimeType: 'video/webm;codecs=vp8' }; // Use VP8 for widest compatibility
        const recorder = new MediaRecorder(stream, options);
        recorder.ondataavailable = e => e.data.size > 0 && recordedChunksRef.current.push(e.data);
        recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Willwi_Lyrics_${selectedSong?.title}.webm`;
            a.click();
            setGameState('finished');
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        audioRef.current?.play();
        setGameState('playing');
        requestAnimationFrame(loop);
      } catch (e) { alert("錄製引擎啟動失敗，請更換瀏覽器試試。"); setGameState('ready'); }
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
          ctx.filter = 'blur(120px) opacity(0.5)';
          ctx.drawImage(coverImageRef.current, -w*0.1, -h*0.1, w*1.2, h*1.2);
          ctx.restore();
          
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 60;
          ctx.drawImage(coverImageRef.current, w*0.6, h*0.2, 500, 500);
          ctx.restore();
      }

      ctx.fillStyle = 'white';
      ctx.font = '900 64px Montserrat';
      ctx.fillText(selectedSong.title, 120, h - 220);
      ctx.font = '400 32px Montserrat';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText("Official Lyric Video", 120, h - 160);

      const currentLyric = lyricsArrayRef.current[lineIndex];
      ctx.fillStyle = 'white';
      ctx.font = '900 84px Montserrat';
      ctx.textAlign = 'left';
      ctx.fillText(currentLyric || "", 120, h/2);
  };

  const handleNext = () => {
      if (lineIndex < lyricsArrayRef.current.length - 1) {
          setLineIndex(prev => prev + 1);
          if (lyricsArrayRef.current[lineIndex+1] === "END") {
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

  if (mode === 'menu') {
      return (
        <div className="max-w-6xl mx-auto pt-24 px-6 pb-20">
             {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={handleLoginSubmit} />}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <button onClick={() => handleToolClick('lyric-maker')} className="h-80 bg-slate-900 border border-white/10 rounded-[40px] p-10 text-left hover:border-brand-accent transition-all group overflow-hidden shadow-2xl">
                     <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">🎬</div>
                     <h3 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">手工動態歌詞</h3>
                     <p className="text-slate-500 text-sm">跟隨節奏親手對時。費用為每首 320 元。</p>
                 </button>
                 <div className="h-80 bg-slate-950 border border-white/5 rounded-[40px] p-10 flex flex-col items-center justify-center text-center opacity-40 cursor-not-allowed">
                     <div className="text-4xl mb-4 grayscale">🤖</div>
                     <h3 className="text-xl font-bold text-white mb-2">AI 視覺導演</h3>
                     <p className="text-slate-600 text-xs">水還沒開，請稍候。</p>
                 </div>
             </div>
        </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto pt-10 px-6 pb-20">
        {showPaymentModal && <PaymentModal isOpen={true} onClose={() => setShowPaymentModal(false)} />}
        {gameState === 'select' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {songs.map(s => (
                    <div key={s.id} onClick={() => handleSelectSong(s)} className="bg-slate-900 rounded-[30px] p-4 border border-white/5 cursor-pointer hover:border-brand-accent transition-all">
                        <img src={s.coverUrl} className="w-full aspect-square rounded-[20px] mb-4 object-cover" alt="cover" />
                        <h4 className="font-bold text-white px-2">{s.title}</h4>
                    </div>
                ))}
            </div>
        )}
        {selectedSong && gameState !== 'select' && (
            <div className="flex flex-col items-center">
                <div className="mb-10 text-center">
                    {gameState === 'ready' && <button onClick={enterStandby} className="px-12 py-4 bg-white text-slate-950 font-black rounded-full uppercase tracking-widest shadow-2xl hover:bg-brand-accent transition-colors">Enter Studio</button>}
                    {gameState === 'standby' && <div className="text-white font-black animate-pulse text-2xl cursor-pointer" onClick={startRecording}>[ 按下空白鍵或點擊此處開始 ]</div>}
                    {gameState === 'playing' && <div className="text-red-500 font-black animate-pulse uppercase tracking-[0.3em]" onClick={handleNext}>● RECORDING... </div>}
                </div>
                <div className="relative rounded-[40px] overflow-hidden border-[12px] border-slate-900 shadow-2xl">
                    <canvas ref={canvasRef} width={1920} height={1080} className="w-full max-w-4xl bg-black cursor-pointer" onClick={() => (gameState === 'playing' ? handleNext() : gameState === 'standby' ? startRecording() : null)} />
                </div>
                {selectedSong.audioUrl && <audio ref={audioRef} src={selectedSong.audioUrl} crossOrigin="anonymous" className="hidden" />}
            </div>
        )}
    </div>
  );
};

export default Interactive;
