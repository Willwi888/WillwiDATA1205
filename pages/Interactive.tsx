import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import PaymentModal from '../components/PaymentModal';
import { useTranslation } from '../context/LanguageContext';

// --- TYPES ---
type InteractionMode = 'menu' | 'lyric-maker' | 'ai-video' | 'voting';
type GameState = 'select' | 'ready' | 'playing' | 'finished';

interface SyncPoint {
  time: number;
  text: string;
}

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
  const { user, login, deductCredit } = useUser();
  const { songs } = useData();
  const { t } = useTranslation();
  
  // UI State
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  // --- VOTING EVENT STATE ---
  const [votes, setVotes] = useState<string[]>([]);
  const [voteReasons, setVoteReasons] = useState<Record<string, string>>({}); // Map songId -> Reason
  const [previewSong, setPreviewSong] = useState<Song | null>(null); // For YouTube Modal
  const MAX_VOTES = 10;

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

  // --- VOTING LOGIC ---

  const toggleVote = (songId: string) => {
      if (votes.includes(songId)) {
          // Remove vote
          setVotes(prev => prev.filter(id => id !== songId));
          // Optional: Clear reason? Let's keep it in case they re-add
      } else {
          // Add vote
          if (votes.length >= MAX_VOTES) {
              alert(`最多只能選擇 ${MAX_VOTES} 首摯愛歌曲喔！`);
              return;
          }
          setVotes(prev => [...prev, songId]);
      }
  };

  const handleReasonChange = (songId: string, text: string) => {
      setVoteReasons(prev => ({
          ...prev,
          [songId]: text
      }));
  };

  const submitVotes = () => {
      if (votes.length < MAX_VOTES) {
           alert(`請再選 ${MAX_VOTES - votes.length} 首歌才能送出喔！`);
           return;
      }
      
      // In a real app, send `votes` and `voteReasons` to backend here.
      console.log("Submitting Votes:", votes);
      console.log("Reasons:", voteReasons);

      alert(`🎉 感謝您的參與！\n\n您的 10 首摯愛已送出。\nWillwi 將會製作專屬的「有聲音樂卡片」，\n這是一份關於感謝與連結的禮物，將會寄送至您的信箱：\n${user?.email}`);
      
      setMode('menu');
      setVotes([]);
      setVoteReasons({});
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
                        登入以使用手工歌詞製作、票選活動與 AI 影像功能。<br/>
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

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 
                 {/* CARD 1: BELOVED VOTING (NEW) */}
                 <button 
                    onClick={() => setMode('voting')}
                    className="group relative bg-slate-900 border border-slate-800 hover:border-pink-500 rounded-2xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] overflow-hidden"
                 >
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <svg className="w-32 h-32 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                     </div>
                     <div className="relative z-10">
                         <span className="inline-block px-3 py-1 rounded-full bg-pink-500/20 text-pink-500 text-xs font-bold mb-4 animate-pulse">EVENT ACTIVE</span>
                         <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">Beloved 2026</h3>
                         <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            摯愛票選活動。<br/>
                            參與投票即可獲得專屬「有聲音樂卡片」。
                         </p>
                         <div className="flex items-center gap-2 text-sm text-white font-bold group-hover:translate-x-2 transition-transform">
                             Join Event <span>→</span>
                         </div>
                     </div>
                 </button>

                 {/* CARD 2: LYRIC MAKER */}
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
                            為資料庫中的任何歌曲製作動態歌詞。<br/>
                            親手敲擊節奏，賦予歌詞靈魂。
                         </p>
                         <div className="flex items-center gap-2 text-sm text-white font-bold group-hover:translate-x-2 transition-transform">
                             Enter Studio <span>→</span>
                         </div>
                     </div>
                 </button>

                 {/* CARD 3: AI VIDEO (LOCKED) */}
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

  // 3. BELOVED VOTING VIEW
  if (mode === 'voting') {
      return (
        <div className="max-w-6xl mx-auto pt-8 px-4 pb-20 animate-fade-in relative">
             <button 
                onClick={() => setMode('menu')}
                className="mb-6 text-slate-500 hover:text-white text-sm flex items-center gap-2 transition-colors"
            >
                ← Back to Menu
            </button>
            
            <div className="text-center mb-10">
                 <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Beloved 2026</h2>
                 <p className="text-slate-400 max-w-xl mx-auto">
                    請從下方選出 <span className="text-pink-500 font-bold">10 首</span> 您最喜愛的歌曲。<br/>
                    送出後，Willwi 將會寄送一份專屬的<span className="text-white font-bold">「有聲音樂卡片」</span>給您。
                 </p>
                 
                 {/* Progress Bar */}
                 <div className="max-w-md mx-auto mt-6">
                     <div className="flex justify-between text-xs font-bold uppercase mb-2">
                         <span className="text-white">Your Votes</span>
                         <span className={votes.length === MAX_VOTES ? "text-green-500" : "text-pink-500"}>
                             {votes.length} / {MAX_VOTES}
                         </span>
                     </div>
                     <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                         <div 
                            className={`h-full transition-all duration-300 ${votes.length === MAX_VOTES ? 'bg-green-500' : 'bg-pink-500'}`}
                            style={{width: `${(votes.length / MAX_VOTES) * 100}%`}}
                         ></div>
                     </div>
                 </div>

                 {votes.length === MAX_VOTES && (
                     <button 
                        onClick={submitVotes}
                        className="mt-6 px-8 py-3 bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-full shadow-lg shadow-pink-500/20 animate-bounce"
                     >
                        送出選票 (Submit)
                     </button>
                 )}
            </div>

            {/* Song Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {songs.map(song => (
                    <div key={song.id} className="group relative">
                        <div 
                            className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all shadow-lg
                                ${votes.includes(song.id) ? 'border-pink-500 ring-2 ring-pink-500/50' : 'border-slate-800 hover:border-slate-500'}
                            `}
                            onClick={() => setPreviewSong(song)}
                        >
                             <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={song.title} />
                             
                             {/* Play Overlay */}
                             <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 flex items-center justify-center transition-all">
                                 <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/50 group-hover:scale-110 transition-transform">
                                     <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                 </div>
                             </div>

                             {/* Youtube Indicator */}
                             {song.youtubeUrl && (
                                 <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">YT</div>
                             )}
                        </div>

                        <div className="mt-3 flex items-start justify-between gap-2">
                             <div className="text-left flex-1 min-w-0">
                                 <h4 className="text-sm font-bold text-white truncate">{song.title}</h4>
                                 <p className="text-[10px] text-slate-500 truncate">{song.language} • {song.versionLabel || 'Original'}</p>
                             </div>
                             <button 
                                onClick={(e) => { e.stopPropagation(); toggleVote(song.id); }}
                                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${votes.includes(song.id) ? 'bg-pink-500 border-pink-500 text-white' : 'border-slate-600 text-slate-600 hover:border-pink-500 hover:text-pink-500'}`}
                             >
                                 ♥
                             </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* VIDEO PREVIEW MODAL */}
            {previewSong && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setPreviewSong(null)}></div>
                    <div className="relative z-10 bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-fade-in flex flex-col md:flex-row max-h-[90vh]">
                        
                        {/* Main Video Section */}
                        <div className="flex-1 flex flex-col bg-black">
                             <div className="p-4 bg-slate-950 flex justify-between items-center border-b border-slate-800">
                                <h3 className="text-lg font-bold text-white truncate max-w-xs">{previewSong.title}</h3>
                                <button onClick={() => setPreviewSong(null)} className="text-slate-400 hover:text-white md:hidden">✕</button>
                            </div>
                            
                            <div className="relative flex-grow flex items-center justify-center bg-black aspect-video md:aspect-auto">
                                {previewSong.youtubeUrl && getYoutubeEmbedUrl(previewSong.youtubeUrl) ? (
                                    <iframe 
                                        className="w-full h-full absolute inset-0"
                                        src={getYoutubeEmbedUrl(previewSong.youtubeUrl)!}
                                        title="YouTube player"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-8">
                                        <img src={previewSong.coverUrl} className="w-32 h-32 rounded mb-4 opacity-50" />
                                        <p>此歌曲尚未設定 YouTube 影片連結。</p>
                                        {previewSong.audioUrl && (
                                            <audio controls src={previewSong.audioUrl} className="mt-4 z-20" />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sidebar: Vote & Reason */}
                        <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
                             <div className="p-4 border-b border-slate-800 hidden md:flex justify-between items-center">
                                 <span className="text-xs font-bold text-slate-500 uppercase">Vote & Review</span>
                                 <button onClick={() => setPreviewSong(null)} className="text-slate-400 hover:text-white">✕</button>
                             </div>

                             <div className="p-6 flex-grow overflow-y-auto">
                                 <div className="mb-6">
                                     <button 
                                        onClick={() => toggleVote(previewSong.id)}
                                        className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 mb-2 ${votes.includes(previewSong.id) ? 'bg-pink-500 text-white shadow-lg' : 'bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700'}`}
                                     >
                                         <span className="text-xl">♥</span> {votes.includes(previewSong.id) ? '已加入摯愛' : '加入摯愛清單'}
                                     </button>
                                     <p className="text-[10px] text-center text-slate-500">
                                         {votes.includes(previewSong.id) ? '感謝您的投票！' : '喜歡這首歌嗎？投它一票！'}
                                     </p>
                                 </div>

                                 {/* Optional Reason Input - Only show if voted or allow pre-fill */}
                                 <div className={`transition-all duration-300 ${votes.includes(previewSong.id) ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                     <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                         為什麼推薦這首歌？ (非必填)
                                     </label>
                                     <textarea 
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-pink-500 focus:outline-none transition-colors resize-none h-32"
                                        placeholder="告訴 Willwi 您的感受..."
                                        value={voteReasons[previewSong.id] || ''}
                                        onChange={(e) => handleReasonChange(previewSong.id, e.target.value)}
                                        disabled={!votes.includes(previewSong.id)}
                                     />
                                     <p className="text-[10px] text-slate-600 mt-2">
                                         您的留言可能會被選入未來的特別企劃中。
                                     </p>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // 4. LYRIC MAKER STUDIO
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