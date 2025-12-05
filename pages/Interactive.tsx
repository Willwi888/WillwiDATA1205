import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { Link } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';

// -------------------
// Types & Helper
// -------------------
type GameState = 'login' | 'select' | 'ready' | 'playing' | 'finished';

interface SyncPoint {
  time: number;
  text: string;
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100); // 2 digits
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { user, login, logout, deductCredit } = useUser();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  // Lock System State
  const [isSystemLocked, setIsSystemLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [lockError, setLockError] = useState('');

  // Filter songs that actually have lyrics
  const playableSongs = songs.filter(s => s.lyrics && s.lyrics.length > 10);

  const [gameState, setGameState] = useState<GameState>('login');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  // Game Logic State
  const [lineIndex, setLineIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [syncData, setSyncData] = useState<SyncPoint[]>([]);
  
  // Refs for timer
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Sync gameState with user login status
  useEffect(() => {
    if (user) {
        if (gameState === 'login') setGameState('select');
    } else {
        setGameState('login');
    }
  }, [user]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '8888') {
        setIsSystemLocked(false);
        setLockError('');
    } else {
        setLockError('Incorrect password.');
        setPasswordInput('');
    }
  };

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if(loginEmail.trim()) {
          login(loginEmail);
      }
  };

  // -------------------
  // Game Functions
  // -------------------
  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setGameState('ready');
    setLineIndex(0);
    setElapsedTime(0);
    setSyncData([]);
  };

  const startGame = () => {
    if (!selectedSong) return;
    setGameState('playing');
    startTimeRef.current = Date.now();
    
    const loop = () => {
      const now = Date.now();
      const delta = (now - startTimeRef.current) / 1000; // seconds
      setElapsedTime(delta);
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const handleSync = () => {
    if (!selectedSong) return;
    
    const lyricsLines = selectedSong.lyrics!.split('\n').filter(l => l.trim() !== '');
    const currentLine = lyricsLines[lineIndex];

    // Record the sync point
    const newSyncPoint = { time: elapsedTime, text: currentLine };
    setSyncData(prev => [...prev, newSyncPoint]);

    // Move to next line or finish
    if (lineIndex < lyricsLines.length - 1) {
      setLineIndex(prev => prev + 1);
    } else {
      finishGame();
    }
  };

  const finishGame = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setGameState('finished');
  };

  const resetGame = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setGameState('select');
    setSelectedSong(null);
    setLineIndex(0);
    setElapsedTime(0);
    setSyncData([]);
  };

  // -------------------
  // Export & Payment Functions
  // -------------------
  const handleDownloadClick = () => {
      if (!user) return;

      if (deductCredit()) {
          downloadSrt();
      } else {
          setShowPaymentModal(true);
      }
  };

  const downloadSrt = () => {
    if (!selectedSong) return;
    let srtContent = "";
    syncData.forEach((item, index) => {
        const start = new Date(item.time * 1000).toISOString().substr(11, 12).replace('.', ',');
        const nextTimeVal = (index < syncData.length - 1) ? syncData[index+1].time : item.time + 3;
        const end = new Date(nextTimeVal * 1000).toISOString().substr(11, 12).replace('.', ',');
        
        srtContent += `${index + 1}\n${start} --> ${end}\n${item.text}\n\n`;
    });

    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSong.title}_handmade_lyrics.srt`;
    a.click();
    
    alert(`下載成功！已扣除 1 點額度。\n剩餘額度：${user?.credits}`);
  };

  // Keyboard support for spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState === 'playing') {
        e.preventDefault(); // prevent scroll
        handleSync();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, lineIndex, elapsedTime]);


  // -------------------
  // Render Views
  // -------------------

  // Lock Screen
  if (isSystemLocked) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
             <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 max-w-md w-full shadow-2xl text-center">
                 <div className="text-3xl text-brand-gold mb-4 font-mono tracking-widest">SYSTEM LOCKED</div>
                 <p className="text-slate-400 mb-8 text-sm">Restricted Area. Authorized Personnel Only.</p>
                 
                 <form onSubmit={handleUnlock} className="space-y-4">
                     <input 
                        type="password" 
                        placeholder="ACCESS CODE"
                        className="w-full bg-black border border-slate-700 rounded-sm px-4 py-3 text-white focus:border-brand-accent outline-none text-center tracking-[0.5em] font-mono"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                     />
                     {lockError && <p className="text-red-500 text-xs font-mono">{lockError}</p>}
                     <button type="submit" className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-sm transition-colors uppercase tracking-widest text-xs">
                         Unlock
                     </button>
                 </form>
             </div>
        </div>
      );
  }

  // 0. Login View
  if (gameState === 'login') {
      return (
        <div className="max-w-md mx-auto mt-20 px-4">
             <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 shadow-2xl text-center">
                 <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Interactive Studio</h2>
                 <p className="text-slate-500 mb-8 text-sm">Login to access lyric synchronization tools.</p>
                 
                 <form onSubmit={handleLogin} className="space-y-4">
                     <div>
                         <input 
                            type="email" 
                            required 
                            placeholder="Enter Email"
                            className="w-full bg-black border border-slate-700 rounded-sm px-4 py-3 text-white focus:border-brand-accent outline-none text-sm"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                         />
                     </div>
                     <button type="submit" className="w-full py-3 bg-brand-accent text-brand-darker font-bold rounded-sm hover:bg-white transition-colors uppercase tracking-wide text-sm">
                         Start Session
                     </button>
                 </form>
                 <div className="mt-6 pt-6 border-t border-slate-800 text-[10px] text-slate-600 uppercase tracking-widest">
                     Demo Environment
                 </div>
             </div>
        </div>
      );
  }
  
  // 1. Selection View
  if (gameState === 'select') {
    return (
      <div className="max-w-6xl mx-auto pb-12 px-4 relative">
        {/* User Stats Bar */}
        <div className="absolute top-0 right-4 z-20 flex items-center gap-4 bg-slate-900/90 backdrop-blur px-6 py-3 rounded-full border border-slate-800 shadow-lg">
             <span className="text-slate-300 text-xs font-bold uppercase tracking-wider">{user?.name}</span>
             <div className="flex items-center gap-1 text-brand-gold font-bold text-sm">
                 <span>CREDITS:</span>
                 <span>{user?.credits}</span>
             </div>
             <button onClick={() => setShowPaymentModal(true)} className="text-[10px] bg-slate-800 text-slate-300 px-3 py-1 rounded border border-slate-700 hover:text-white uppercase tracking-wider">Top Up</button>
             <button onClick={logout} className="text-[10px] text-slate-500 hover:text-white ml-2 uppercase tracking-wider">Logout</button>
        </div>

        <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />

        {/* Intro Section - Professional Look */}
        <div className="bg-slate-900 rounded-xl p-10 mb-10 border border-slate-800 shadow-2xl relative overflow-hidden mt-16 md:mt-12">
           <div className="relative z-10">
                <h1 className="text-3xl md:text-5xl font-black mb-4 tracking-tighter text-white uppercase">Lyric Video Studio</h1>
                <p className="text-slate-400 text-lg max-w-2xl font-light">
                  Professional manual synchronization tool. Select a track to generate timestamped SRT files for video production.
                </p>
           </div>
        </div>

        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
          <span className="w-1 h-6 bg-brand-accent"></span>
          <span className="uppercase tracking-widest text-sm">Select Track</span>
        </h2>

        {playableSongs.length === 0 ? (
          <div className="text-center py-20 bg-slate-900 rounded-sm border border-slate-800">
             <p className="text-slate-500 text-sm uppercase tracking-widest">No tracks with lyrics available.</p>
             <Link to="/add" className="inline-block mt-4 text-brand-accent hover:text-white text-xs uppercase underline">Go to Database</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {playableSongs.map(song => (
              <button 
                key={song.id} 
                onClick={() => handleSelectSong(song)}
                className="group relative bg-slate-900 rounded-lg overflow-hidden border border-slate-800 hover:border-brand-accent transition-all text-left hover:shadow-2xl"
              >
                <div className="aspect-video bg-black relative">
                  <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity duration-500 grayscale group-hover:grayscale-0" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="px-4 py-2 border border-white text-white font-bold uppercase text-xs tracking-widest hover:bg-white hover:text-black transition-colors">
                        Launch
                     </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-accent transition-colors truncate">{song.title}</h3>
                  <p className="text-slate-500 text-xs mt-1 uppercase tracking-wider">{song.versionLabel || song.language}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. Ready & Playing View
  if (gameState === 'ready' || gameState === 'playing') {
    const lyricsLines = selectedSong!.lyrics!.split('\n').filter(l => l.trim() !== '');
    const currentLine = lyricsLines[lineIndex];
    const nextLine = lineIndex < lyricsLines.length - 1 ? lyricsLines[lineIndex + 1] : 'END';
    const progress = (lineIndex / lyricsLines.length) * 100;

    return (
       <div className="max-w-4xl mx-auto px-4 pb-12 min-h-screen flex flex-col">
          {/* Top Bar */}
          <div className="flex justify-between items-center py-6 mb-4 border-b border-slate-800">
             <button onClick={resetGame} className="text-slate-500 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest">
               ← Exit
             </button>
             <div className="text-center">
                <div className="text-brand-accent font-bold text-[10px] uppercase tracking-[0.2em] mb-1">Session Active</div>
                <div className="text-white font-bold">{selectedSong?.title}</div>
             </div>
             <div className="w-20 text-right font-mono text-brand-gold">
               {formatTime(elapsedTime)}
             </div>
          </div>

          {/* Visualization Area */}
          <div className="flex-grow flex flex-col items-center justify-center relative">
             {/* Lyrics Card */}
             <div className="relative z-10 w-full max-w-3xl text-center">
                
                {gameState === 'ready' ? (
                  <div className="bg-slate-900 border border-slate-700 p-12 rounded-sm shadow-2xl animate-fade-in max-w-lg mx-auto">
                      <h3 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Ready to Record</h3>
                      <ol className="text-left text-slate-400 space-y-4 mb-10 text-sm font-light">
                        <li className="flex gap-3"><span className="text-brand-accent font-bold">01.</span> Prepare music in external player.</li>
                        <li className="flex gap-3"><span className="text-brand-accent font-bold">02.</span> Click 'Start' below.</li>
                        <li className="flex gap-3"><span className="text-brand-accent font-bold">03.</span> Press SPACEBAR to sync lyrics.</li>
                      </ol>
                      <button 
                        onClick={startGame}
                        className="w-full py-4 bg-brand-accent hover:bg-white text-brand-darker font-bold rounded-sm text-sm uppercase tracking-widest transition-colors"
                      >
                        Start Recording
                      </button>
                  </div>
                ) : (
                  <>
                     <div className="mb-16 min-h-[80px] flex flex-col items-center justify-end">
                        <p className="text-brand-accent text-[10px] font-bold tracking-[0.3em] uppercase mb-2">NEXT</p>
                        <p className="text-slate-500 text-lg font-light">{nextLine}</p>
                     </div>

                     <div className="space-y-4 mb-16">
                        <div className="text-4xl md:text-5xl font-bold text-white leading-tight min-h-[100px] flex items-center justify-center">
                           {currentLine}
                        </div>
                     </div>

                     <div className="pt-4">
                        <button 
                          onClick={handleSync}
                          className="w-64 h-24 border border-slate-600 hover:border-brand-accent bg-transparent text-slate-500 hover:text-white rounded-sm transition-all flex flex-col items-center justify-center gap-2 mx-auto uppercase tracking-widest text-xs"
                        >
                           <span>Tap to Sync</span>
                           <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400">SPACEBAR</span>
                        </button>
                     </div>
                  </>
                )}
             </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-8 h-1 bg-slate-800 w-full">
             <div className="h-full bg-brand-accent transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-slate-600 font-mono uppercase">
             <span>Progress</span>
             <span>{Math.round(progress)}%</span>
          </div>
       </div>
    );
  }

  // 3. Finished / Result View
  if (gameState === 'finished') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
         <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
         
         <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 md:p-16 shadow-2xl">
             <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Session Complete</h2>
             <p className="text-slate-400 text-sm mb-10 tracking-wide uppercase">
               Project: <span className="text-brand-accent">{selectedSong?.title}</span>
             </p>

             <div className="grid grid-cols-2 gap-px bg-slate-800 max-w-lg mx-auto mb-12 border border-slate-800">
                <div className="bg-slate-900 p-6">
                   <div className="text-3xl font-light text-white mb-1 font-mono">{syncData.length}</div>
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest">Lines Synced</div>
                </div>
                <div className="bg-slate-900 p-6">
                   <div className="text-3xl font-light text-white mb-1 font-mono">{formatTime(elapsedTime)}</div>
                   <div className="text-[10px] text-slate-500 uppercase tracking-widest">Duration</div>
                </div>
             </div>

             <div className="flex flex-col md:flex-row justify-center gap-4">
                <button 
                  onClick={handleDownloadClick}
                  className="px-8 py-4 bg-brand-accent hover:bg-white text-slate-900 font-bold rounded-sm uppercase tracking-widest text-xs transition-colors"
                >
                   {user && user.credits > 0 ? 'Download .SRT' : 'Purchase Credits to Download'}
                </button>
                <button 
                  onClick={resetGame}
                  className="px-8 py-4 border border-slate-600 hover:border-white text-slate-300 hover:text-white font-bold rounded-sm transition-colors uppercase tracking-widest text-xs"
                >
                   New Session
                </button>
             </div>
         </div>
      </div>
    );
  }

  return <div>Error State</div>;
};

export default Interactive;