import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import PaymentModal from '../components/PaymentModal';
import { useTranslation } from '../context/LanguageContext';
import { generateAiVideo, generateShotSuggestions } from '../services/geminiService';

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
type InteractionMode = 'menu' | 'lyric-maker' | 'ai-video';
type GameState = 'select' | 'ready' | 'standby' | 'playing' | 'processing' | 'finished';
type VideoState = 'select-song' | 'compose' | 'generating' | 'result';

// --- SUB-COMPONENTS (Defined OUTSIDE to fix input lag) ---

const LoginModal = ({ onClose, onLogin }: { onClose: () => void, onLogin: (name: string, email: string) => void }) => {
    // Local state for inputs prevents parent re-renders and input lag
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(name.trim() && email.trim()) {
            onLogin(name, email);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative z-10 max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl overflow-hidden animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                <div className="text-center">
                    <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-6 text-3xl">✨</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Interactive Studio</h2>
                    <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                        登入以使用工作室功能。<br/>
                        <span className="text-brand-gold">新用戶即可獲得 1 次免費製作額度。</span>
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input 
                            type="text" 
                            required 
                            placeholder="您的姓名 / 暱稱" 
                            className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center focus:border-brand-accent outline-none transition-colors" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                        />
                        <input 
                            type="email" 
                            required 
                            placeholder="您的電子信箱" 
                            className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center focus:border-brand-accent outline-none transition-colors" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
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
};

const AiUnlockModal = ({ onClose, onUnlock }: { onClose: () => void, onUnlock: () => void }) => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Password logic: Admin keys or specific event key
        if (code === '8888' || code === 'eloveg2026' || code === '20261212') {
            onUnlock();
        } else {
            setError('密碼錯誤 (Invalid Code)');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative z-10 max-w-sm w-full bg-slate-900 border border-purple-500/50 rounded-2xl p-8 shadow-2xl overflow-hidden animate-fade-in-up">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">✕</button>
                <div className="text-center">
                    <div className="w-16 h-16 bg-purple-900/30 rounded-full mx-auto flex items-center justify-center mb-6 text-3xl">🍜</div>
                    <h2 className="text-xl font-bold text-white mb-2">隱藏菜單</h2>
                    <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                        水還沒開，暫不對外開放。<br/>
                        (Private Beta Access)
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input 
                            type="password" 
                            required 
                            placeholder="Access Code" 
                            className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center focus:border-purple-500 outline-none transition-colors tracking-widest font-mono" 
                            value={code} 
                            onChange={(e) => setCode(e.target.value)} 
                        />
                        {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
                        <button 
                            type="submit" 
                            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg uppercase tracking-widest text-sm transition-colors shadow-lg"
                        >
                            Unlock
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

const Interactive: React.FC = () => {
  const { user, login, deductCredit, isAdmin } = useUser();
  const { songs } = useData();
  const { t } = useTranslation();
  
  // UI State
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // AI Unlock State
  const [showAiUnlockModal, setShowAiUnlockModal] = useState(false);
  const [isAiUnlocked, setIsAiUnlocked] = useState(false);

  // --- LYRIC MAKER STATE ---
  const [gameState, setGameState] = useState<GameState>('select');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [lineIndex, setLineIndex] = useState(0); 
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- AI VIDEO GENERATOR STATE ---
  const [videoState, setVideoState] = useState<VideoState>('select-song');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoRefImage, setVideoRefImage] = useState<string | null>(null); // base64 string
  const [videoRefImagePreview, setVideoRefImagePreview] = useState<string | null>(null); // preview url
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [shotSuggestions, setShotSuggestions] = useState<string[]>([]);
  const [isLoadingShots, setIsLoadingShots] = useState(false);
  
  // Refs for Engine
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const coverImageRef = useRef<HTMLImageElement | null>(null);
  const lyricsArrayRef = useRef<string[]>([]);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  
  // Visualizer Data
  const visualizerBarsRef = useRef<number[]>(new Array(60).fill(0));

  // --- HANDLERS ---

  const handleLoginSubmit = (name: string, email: string) => {
      login(name, email);
      setShowLoginModal(false);
  };

  const handleToolClick = (targetMode: InteractionMode) => {
      if (!user) {
          setShowLoginModal(true);
          return;
      }
      
      // AI Video Lock Logic
      if (targetMode === 'ai-video' && !isAiUnlocked && !isAdmin) {
          setShowAiUnlockModal(true);
          return;
      }
      
      setMode(targetMode);
  };

  const handleAiUnlockSuccess = () => {
      setIsAiUnlocked(true);
      setShowAiUnlockModal(false);
      setMode('ai-video');
  };

  // --- AI VIDEO HANDLERS ---
  const handleSelectSongForVideo = (song: Song) => {
      setSelectedSong(song);
      setVideoPrompt('');
      setShotSuggestions([]); // Clear previous suggestions
      setVideoState('compose');
      setVideoRefImage(null);
      setVideoRefImagePreview(null);
      setGeneratedVideoUrl(null);
  };

  const handleGetShotSuggestions = async () => {
      if (!selectedSong) return;
      setIsLoadingShots(true);
      const suggestions = await generateShotSuggestions(selectedSong);
      setShotSuggestions(suggestions);
      setIsLoadingShots(false);
  };

  const handleVideoImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = () => {
              const result = reader.result as string;
              setVideoRefImagePreview(result);
              // Extract base64 part
              setVideoRefImage(result.split(',')[1]);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerateVideo = async () => {
      if (!selectedSong) return;
      if (!videoPrompt.trim()) {
          alert("Please enter a prompt or select one from the AI Director.");
          return;
      }
      if (!deductCredit() && !isAdmin) {
          setShowPaymentModal(true);
          return;
      }

      setVideoState('generating');
      try {
          const url = await generateAiVideo(
              videoPrompt, 
              videoRefImage || undefined,
              'image/png', // Defaulting to png, could detect from file
              videoAspectRatio
          );
          if (url) {
              setGeneratedVideoUrl(url);
              setVideoState('result');
          } else {
              alert('Generation failed. Please try again.');
              setVideoState('compose');
          }
      } catch (e) {
          console.error(e);
          alert('Generation error: ' + (e as Error).message);
          setVideoState('compose');
      }
  };

  // --- LYRIC VIDEO ENGINE ---

  // Preload Image with Robust Handling
  useEffect(() => {
      // Reset previous image
      coverImageRef.current = null;

      if (selectedSong && selectedSong.coverUrl && mode === 'lyric-maker') {
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
  }, [selectedSong, mode]);

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

      // --- 1. BACKGROUND ---
      // Draw Blurred Cover or Black
      ctx.fillStyle = '#0f172a'; // Slate 900 base
      ctx.fillRect(0, 0, w, h);

      if (coverImageRef.current) {
          try {
              ctx.save();
              // Create a heavy blur effect
              ctx.filter = 'blur(80px) brightness(0.4) saturate(1.2)';
              // Draw image scaled to cover entire screen
              ctx.drawImage(coverImageRef.current, -100, -100, w + 200, h + 200);
              
              // Add a noise overlay or gradient to make it look premium
              const gradient = ctx.createLinearGradient(0, 0, w, h);
              gradient.addColorStop(0, 'rgba(0,0,0,0.2)');
              gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
              ctx.fillStyle = gradient;
              ctx.fillRect(0,0,w,h);
              
              ctx.restore();
          } catch (e) {}
      }

      // --- 2. LAYOUT CALCULATION (Split View) ---
      // Right Side: Album Art (35% width)
      // Left Side: Lyrics (65% width)
      
      const artAreaX = w * 0.62; // Start at 62% width
      const artSize = 550;
      const artY = (h - artSize) / 2 - 50;
      
      const lyricAreaX = 120; // Left Margin
      const lyricCenterY = h / 2 - 40; // Slightly above center

      // --- 3. DRAW RIGHT SIDE (ALBUM ART & INFO) ---
      if (coverImageRef.current) {
          try {
              ctx.save();
              
              // Drop Shadow for Album Art
              ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
              ctx.shadowBlur = 60;
              ctx.shadowOffsetY = 30;

              // Rounded Rect Clip
              const r = 24; // Radius
              ctx.beginPath();
              ctx.moveTo(artAreaX + r, artY);
              ctx.lineTo(artAreaX + artSize - r, artY);
              ctx.quadraticCurveTo(artAreaX + artSize, artY, artAreaX + artSize, artY + r);
              ctx.lineTo(artAreaX + artSize, artY + artSize - r);
              ctx.quadraticCurveTo(artAreaX + artSize, artY + artSize, artAreaX + artSize - r, artY + artSize);
              ctx.lineTo(artAreaX + r, artY + artSize);
              ctx.quadraticCurveTo(artAreaX, artY, artAreaX + r, artY);
              ctx.closePath();
              
              // Clip and Draw
              ctx.save();
              ctx.clip();
              ctx.drawImage(coverImageRef.current, artAreaX, artY, artSize, artSize);
              ctx.restore();
              
              // Inner Border (subtle)
              ctx.lineWidth = 2;
              ctx.strokeStyle = "rgba(255,255,255,0.1)";
              ctx.stroke();

              ctx.restore(); // Restore shadow
          } catch(e) {}
      }

      // Song Info (Below Art)
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 10;
      
      // Title
      ctx.font = '900 48px Montserrat, sans-serif';
      // Handle very long titles
      let displayTitle = selectedSong.title;
      if (displayTitle.length > 18) displayTitle = displayTitle.substring(0, 18) + '...';
      ctx.fillText(displayTitle, artAreaX, artY + artSize + 80);

      // Artist
      ctx.font = '500 32px Montserrat, sans-serif';
      ctx.fillStyle = '#94a3b8'; // Slate 400
      ctx.fillText(`Willwi`, artAreaX, artY + artSize + 130);
      
      // Metadata (e.g., Year)
      ctx.font = '400 24px Montserrat, sans-serif';
      ctx.fillStyle = '#64748b'; // Slate 500
      ctx.fillText(selectedSong.releaseDate.split('-')[0] + ' • ' + (selectedSong.versionLabel || 'Original'), artAreaX, artY + artSize + 170);

      // --- 4. DRAW LEFT SIDE (LYRICS) ---
      // Design: Current line huge, previous/next faded
      
      if (gameState === 'standby') {
          ctx.textAlign = 'left';
          ctx.font = '900 80px Montserrat';
          ctx.fillStyle = '#fbbf24'; // Gold
          ctx.fillText("READY?", lyricAreaX, lyricCenterY);
          
          ctx.font = '500 40px Montserrat';
          ctx.fillStyle = '#ffffff';
          ctx.fillText("Press SPACE to Start", lyricAreaX, lyricCenterY + 80);
          return;
      }

      // Draw Context Lines (Previous)
      ctx.textAlign = 'left';
      const lineHeight = 100;
      const contextLines = 2; // How many lines to show before/after

      for (let i = 1; i <= contextLines; i++) {
          const prevIdx = lineIndex - i;
          if (lines[prevIdx] !== undefined) {
               ctx.font = '600 40px Montserrat, sans-serif';
               // Fade opacity based on distance
               ctx.fillStyle = `rgba(255, 255, 255, ${0.4 - (i * 0.15)})`; 
               ctx.fillText(lines[prevIdx], lyricAreaX, lyricCenterY - (i * lineHeight) + 20); // +20 for visual alignment
          }
      }

      // Draw Current Line
      if (lines[lineIndex] !== undefined) {
          ctx.font = '900 72px Montserrat, sans-serif';
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = "rgba(0,0,0,0.5)";
          ctx.shadowBlur = 20;
          
          // Word Wrap Logic for very long lines
          const words = lines[lineIndex].split(''); // Split by char for Chinese, space for EN? Simple assumption for now
          // Simple width check (approximate)
          if (lines[lineIndex].length > 14) {
               ctx.font = '800 56px Montserrat, sans-serif'; // Shrink font for long lines
          }
          ctx.fillText(lines[lineIndex], lyricAreaX, lyricCenterY + 30);
          ctx.shadowBlur = 0;
      }

      // Draw Context Lines (Next)
      for (let i = 1; i <= 3; i++) { // Show more upcoming lines
          const nextIdx = lineIndex + i;
          if (lines[nextIdx] !== undefined) {
               ctx.font = '600 40px Montserrat, sans-serif';
               if (lines[nextIdx] === 'END') {
                   ctx.fillStyle = 'rgba(251, 191, 36, 0.5)'; // Gold for END
               } else {
                   ctx.fillStyle = `rgba(255, 255, 255, ${0.4 - (i * 0.1)})`;
               }
               ctx.fillText(lines[nextIdx], lyricAreaX, lyricCenterY + (i * lineHeight) + 30);
          }
      }

      // --- 5. VISUALIZER (BOTTOM) ---
      // Simulate audio reactivity based on gamestate
      if (gameState === 'playing') {
          // Update simulated bars
          visualizerBarsRef.current = visualizerBarsRef.current.map(prev => {
              const target = Math.random() * 100; // Target height (0-100)
              return prev + (target - prev) * 0.2; // Smooth lerp
          });
      } else {
           // Decay to 0
           visualizerBarsRef.current = visualizerBarsRef.current.map(prev => prev * 0.9);
      }

      const barWidth = 12;
      const barGap = 8;
      const numBars = 60;
      const startX = 120; // Align with lyrics
      const baselineY = h - 100;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let i = 0; i < numBars; i++) {
          const height = visualizerBarsRef.current[i] || 0;
          // Draw bar centered on height? No, emerging from bottom
          const x = startX + i * (barWidth + barGap);
          // Rounded cap bar
          ctx.beginPath();
          ctx.roundRect(x, baselineY - height, barWidth, height, 4);
          ctx.fill();
      }
      
      // Progress Line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(startX, baselineY + 10, w - startX - 100, 2);
      
      // Current Progress Indicator (Approximation based on line count)
      const progress = (lineIndex / (lines.length || 1));
      const progressWidth = (w - startX - 100) * progress;
      ctx.fillStyle = '#38bdf8'; // Brand Accent
      ctx.fillRect(startX, baselineY + 10, progressWidth, 2);

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


  // --- RENDER MAIN ---

  if (mode === 'menu') {
      return (
        <div className="max-w-6xl mx-auto pt-16 px-6 animate-fade-in pb-20">
             {showPaymentModal && <PaymentModal isOpen={true} onClose={() => setShowPaymentModal(false)} />}
             {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onLogin={handleLoginSubmit} />}
             {showAiUnlockModal && <AiUnlockModal onClose={() => setShowAiUnlockModal(false)} onUnlock={handleAiUnlockSuccess} />}
             
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

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                 {/* LYRIC MAKER CARD - ONLY CARD VISIBLE TO PUBLIC */}
                 <button 
                    onClick={() => handleToolClick('lyric-maker')}
                    className="group relative bg-slate-900 border border-slate-800 hover:border-brand-accent rounded-3xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] overflow-hidden md:col-span-2"
                 >
                     <div className="absolute inset-0 bg-gradient-to-r from-brand-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                     <div className="relative z-10 flex flex-col h-full justify-between">
                         <div className="flex justify-between items-start">
                             <span className="inline-block px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold mb-4 w-fit">VIDEO MAKER</span>
                             <span className="text-6xl opacity-20 grayscale group-hover:grayscale-0 transition-all">🎬</span>
                         </div>
                         <div>
                             <h3 className="text-4xl font-bold text-white mb-2 group-hover:text-brand-accent transition-colors">手工動態歌詞</h3>
                             <p className="text-slate-400 text-sm max-w-lg">
                                 親手為喜愛的歌曲製作專屬的動態歌詞影片。跟隨節奏敲擊空白鍵，創造屬於你的視覺脈動。
                             </p>
                         </div>
                         <div className="flex items-center gap-2 text-sm text-white font-bold group-hover:translate-x-2 transition-transform mt-6">
                             進入工作室 (Enter) <span>→</span>
                         </div>
                     </div>
                 </button>

                 {/* HIDDEN / ADMIN ONLY: AI VIDEO CARD */}
                 {/* The AI Video Card is technically rendered but styled to be obscure/locked until password */}
                 <button 
                    onClick={() => handleToolClick('ai-video')}
                    className="group relative bg-slate-900 border border-slate-800 hover:border-purple-500 rounded-3xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] overflow-hidden md:col-span-2"
                 >
                     <div className="relative z-10 flex flex-col h-full justify-between">
                         <div className="flex items-center gap-2 mb-4">
                             <span className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold">VEO GENERATOR</span>
                             {!isAiUnlocked && !isAdmin && (
                                 <span className="inline-block px-2 py-1 rounded border border-orange-500/50 text-orange-400 text-[10px] font-bold tracking-wider whitespace-nowrap">
                                     🍜 水還沒開 無法泡麵 (Private Beta)
                                 </span>
                             )}
                             {(isAiUnlocked || isAdmin) && (
                                 <span className="inline-block px-2 py-1 rounded border border-green-500/50 text-green-500 text-[10px] font-bold uppercase tracking-wider">
                                     🔓 Unlocked
                                 </span>
                             )}
                         </div>
                         <div>
                             <h3 className="text-3xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">AI 音樂錄影帶導演</h3>
                             {!isAiUnlocked && !isAdmin && <p className="text-slate-600 text-xs">此功能目前僅供內部測試。</p>}
                         </div>
                         <div className="flex items-center gap-2 text-sm text-white font-bold group-hover:translate-x-2 transition-transform mt-auto">
                             {isAiUnlocked || isAdmin ? '啟動世代 (Start)' : '需要密碼 (Locked)'} <span>→</span>
                         </div>
                     </div>
                 </button>
             </div>
        </div>
      );
  }

  // --- AI VIDEO MAKER RENDER ---
  if (mode === 'ai-video') {
      return (
          <div className="max-w-5xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
              <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
              
              <div className="flex justify-between items-center mb-6">
                <button 
                    onClick={() => { setMode('menu'); setVideoState('select-song'); }}
                    className="text-slate-500 hover:text-white text-sm flex items-center gap-2 transition-colors"
                >
                    ← Back to Menu
                </button>
                {videoState !== 'select-song' && (
                    <button onClick={() => setVideoState('select-song')} className="text-red-400 hover:text-red-300 text-sm border border-red-900/50 px-3 py-1 rounded">
                        重選歌曲 (Reset)
                    </button>
                )}
            </div>

            {/* STEP 1: SELECT SONG */}
            {videoState === 'select-song' && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Select a Song for Context</h2>
                    <p className="text-slate-400 text-sm mb-6">The song title and description will guide the AI generation style.</p>
                    
                    <div className="relative mb-6">
                        <input 
                            type="text" 
                            placeholder="Search database..." 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {songs.filter(s => s.title.toLowerCase().includes(searchTerm.toLowerCase())).map(song => (
                            <div 
                                key={song.id}
                                onClick={() => handleSelectSongForVideo(song)}
                                className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 hover:border-purple-500 rounded-xl cursor-pointer transition-all hover:bg-slate-800"
                            >
                                <img src={song.coverUrl} className="w-16 h-16 rounded object-cover" alt={song.title} />
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white truncate">{song.title}</h4>
                                    <p className="text-xs text-slate-400">{song.language}</p>
                                </div>
                                <button className="px-4 py-2 bg-purple-500/10 text-purple-400 rounded text-xs font-bold uppercase">Select</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* STEP 2: COMPOSE & GENERATE */}
            {(videoState === 'compose' || videoState === 'generating' || videoState === 'result') && selectedSong && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* LEFT: SETTINGS */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                             <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-800">
                                 <img src={selectedSong.coverUrl} className="w-12 h-12 rounded" alt="cover" />
                                 <div>
                                     <h3 className="text-white font-bold">{selectedSong.title}</h3>
                                     <p className="text-xs text-slate-500">Selected Context</p>
                                 </div>
                             </div>

                             {/* AI DIRECTOR (NEW FEATURE) */}
                             <div className="mb-6 bg-purple-900/10 border border-purple-500/30 p-4 rounded-lg">
                                 <div className="flex justify-between items-center mb-3">
                                     <h4 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                                         🤖 AI Director Suggestions
                                     </h4>
                                     <button 
                                        onClick={handleGetShotSuggestions}
                                        disabled={isLoadingShots}
                                        className="text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
                                     >
                                        {isLoadingShots ? 'Thinking...' : 'Get Ideas (Free)'}
                                     </button>
                                 </div>
                                 <p className="text-[10px] text-slate-400 mb-3">
                                     Not sure what to generate? Ask Gemini to suggest 4 cinematic shot options based on the lyrics.
                                 </p>
                                 
                                 {shotSuggestions.length > 0 && (
                                     <div className="space-y-2">
                                         {shotSuggestions.map((shot, idx) => (
                                             <div 
                                                key={idx}
                                                onClick={() => setVideoPrompt(shot)}
                                                className="p-2 bg-slate-950 hover:bg-purple-900/30 border border-slate-800 hover:border-purple-500 rounded cursor-pointer text-xs text-slate-300 transition-all"
                                             >
                                                 <span className="font-bold text-purple-500 mr-2">#{idx+1}</span>
                                                 {shot}
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>

                             {/* IMAGE UPLOAD */}
                             <div className="mb-6">
                                 <label className="block text-sm font-bold text-white mb-2">1. Reference Photo (Required)</label>
                                 <div 
                                    onClick={() => videoFileInputRef.current?.click()}
                                    className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-lg p-6 text-center cursor-pointer transition-colors relative overflow-hidden group"
                                 >
                                     {videoRefImagePreview ? (
                                         <img src={videoRefImagePreview} className="h-48 w-full object-cover rounded-md opacity-80 group-hover:opacity-100 transition-opacity" alt="ref" />
                                     ) : (
                                         <div className="py-8">
                                             <span className="text-4xl block mb-2">📷</span>
                                             <span className="text-sm text-slate-400">Click to Upload Photo</span>
                                         </div>
                                     )}
                                     <input 
                                        type="file" 
                                        ref={videoFileInputRef} 
                                        accept="image/*" 
                                        onChange={handleVideoImageUpload} 
                                        className="hidden"
                                     />
                                 </div>
                             </div>

                             {/* PROMPT */}
                             <div className="mb-6">
                                 <label className="block text-sm font-bold text-white mb-2">2. Text Prompt</label>
                                 <textarea 
                                     className="w-full h-32 bg-slate-950 border border-slate-700 rounded p-3 text-white text-sm focus:border-purple-500 outline-none"
                                     value={videoPrompt}
                                     onChange={(e) => setVideoPrompt(e.target.value)}
                                     placeholder="Describe the video scene... or click an AI suggestion above."
                                 />
                             </div>

                             {/* RATIO */}
                             <div className="mb-6">
                                 <label className="block text-sm font-bold text-white mb-2">3. Aspect Ratio</label>
                                 <div className="flex gap-4">
                                     <button 
                                        onClick={() => setVideoAspectRatio('16:9')}
                                        className={`flex-1 py-3 rounded border text-sm font-bold transition-all ${videoAspectRatio === '16:9' ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                     >
                                         Landscape (16:9)
                                     </button>
                                     <button 
                                        onClick={() => setVideoAspectRatio('9:16')}
                                        className={`flex-1 py-3 rounded border text-sm font-bold transition-all ${videoAspectRatio === '9:16' ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                     >
                                         Portrait (9:16)
                                     </button>
                                 </div>
                             </div>

                             {/* GENERATE BTN */}
                             <button 
                                onClick={handleGenerateVideo}
                                disabled={videoState === 'generating' || !videoRefImage}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-purple-500/30 disabled:opacity-50 transition-all"
                             >
                                 {videoState === 'generating' ? 'Veo is thinking... (Take a nap)' : '✨ Generate Video'}
                             </button>
                        </div>
                    </div>

                    {/* RIGHT: PREVIEW / RESULT */}
                    <div className="bg-black rounded-xl border border-slate-800 flex items-center justify-center relative overflow-hidden min-h-[400px]">
                        {videoState === 'generating' && (
                            <div className="text-center">
                                <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <h3 className="text-white font-bold text-xl animate-pulse">Generating...</h3>
                                <p className="text-slate-500 text-sm mt-2">This may take 1-2 minutes.</p>
                            </div>
                        )}

                        {videoState === 'result' && generatedVideoUrl && (
                            <div className="w-full h-full flex flex-col">
                                <video 
                                    src={generatedVideoUrl} 
                                    controls 
                                    autoPlay 
                                    loop 
                                    className="w-full h-full object-contain max-h-[600px]"
                                />
                                <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center">
                                    <span className="text-green-400 font-bold text-sm">✓ Generation Complete</span>
                                    <a 
                                        href={generatedVideoUrl} 
                                        download={`Willwi_Veo_${Date.now()}.mp4`}
                                        className="text-white bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-xs font-bold"
                                    >
                                        Download MP4
                                    </a>
                                </div>
                            </div>
                        )}

                        {videoState === 'compose' && (
                             <div className="text-center opacity-30">
                                 <span className="text-6xl block mb-4">🎬</span>
                                 <p className="text-white font-bold">Preview Area</p>
                             </div>
                        )}
                    </div>
                </div>
            )}

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