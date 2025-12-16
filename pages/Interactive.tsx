import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import PaymentModal from '../components/PaymentModal';
import { useTranslation } from '../context/LanguageContext';

// --- TYPES ---
type InteractionMode = 'menu' | 'lyric-maker' | 'ai-video' | 'voting';
type GameState = 'select' | 'ready' | 'playing' | 'processing' | 'finished';

// Helper to extract YouTube ID
const getYoutubeEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
        let videoId = '';
        if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/watch')) {
            const urlParams = new URLSearchParams(new URL(url).search);
            videoId = urlParams.get('v') || '';
        } else if (url.includes('youtube.com/embed/')) {
             videoId = url.split('embed/')[1];
        }
        return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1` : null;
    } catch(e) { return null; }
};

const Interactive: React.FC = () => {
  const { user, login, deductCredit, isAdmin } = useUser();
  const { songs } = useData();
  const { t } = useTranslation();
  
  // UI State
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Login Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');

  // --- VOTING EVENT STATE ---
  const [votes, setVotes] = useState<string[]>([]);
  const [previewSong, setPreviewSong] = useState<Song | null>(null); 
  const MAX_VOTES = 10;

  // --- LYRIC MAKER STATE (VIDEO ENGINE) ---
  const [gameState, setGameState] = useState<GameState>('select');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [lineIndex, setLineIndex] = useState(0); // Index of the line currently "Active" (Center)
  const [searchTerm, setSearchTerm] = useState('');
  
  // Refs for Engine
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const coverImageRef = useRef<HTMLImageElement | null>(null);
  const lyricsArrayRef = useRef<string[]>([]);

  // --- HANDLERS ---

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if(loginEmail.trim() && loginName.trim()) {
          login(loginName, loginEmail);
          setShowLoginModal(false);
      }
  };

  const handleToolClick = (targetMode: InteractionMode) => {
      if (!user) {
          setShowLoginModal(true);
          return;
      }
      setMode(targetMode);
  };

  // --- LYRIC VIDEO ENGINE ---

  // Preload Image to avoid flickering
  useEffect(() => {
      if (selectedSong && selectedSong.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous"; // Vital for canvas export
          img.src = selectedSong.coverUrl;
          img.onload = () => {
              coverImageRef.current = img;
              // Initial Draw
              drawFrame(); 
          };
      }
  }, [selectedSong]);

  const handleSelectSong = (song: Song) => {
    if (!song.lyrics) {
        alert("這首歌暫時沒有歌詞資料，請先至資料庫新增歌詞。");
        return;
    }
    
    // Parse Lyrics
    const rawLines = song.lyrics.split('\n').map(l => l.trim()).filter(l => l !== '');
    // Add buffer lines for visual scrolling
    lyricsArrayRef.current = ["", ...rawLines, "END"]; 
    
    setSelectedSong(song);
    setGameState('ready');
    setLineIndex(0); // Start at 0 (which is empty buffer), first press moves to 1 (first line)
  };

  const startGame = () => {
    if (!selectedSong || !canvasRef.current) return;

    // 1. Check Credits
    if (!deductCredit()) {
        setShowPaymentModal(true);
        return;
    }

    setGameState('playing');
    setLineIndex(0); // Reset
    recordedChunksRef.current = [];

    // 2. Setup Recording Stream
    const canvasStream = canvasRef.current.captureStream(30); // 30 FPS
    
    // Attempt to capture audio (Might fail if CORS, but visuals will work)
    let finalStream = canvasStream;
    try {
        if (audioRef.current) {
            // Note: captureStream on audio elements is experimental and has CORS restrictions.
            // If the audio source is cross-origin (like Google Drive without correct headers), this might be silent.
            // We proceed anyway; user can dub audio in post if needed, but visuals are key.
            const audioEl = audioRef.current as any;
            if (audioEl.captureStream) {
                 const audioStream = audioEl.captureStream();
                 finalStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
            } else if (audioEl.mozCaptureStream) { // Firefox
                 const audioStream = audioEl.mozCaptureStream();
                 finalStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
            }
        }
    } catch (e) {
        console.warn("Audio capture failed (likely CORS), recording video only.", e);
    }

    // 3. Initialize Recorder
    try {
        const recorder = new MediaRecorder(finalStream, {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=h264') 
                ? 'video/webm;codecs=h264' 
                : 'video/webm'
        });
        
        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
    } catch (e) {
        console.error("Recorder init failed", e);
        alert("瀏覽器不支援錄影功能，請嘗試使用 Chrome 或 Edge。");
        return;
    }

    // 4. Start Audio & Loop
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Play error", e));
    }
    
    // Advance to first real line immediately? No, wait for user or start at buffer.
    // Let's Start at index 0 (Buffer). User presses space -> Index 1 (First Line).
    
    const loop = () => {
      drawFrame();
      if (gameState === 'playing' || gameState === 'processing') {
          animationFrameRef.current = requestAnimationFrame(loop);
      }
    };
    loop();
  };

  const drawFrame = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;

      const w = canvas.width;
      const h = canvas.height;
      const lines = lyricsArrayRef.current;

      // --- 1. BACKGROUND ---
      // Clear
      ctx.fillStyle = '#020617'; // Slate 950
      ctx.fillRect(0, 0, w, h);

      if (coverImageRef.current) {
          ctx.save();
          // Draw scaled up background
          ctx.filter = 'blur(40px) brightness(0.4)';
          ctx.drawImage(coverImageRef.current, -100, -100, w + 200, h + 200);
          ctx.restore();
      }

      // --- 2. LAYOUT CALCULATIONS ---
      // We assume 1920x1080 canvas
      
      // Cover Art Position (Left Side or Center? Request said "Front is 1:1 cover... Lyrics below")
      // Let's create a nice composed layout.
      // Cover Size: 600x600
      const coverSize = 600;
      const centerX = w / 2;
      const coverY = 150; // Top margin

      // --- 3. DRAW ALBUM ART ---
      if (coverImageRef.current) {
          ctx.save();
          // Shadow
          ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
          ctx.shadowBlur = 40;
          ctx.shadowOffsetY = 20;
          
          // Draw Cover Centered
          const x = (w - coverSize) / 2;
          ctx.drawImage(coverImageRef.current, x, coverY, coverSize, coverSize);
          
          // Border
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, coverY, coverSize, coverSize);
          ctx.restore();
      }

      // --- 4. DRAW METADATA (Below Cover) ---
      ctx.textAlign = 'center';
      
      // Song Title
      ctx.font = '900 48px Montserrat, sans-serif'; // Bold Title
      ctx.fillStyle = '#ffffff';
      ctx.fillText(selectedSong.title, centerX, coverY + coverSize + 80);

      // Artist Name
      ctx.font = '500 24px Montserrat, sans-serif';
      ctx.fillStyle = '#38bdf8'; // Brand Accent
      ctx.fillText("Willwi", centerX, coverY + coverSize + 130);


      // --- 5. DRAW LYRICS (Rolling 3 Lines) ---
      // Defined area below text
      const lyricBaseY = coverY + coverSize + 220;
      const lineHeight = 60;

      // Index Logic:
      // lineIndex is the "Current" line.
      // We need to show lineIndex-1 (Prev), lineIndex (Current), lineIndex+1 (Next)
      
      // Line 1: Previous (Top)
      if (lines[lineIndex - 1] !== undefined) {
          ctx.font = '300 24px Montserrat, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillText(lines[lineIndex - 1], centerX, lyricBaseY - lineHeight);
      }

      // Line 2: Current (Center) - The Focus
      if (lines[lineIndex] !== undefined) {
          ctx.font = '700 36px Montserrat, sans-serif';
          ctx.fillStyle = '#ffffff';
          // Glow effect for current line
          ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
          ctx.shadowBlur = 15;
          ctx.fillText(lines[lineIndex], centerX, lyricBaseY);
          ctx.shadowBlur = 0; // Reset
      }

      // Line 3: Next (Bottom)
      if (lines[lineIndex + 1] !== undefined) {
          ctx.font = '300 24px Montserrat, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.fillText(lines[lineIndex + 1], centerX, lyricBaseY + lineHeight);
      }
      
      // Draw "END" marker specific logic
      if (lines[lineIndex] === "END") {
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 20px Montserrat';
          ctx.fillText("--- FINISHED ---", centerX, lyricBaseY + 50);
      }
  };

  const handleNextLine = () => {
      if (gameState !== 'playing') return;
      
      const lines = lyricsArrayRef.current;
      
      if (lineIndex < lines.length - 1) {
          setLineIndex(prev => prev + 1);
          
          // Check if we hit END
          if (lines[lineIndex + 1] === "END") {
             // We just moved TO the end. Give it a moment then finish.
             setTimeout(finishGame, 2000);
          }
      } else {
          finishGame();
      }
  };

  const finishGame = () => {
    setGameState('processing');
    
    // Stop Audio
    if (audioRef.current) audioRef.current.pause();

    // Stop Recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        // Wait a bit for onstop/dataavailable
        setTimeout(saveVideo, 500);
    } else {
        saveVideo();
    }
  };

  const saveVideo = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      document.body.appendChild(a);
      a.style.display = 'none';
      a.href = url;
      // Although it's likely WebM, we can name it mp4. 
      // Most players (VLC, etc) handle container mismatches, or user can convert.
      a.download = `Willwi_${selectedSong?.title}_LyricVideo.webm`; 
      a.click();
      window.URL.revokeObjectURL(url);
      
      setGameState('finished');
  };

  const resetGame = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    setGameState('select');
    setSelectedSong(null);
    setLineIndex(0);
    recordedChunksRef.current = [];
  };

  // Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && gameState === 'playing' && mode === 'lyric-maker') {
        e.preventDefault();
        handleNextLine();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, lineIndex, mode]);


  // --- SUB-COMPONENTS ---
  const LoginModal = () => (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
          <div className="relative z-10 max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl overflow-hidden animate-fade-in-up">
                 <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                 <div className="text-center">
                     <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-6 text-3xl">✨</div>
                     <h2 className="text-2xl font-bold text-white mb-2">Interactive Studio</h2>
                     <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                        登入以使用工作室功能。<br/>
                        <span className="text-brand-gold">新用戶即可獲得 1 次免費製作額度。</span>
                     </p>
                     <form onSubmit={handleLogin} className="space-y-4">
                         <input 
                            type="text" 
                            required 
                            placeholder="您的姓名 / 暱稱" 
                            className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center focus:border-brand-accent outline-none transition-colors" 
                            value={loginName} 
                            onChange={(e) => setLoginName(e.target.value)} 
                         />
                         <input 
                            type="email" 
                            required 
                            placeholder="您的電子信箱" 
                            className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center focus:border-brand-accent outline-none transition-colors" 
                            value={loginEmail} 
                            onChange={(e) => setLoginEmail(e.target.value)} 
                         />
                         <button 
                            type="submit" 
                            className="w-full py-3 bg-white hover:bg-slate-200 text-slate-900 font-bold rounded-lg uppercase tracking-widest text-sm transition-colors shadow-lg"
                         >
                            開始體驗
                         </button>
                     </form>
                 </div>
             </div>
      </div>
  );

  // --- RENDER MAIN ---

  if (mode === 'menu') {
      return (
        <div className="max-w-6xl mx-auto pt-16 px-6 animate-fade-in pb-20">
             {showPaymentModal && <PaymentModal isOpen={true} onClose={() => setShowPaymentModal(false)} />}
             {showLoginModal && <LoginModal />}
             
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                 <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Interactive Studio</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        {user ? `Hello, ${user.name}.` : 'Welcome Guest.'}
                    </p>
                 </div>
                 
                 <div className="flex items-center gap-4">
                     <button 
                        onClick={() => setShowPaymentModal(true)}
                        className="flex items-center gap-2 px-5 py-2 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 hover:bg-yellow-500 hover:text-slate-900 font-bold text-sm transition-all shadow-lg hover:shadow-yellow-500/20"
                     >
                         <span>❤️</span>
                         <span>支持 Willwi (Support)</span>
                     </button>
                     <div className="text-right">
                        {user ? (
                            <>
                                <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Your Credits</div>
                                <div className="text-2xl font-bold text-brand-gold">{user.credits} <span className="text-sm text-slate-500 font-normal">pts</span></div>
                            </>
                        ) : (
                            <button 
                                onClick={() => setShowLoginModal(true)}
                                className="text-xs border border-white/30 hover:border-white text-white px-3 py-1 rounded-full transition-colors uppercase tracking-widest"
                            >
                                Login
                            </button>
                        )}
                     </div>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* LYRIC MAKER CARD */}
                 <button 
                    onClick={() => handleToolClick('lyric-maker')}
                    className="group relative bg-slate-900 border border-slate-800 hover:border-brand-accent rounded-2xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] overflow-hidden md:col-span-2 lg:col-span-3"
                 >
                     <div className="relative z-10">
                         <span className="inline-block px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold mb-4">VIDEO MAKER</span>
                         <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-brand-accent transition-colors">手工動態歌詞 (Hand-made Lyric Video)</h3>
                         <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            親手敲擊節奏，錄製屬於你的動態歌詞影片。<br/>
                            1st Free, then NT$80/song.
                         </p>
                         <div className="flex items-center gap-2 text-sm text-white font-bold group-hover:translate-x-2 transition-transform">
                             Enter Studio <span>→</span>
                         </div>
                     </div>
                 </button>
             </div>
        </div>
      );
  }

  // --- LYRIC MAKER STUDIO RENDER ---
  if (mode === 'lyric-maker') {
      return (
        <div className="max-w-7xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
            <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
            
            {/* HIDDEN AUDIO ELEMENT FOR PLAYBACK */}
            {selectedSong?.audioUrl && (
                <audio 
                    ref={audioRef}
                    src={selectedSong.audioUrl}
                    crossOrigin="anonymous"
                    onEnded={finishGame}
                    className="hidden"
                />
            )}

            <div className="flex justify-between items-center mb-6">
                <button 
                    onClick={() => { resetGame(); setMode('menu'); }}
                    className="text-slate-500 hover:text-white text-sm flex items-center gap-2 transition-colors"
                >
                    ← Back to Menu
                </button>
                {gameState !== 'select' && (
                    <button onClick={resetGame} className="text-red-400 hover:text-red-300 text-sm border border-red-900/50 px-3 py-1 rounded">
                        放棄 / 重選 (Quit)
                    </button>
                )}
            </div>

            {/* STEP 1: SELECT SONG */}
            {gameState === 'select' && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Select a Track to Record</h2>
                    <div className="relative mb-6">
                        <input 
                            type="text" 
                            placeholder="Search database..." 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-brand-accent outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {songs.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase()) && s.lyrics).map(song => (
                            <div 
                                key={song.id}
                                onClick={() => handleSelectSong(song)}
                                className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 hover:border-brand-accent rounded-xl cursor-pointer transition-all hover:bg-slate-800"
                            >
                                <img src={song.coverUrl} className="w-16 h-16 rounded object-cover" alt={song.title} />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white truncate">{song.title}</h4>
                                    <p className="text-xs text-slate-400">{song.language}</p>
                                </div>
                                <button className="px-4 py-2 bg-brand-accent/10 text-brand-accent rounded text-xs font-bold uppercase">Record</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2: STUDIO (CANVAS) */}
            {(gameState === 'ready' || gameState === 'playing' || gameState === 'processing' || gameState === 'finished') && selectedSong && (
                <div className="flex flex-col items-center">
                    
                    {/* INSTRUCTIONS */}
                    <div className="mb-4 text-center">
                        {gameState === 'ready' && (
                            <div className="animate-fade-in-up">
                                <h3 className="text-xl font-bold text-white mb-2">準備錄製</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    按下 <span className="text-brand-accent font-bold">START</span> 後音樂將開始播放並自動錄影。<br/>
                                    請跟著節奏，每唱一句按一下 <span className="border border-white/20 px-1 rounded text-xs">SPACE</span> 空白鍵。
                                </p>
                                <button 
                                    onClick={startGame}
                                    className="px-8 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse"
                                >
                                    ● START RECORDING
                                </button>
                            </div>
                        )}
                        {gameState === 'playing' && (
                            <div className="text-brand-accent font-mono text-sm animate-pulse">
                                ● REC | Press SPACE for next line...
                            </div>
                        )}
                        {gameState === 'processing' && (
                            <div className="text-yellow-400 font-bold animate-bounce">
                                正在匯出影片，請稍候... (Exporting Video...)
                            </div>
                        )}
                        {gameState === 'finished' && (
                            <div className="text-green-400 font-bold">
                                影片已下載！(Video Downloaded)
                            </div>
                        )}
                    </div>

                    {/* CANVAS VIEWPORT */}
                    <div className="relative border-[4px] border-slate-800 rounded-lg shadow-2xl bg-black overflow-hidden">
                        {/* 1920x1080 scaled down via CSS */}
                        <canvas 
                            ref={canvasRef}
                            width={1920} 
                            height={1080}
                            className="w-full max-w-4xl h-auto block bg-black"
                            style={{ aspectRatio: '16/9' }}
                        />
                        
                        {/* Overlay Controls for Mobile (if needed, simplified) */}
                        {gameState === 'playing' && (
                            <div 
                                className="absolute inset-0 z-10 cursor-pointer" 
                                onClick={(e) => { e.preventDefault(); handleNextLine(); }}
                                onTouchStart={(e) => { e.preventDefault(); handleNextLine(); }}
                            >
                                {/* Invisible touch layer for mobile sync */}
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 text-xs text-slate-500">
                        Canvas Rendering Resolution: 1920x1080 (HD)
                    </div>
                </div>
            )}
        </div>
      );
  }

  return null;
};

export default Interactive;