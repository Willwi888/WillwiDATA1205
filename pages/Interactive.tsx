import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import PaymentModal from '../components/PaymentModal';
import { useTranslation } from '../context/LanguageContext';

// --- HELPERS ---
const cleanGoogleRedirect = (url: string) => {
    if (!url) return '';
    try {
        if (url.includes('google.com/url')) {
            const urlObj = new URL(url);
            const q = urlObj.searchParams.get('q');
            if (q) return decodeURIComponent(q);
        }
        return url;
    } catch (e) {
        return url;
    }
};

// --- TYPES ---
type InteractionMode = 'menu' | 'lyric-maker' | 'ai-video' | 'voting';
type GameState = 'select' | 'ready' | 'standby' | 'playing' | 'processing' | 'finished';

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

  // --- LYRIC MAKER STATE (VIDEO ENGINE) ---
  const [gameState, setGameState] = useState<GameState>('select');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [lineIndex, setLineIndex] = useState(0); 
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

  // Preload Image with Robust Handling
  useEffect(() => {
      // Reset previous image
      coverImageRef.current = null;

      if (selectedSong && selectedSong.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous"; // Essential for canvas export
          
          // Clean URL to handle redirects that might block CORS
          const safeUrl = cleanGoogleRedirect(selectedSong.coverUrl);
          img.src = safeUrl;
          
          img.onload = () => {
              coverImageRef.current = img;
              drawFrame(); // Draw preview immediately upon load
          };

          img.onerror = (e) => {
              console.warn("Cover image failed to load (CORS or Invalid URL)", e);
              // We can still draw the frame without the image (just background)
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
    // Buffer for Intro
    lyricsArrayRef.current = ["(Intro)", ...rawLines, "END"]; 
    
    setSelectedSong(song);
    setGameState('ready');
    setLineIndex(0); 
  };

  // Step 1: Check Credits & Enter Standby
  const enterStandby = () => {
      if (!selectedSong) return;

      // Admin Bypass: If admin, skip credit check
      if (!isAdmin) {
          if (!deductCredit()) {
              setShowPaymentModal(true);
              return;
          }
      }

      setGameState('standby');
      setLineIndex(0);
      recordedChunksRef.current = [];
      
      // Initial Draw for Standby Screen
      setTimeout(() => drawFrame(), 100);
  };

  // Step 2: Actually Start Recording & Music (Triggered by Tap/Space)
  const startRecordingAndMusic = () => {
      if (!canvasRef.current) return;

      // Setup Stream
      const canvasStream = canvasRef.current.captureStream(30); // 30 FPS
      let finalStream = canvasStream;
      
      try {
          if (audioRef.current) {
               // Cast to any to access experimental methods like captureStream/mozCaptureStream
               const audioEl = audioRef.current as any;
               let audioStream;
               
               // Try standard, then vendor prefixed
               if (audioEl.captureStream) {
                   audioStream = audioEl.captureStream();
               } else if (audioEl.mozCaptureStream) {
                   audioStream = audioEl.mozCaptureStream();
               }
               
               if (audioStream) {
                   finalStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
               }
          }
      } catch (e) {
          console.warn("Audio capture CORS issue (Expected for external audio sources)", e);
          // Fallback: Record Video Only (User can add audio later)
      }

      // Init Recorder
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
          console.error("Recorder Error:", e);
          alert("此瀏覽器不支援錄影功能，請嘗試使用 Chrome 或 Edge (Desktop).");
          return;
      }

      // Play Audio
      if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error("Play error", e));
      }

      setGameState('playing');

      // Start Loop
      const loop = () => {
        drawFrame();
        if (gameState === 'playing' || gameState === 'standby' || gameState === 'processing') {
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

      // --- 1. BACKGROUND (Blurred) ---
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      if (coverImageRef.current) {
          try {
              ctx.save();
              // Draw scaled up background with blur
              ctx.filter = 'blur(50px) brightness(0.4)';
              // Scale to cover completely
              ctx.drawImage(coverImageRef.current, -200, -200, w + 400, h + 400);
              ctx.restore();
          } catch (e) {
              // Ignore drawing errors (e.g. if image is broken)
          }
      }

      // --- 2. LAYOUT CONSTANTS ---
      // Vertical Layout
      const centerX = w / 2;
      
      // Cover Art
      const coverSize = 500;
      const coverY = 80;

      // Text Info
      const titleY = coverY + coverSize + 80;
      const artistY = titleY + 50;

      // Lyric Area (Bottom Third)
      const lyricCurrentY = 900;
      const lyricPrevY = 820;
      const lyricNextY = 980;

      // --- 3. DRAW ALBUM ART (Top Center) ---
      if (coverImageRef.current) {
          try {
              ctx.save();
              ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
              ctx.shadowBlur = 50;
              ctx.shadowOffsetY = 30;
              
              const x = (w - coverSize) / 2;
              ctx.drawImage(coverImageRef.current, x, coverY, coverSize, coverSize);
              
              // Border
              ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
              ctx.lineWidth = 3;
              ctx.strokeRect(x, coverY, coverSize, coverSize);
              ctx.restore();
          } catch(e) {}
      } else {
          // Placeholder if no image
          ctx.save();
          ctx.fillStyle = '#1e293b';
          const x = (w - coverSize) / 2;
          ctx.fillRect(x, coverY, coverSize, coverSize);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
          ctx.strokeRect(x, coverY, coverSize, coverSize);
          
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 40px Montserrat';
          ctx.fillText("NO COVER", centerX, coverY + coverSize/2);
          ctx.restore();
      }

      // --- 4. DRAW INFO ---
      ctx.textAlign = 'center';
      
      // Song Title
      ctx.font = '900 60px Montserrat, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 10;
      ctx.fillText(selectedSong.title, centerX, titleY);
      ctx.shadowBlur = 0;

      // Artist Name
      ctx.font = '500 36px Montserrat, sans-serif';
      ctx.fillStyle = '#38bdf8'; // Brand Accent
      ctx.fillText("Willwi", centerX, artistY);

      // --- 5. DRAW LYRICS (3 Lines Rolling) ---
      
      if (gameState === 'standby') {
          // Standby Message
          ctx.font = '700 48px Montserrat';
          ctx.fillStyle = '#fbbf24'; // Gold
          ctx.shadowColor = "rgba(251, 191, 36, 0.5)";
          ctx.shadowBlur = 20;
          ctx.fillText("PRESS SPACE TO START", centerX, lyricCurrentY);
          ctx.shadowBlur = 0;
          return;
      }

      // Previous Line (Top, Faded)
      if (lines[lineIndex - 1] !== undefined) {
          ctx.font = '500 32px Montserrat, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillText(lines[lineIndex - 1], centerX, lyricPrevY);
      }

      // Current Line (Center, Highlighted)
      if (lines[lineIndex] !== undefined) {
          ctx.font = '900 52px Montserrat, sans-serif';
          ctx.fillStyle = '#ffffff';
          // Glow
          ctx.shadowColor = "rgba(56, 189, 248, 0.9)";
          ctx.shadowBlur = 20;
          ctx.fillText(lines[lineIndex], centerX, lyricCurrentY);
          ctx.shadowBlur = 0;
      }

      // Next Line (Bottom, Faded)
      if (lines[lineIndex + 1] !== undefined) {
          ctx.font = '500 32px Montserrat, sans-serif';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillText(lines[lineIndex + 1], centerX, lyricNextY);
      }
      
      // END Marker
      if (lines[lineIndex] === "END") {
           ctx.fillStyle = '#fbbf24';
           ctx.font = 'bold 30px Montserrat';
           ctx.fillText("--- FINISHED ---", centerX, lyricCurrentY + 80);
      }
  };

  // Main Interaction Handler (Tap / Space)
  const handleInteraction = () => {
      if (gameState === 'standby') {
          // First Tap: Start
          startRecordingAndMusic();
      } else if (gameState === 'playing') {
          // Subsequent Taps: Next Line
          handleNextLine();
      }
  };

  const handleNextLine = () => {
      const lines = lyricsArrayRef.current;
      if (lineIndex < lines.length - 1) {
          setLineIndex(prev => prev + 1);
          // Check Auto-Finish
          if (lines[lineIndex + 1] === "END") {
             setTimeout(finishGame, 2000);
          }
      } else {
          finishGame();
      }
  };

  const finishGame = () => {
    setGameState('processing');
    if (audioRef.current) audioRef.current.pause();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        setTimeout(saveVideo, 600);
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
      // Use .mp4 extension for better compatibility perception
      a.download = `Willwi_${selectedSong?.title}_LyricVideo.mp4`; 
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
      if ((e.code === 'Space' || e.code === 'Enter') && mode === 'lyric-maker') {
        if (gameState === 'standby' || gameState === 'playing') {
            e.preventDefault();
            handleInteraction();
        }
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
            
            {/* HIDDEN AUDIO ELEMENT */}
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
            {(gameState === 'ready' || gameState === 'standby' || gameState === 'playing' || gameState === 'processing' || gameState === 'finished') && selectedSong && (
                <div className="flex flex-col items-center">
                    
                    {/* INSTRUCTIONS */}
                    <div className="mb-4 text-center">
                        {gameState === 'ready' && (
                            <div className="animate-fade-in-up">
                                <h3 className="text-xl font-bold text-white mb-2">準備錄製</h3>
                                <p className="text-slate-400 text-sm mb-4">
                                    1. 按下 <span className="text-red-500 font-bold">● REC</span> 進入待機狀態。<br/>
                                    2. 準備好後，按下 <span className="border border-white/20 px-1 rounded text-xs">空白鍵</span> 開始播放並同步錄影。<br/>
                                    3. 跟著節奏，每唱一句按一下空白鍵。
                                </p>
                                <button 
                                    onClick={enterStandby}
                                    className="px-8 py-3 bg-red-600 text-white font-bold rounded-full hover:bg-red-500 shadow-[0_0_20px_rgba(220,38,38,0.5)]"
                                >
                                    ● ENTER STUDIO
                                </button>
                                {isAdmin && <p className="text-[10px] text-green-500 mt-2 font-mono">Admin Mode: Unlimited Access Enabled</p>}
                            </div>
                        )}
                        {gameState === 'standby' && (
                            <div className="text-brand-gold font-bold text-lg animate-pulse">
                                WAITING... Press [SPACE] to Start Music
                            </div>
                        )}
                        {gameState === 'playing' && (
                            <div className="text-brand-accent font-mono text-sm animate-pulse">
                                ● RECORDING | Press SPACE for next line...
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
                    <div className="relative border-[4px] border-slate-800 rounded-lg shadow-2xl bg-black overflow-hidden group">
                        {/* 1920x1080 scaled down via CSS */}
                        <canvas 
                            ref={canvasRef}
                            width={1920} 
                            height={1080}
                            className="w-full max-w-4xl h-auto block bg-black"
                            style={{ aspectRatio: '16/9' }}
                        />
                        
                        {/* Full Screen Click Layer for Interaction */}
                        {(gameState === 'standby' || gameState === 'playing') && (
                            <div 
                                className="absolute inset-0 z-20 cursor-pointer"
                                onClick={(e) => { e.preventDefault(); handleInteraction(); }}
                                onTouchStart={(e) => { e.preventDefault(); handleInteraction(); }}
                            >
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-4 text-xs text-slate-500">
                        HD 1080p | 30fps | Auto-Export .mp4
                    </div>
                </div>
            )}
        </div>
      );
  }

  return null;
};

export default Interactive;