import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import PaymentModal from '../components/PaymentModal';
import { useTranslation } from '../context/LanguageContext';

// --- TYPES ---
type InteractionMode = 'menu' | 'lyric-maker' | 'ai-video';
type GameState = 'select' | 'ready' | 'playing' | 'finished';

interface SyncPoint {
  time: number;
  text: string;
}

const Interactive: React.FC = () => {
  const { user, login, deductCredit } = useUser();
  const { songs } = useData();
  const { t } = useTranslation();
  
  // UI State
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  // --- LYRIC MAKER STATE ---
  const [gameState, setGameState] = useState<GameState>('select');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [syncData, setSyncData] = useState<SyncPoint[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- HANDLERS ---

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if(loginEmail.trim()) {
          login(loginEmail);
      }
  };

  // --- LYRIC GAME LOGIC ---

  const handleSelectSong = (song: Song) => {
    if (!song.lyrics) {
        alert("這首歌暫時沒有歌詞資料，請先至資料庫新增歌詞。");
        return;
    }
    setSelectedSong(song);
    setGameState('ready');
    setLineIndex(0);
    setElapsedTime(0);
    setSyncData([]);
  };

  const startGame = () => {
    if (!selectedSong) return;
    setGameState('playing');
    
    if (audioRef.current) {
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
    }

    startTimeRef.current = Date.now();
    
    const loop = () => {
      const now = Date.now();
      const delta = (now - startTimeRef.current) / 1000;
      setElapsedTime(delta);
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const handleSync = () => {
    if (!selectedSong || !selectedSong.lyrics) return;
    
    const lyricsLines = selectedSong.lyrics.split('\n').filter(l => l.trim() !== '');
    
    // Record
    if (lineIndex < lyricsLines.length) {
        const currentLine = lyricsLines[lineIndex];
        setSyncData(prev => [...prev, { time: elapsedTime, text: currentLine }]);
    }

    // Advance
    if (lineIndex < lyricsLines.length - 1) {
      setLineIndex(prev => prev + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioRef.current) audioRef.current.pause();
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
    setElapsedTime(0);
    setSyncData([]);
  };

  // --- DOWNLOAD & PAYMENT ---

  const handleDownloadClick = () => {
      if (!user) return;
      
      // 1. Check Credits
      if (deductCredit()) {
          downloadResult();
      } else {
          // 2. Show Paywall if no credits
          setShowPaymentModal(true);
      }
  };

  const downloadResult = () => {
    if (!selectedSong) return;
    
    // Generate SRT
    let srtContent = "";
    syncData.forEach((item, index) => {
        const formatSrtTime = (seconds: number) => {
            const date = new Date(0);
            date.setMilliseconds(seconds * 1000);
            return date.toISOString().substr(11, 12).replace('.', ',');
        };

        const start = formatSrtTime(item.time);
        const nextTimeVal = (index < syncData.length - 1) ? syncData[index+1].time : item.time + 3;
        const end = formatSrtTime(nextTimeVal);

        srtContent += `${index + 1}\n${start} --> ${end}\n${item.text}\n\n`;
    });

    // Create JSON for "Video" (simulated project file)
    const projectData = {
        meta: {
            title: selectedSong.title,
            artist: "Willwi",
            generatedBy: "Willwi Interactive Studio",
            date: new Date().toISOString()
        },
        lyrics: syncData
    };

    // Download SRT
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSong.title}_DynamicLyrics.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    alert(`下載成功！\n\n已扣除 1 點製作額度。\n剩餘額度：${user?.credits - 1}`);
  };

  // Keyboard Listener for Game
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.code === 'Enter') && gameState === 'playing' && mode === 'lyric-maker') {
        e.preventDefault();
        handleSync();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, lineIndex, elapsedTime, mode]);


  // --- RENDER ---

  // 1. LOGIN SCREEN
  if (!user) {
      return (
        <div className="min-h-screen pt-20 px-4 flex flex-col items-center justify-center animate-fade-in">
             <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-accent to-purple-600"></div>
                 <div className="text-center">
                     <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto flex items-center justify-center mb-6 text-3xl">✨</div>
                     <h2 className="text-2xl font-bold text-white mb-2">Interactive Studio</h2>
                     <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                        登入以使用手工歌詞製作與 AI 影像功能。<br/>
                        <span className="text-brand-gold">新用戶即可獲得 1 次免費製作額度。</span>
                     </p>
                     <form onSubmit={handleLogin} className="space-y-4">
                         <input 
                            type="email" 
                            required 
                            placeholder="輸入您的 Email" 
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
  }

  // 2. MAIN MENU
  if (mode === 'menu') {
      return (
        <div className="max-w-6xl mx-auto pt-16 px-6 animate-fade-in">
             <div className="flex justify-between items-center mb-12">
                 <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Interactive Studio</h1>
                    <p className="text-slate-400 text-sm mt-1">Select a creative tool to begin.</p>
                 </div>
                 <div className="text-right">
                     <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Your Credits</div>
                     <div className="text-2xl font-bold text-brand-gold">{user.credits} <span className="text-sm text-slate-500 font-normal">pts</span></div>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* CARD 1: LYRIC MAKER */}
                 <button 
                    onClick={() => setMode('lyric-maker')}
                    className="group relative bg-slate-900 border border-slate-800 hover:border-brand-accent rounded-2xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] overflow-hidden"
                 >
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <svg className="w-32 h-32 text-brand-accent" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
                     </div>
                     <div className="relative z-10">
                         <span className="inline-block px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold mb-4">AVAILABLE</span>
                         <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-brand-accent transition-colors">Handmade Lyrics</h3>
                         <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            為資料庫中的任何歌曲製作動態歌詞影片。<br/>
                            親手敲擊節奏，賦予歌詞靈魂。
                         </p>
                         <div className="flex items-center gap-2 text-sm text-white font-bold group-hover:translate-x-2 transition-transform">
                             Enter Studio <span>→</span>
                         </div>
                     </div>
                 </button>

                 {/* CARD 2: AI VIDEO (LOCKED) */}
                 <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-8 text-left overflow-hidden opacity-80 cursor-not-allowed">
                     {/* LOCK OVERLAY */}
                     <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-6">
                         <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                             <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                         </div>
                         <h3 className="text-xl font-bold text-white mb-1">AI Video Lab</h3>
                         <p className="text-slate-400 text-xs mb-4">Powered by Google Veo</p>
                         <span className="px-3 py-1 rounded border border-white/20 text-white text-xs tracking-wider uppercase">Coming Soon</span>
                     </div>

                     <div className="absolute top-0 right-0 p-4 opacity-10">
                         <svg className="w-32 h-32 text-purple-500" fill="currentColor" viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                     </div>
                     <div className="relative z-10 filter blur-sm">
                         <span className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold mb-4">PREMIUM</span>
                         <h3 className="text-2xl font-bold text-white mb-2">Text-to-Video</h3>
                         <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            使用最新的 Google Gemini & Veo 模型，<br/>
                            將您的歌詞意境轉化為電影級影像。
                         </p>
                     </div>
                 </div>
             </div>
        </div>
      );
  }

  // 3. LYRIC MAKER STUDIO
  if (mode === 'lyric-maker') {
      return (
        <div className="max-w-5xl mx-auto pt-8 px-4 pb-20 animate-fade-in">
            <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
            
            <button 
                onClick={() => { resetGame(); setMode('menu'); }}
                className="mb-6 text-slate-500 hover:text-white text-sm flex items-center gap-2 transition-colors"
            >
                ← Back to Menu
            </button>

            {/* STEP 1: SELECT SONG */}
            {gameState === 'select' && (
                <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Select a Track</h2>
                    
                    <div className="relative mb-6">
                        <input 
                            type="text" 
                            placeholder="Search database..." 
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-brand-accent outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="absolute right-4 top-3 text-slate-500">🔍</div>
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
                                    <p className="text-xs text-slate-400">{song.language} • {song.lyrics ? 'Lyrics Ready' : 'No Lyrics'}</p>
                                </div>
                                <button className="px-4 py-2 bg-brand-accent/10 text-brand-accent rounded text-xs font-bold uppercase">Select</button>
                            </div>
                        ))}
                        {songs.filter(s => s.lyrics).length === 0 && (
                            <div className="col-span-2 text-center py-10 text-slate-500">
                                資料庫中暫無含有歌詞的歌曲。請先至 "Add Song" 或 "Database" 編輯歌詞。
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* STEP 2: PLAYING GAME */}
            {(gameState === 'ready' || gameState === 'playing' || gameState === 'finished') && selectedSong && (
                <div className="flex flex-col items-center">
                    
                    {/* Header Info */}
                    <div className="w-full flex items-center justify-between mb-8 bg-slate-900/50 p-4 rounded-xl border border-white/5">
                        <div className="flex items-center gap-4">
                            <img src={selectedSong.coverUrl} className="w-12 h-12 rounded shadow" alt="cover"/>
                            <div>
                                <h3 className="font-bold text-white">{selectedSong.title}</h3>
                                <div className="text-xs text-slate-400 font-mono">
                                    {formatTime(elapsedTime)}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {gameState === 'finished' && (
                                <button onClick={resetGame} className="px-4 py-2 rounded border border-slate-600 text-slate-300 hover:text-white text-xs">
                                    重選歌曲
                                </button>
                            )}
                        </div>
                    </div>

                    {/* MAIN GAME AREA */}
                    <div className="relative w-full max-w-2xl aspect-video bg-black rounded-2xl border-2 border-slate-800 shadow-2xl flex flex-col items-center justify-center p-8 overflow-hidden">
                        
                        {/* Current Lyric Display */}
                        {gameState === 'playing' ? (
                            <div className="text-center space-y-6 z-10">
                                <p className="text-slate-600 text-lg transition-all transform scale-90 blur-[1px]">
                                    {lineIndex > 0 && selectedSong.lyrics?.split('\n').filter(l=>l.trim())[lineIndex-1]}
                                </p>
                                <p className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-pulse">
                                    {selectedSong.lyrics?.split('\n').filter(l=>l.trim())[lineIndex]}
                                </p>
                                <p className="text-slate-600 text-lg transition-all transform scale-90 blur-[1px]">
                                    {selectedSong.lyrics?.split('\n').filter(l=>l.trim())[lineIndex+1]}
                                </p>
                            </div>
                        ) : gameState === 'ready' ? (
                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white mb-4">準備好了嗎？</h3>
                                <p className="text-slate-400 mb-8">
                                    按下開始後，請跟著音樂節奏<br/>
                                    在每句歌詞 <span className="text-brand-accent font-bold">開始唱的時候</span> 按下 <span className="border border-white/30 px-2 py-1 rounded text-white text-xs mx-1">SPACE</span> 空白鍵。
                                </p>
                                <button 
                                    onClick={startGame}
                                    className="px-8 py-4 bg-brand-accent text-slate-900 font-black text-xl rounded-full hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(56,189,248,0.4)]"
                                >
                                    ▶ START
                                </button>
                            </div>
                        ) : (
                            <div className="text-center animate-fade-in-up">
                                <h3 className="text-3xl font-black text-white mb-2">Great Job!</h3>
                                <p className="text-slate-400 mb-8">歌詞同步已完成。您可以下載 SRT 字幕檔或專案檔。</p>
                                <button 
                                    onClick={handleDownloadClick}
                                    className="px-8 py-4 bg-green-500 text-white font-bold text-lg rounded-full hover:bg-green-400 transition-all shadow-lg flex items-center justify-center gap-2 mx-auto"
                                >
                                    <span>Download SRT</span>
                                    <span className="bg-black/20 text-[10px] px-2 py-1 rounded">-1 Credit</span>
                                </button>
                            </div>
                        )}

                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 h-1 bg-brand-accent transition-all duration-100 ease-linear" style={{width: `${(lineIndex / (selectedSong.lyrics?.split('\n').filter(l=>l.trim()).length || 1)) * 100}%`}}></div>
                    </div>

                    {/* Audio Element (Hidden or Visible controls if needed, here hidden for game feel) */}
                    {selectedSong.audioUrl && (
                        <audio 
                            ref={audioRef}
                            src={selectedSong.audioUrl}
                            onEnded={finishGame}
                            className="hidden" // Controlled by game logic
                        />
                    )}
                    
                    {gameState === 'playing' && (
                        <div className="mt-8 text-slate-500 text-sm animate-pulse">
                            Press <span className="text-white font-bold border border-slate-600 px-2 py-1 rounded mx-1">SPACE</span> to sync next line
                        </div>
                    )}
                </div>
            )}
        </div>
      );
  }

  return null;
};

// Helper
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100); 
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

export default Interactive;