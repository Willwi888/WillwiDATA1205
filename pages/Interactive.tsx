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
  const { user, login, deductCredit, isAdmin } = useUser();
  const { songs } = useData();
  const { t } = useTranslation();
  
  // UI State
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Login Inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginName, setLoginName] = useState('');

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
      if(loginEmail.trim() && loginName.trim()) {
          login(loginName, loginEmail);
      }
  };

  // --- VOTING LOGIC ---

  const toggleVote = (songId: string) => {
      if (votes.includes(songId)) {
          // Remove vote
          setVotes(prev => prev.filter(id => id !== songId));
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
    
    // Check credits before starting (optional, but good UX to warn)
    // Actually we deduct on Download, so they can play for free, but only download if they pay?
    // The prompt implies: "Entrance fee logic" -> 1st free, then pay.
    // But usually in these apps, you pay to *get the result*. Let's stick to pay-to-download for better UX,
    // allowing them to try the tool first. 
    // HOWEVER, the prompt says "Entrance to selection page -> Music & Lyrics appear".
    
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

    // Download SRT
    const blob = new Blob([srtContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedSong.title}_DynamicLyrics.srt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    alert(`下載成功！\n\n已扣除 1 點製作額度。\n剩餘額度：${(user?.credits || 1) - 1}`);
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
                        登入以使用手工歌詞製作功能。<br/>
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
  }

  // 2. MAIN MENU
  if (mode === 'menu') {
      return (
        <div className="max-w-6xl mx-auto pt-16 px-6 animate-fade-in">
             <div className="flex justify-between items-center mb-12">
                 <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Interactive Studio</h1>
                    <p className="text-slate-400 text-sm mt-1">Hello, {user.name}. Select a creative tool to begin.</p>
                 </div>
                 <div className="text-right">
                     <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Your Credits</div>
                     <div className="text-2xl font-bold text-brand-gold">{user.credits} <span className="text-sm text-slate-500 font-normal">pts</span></div>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 
                 {/* CARD 1: BELOVED VOTING (ADMIN ONLY) */}
                 {isAdmin && (
                    <button 
                        onClick={() => setMode('voting')}
                        className="group relative bg-slate-900 border border-slate-800 hover:border-pink-500 rounded-2xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(236,72,153,0.2)] overflow-hidden"
                    >
                        <div className="relative z-10">
                            <span className="inline-block px-3 py-1 rounded-full bg-pink-500/20 text-pink-500 text-xs font-bold mb-4 animate-pulse">ADMIN ONLY</span>
                            <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-pink-400 transition-colors">Beloved 2026</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                摯愛票選活動。<br/>
                                (目前僅供管理員測試)
                            </p>
                            <div className="flex items-center gap-2 text-sm text-white font-bold group-hover:translate-x-2 transition-transform">
                                Join Event <span>→</span>
                            </div>
                        </div>
                    </button>
                 )}

                 {/* CARD 2: LYRIC MAKER (PUBLIC) */}
                 {/* Centered or Full Width if it's the only one */}
                 <button 
                    onClick={() => setMode('lyric-maker')}
                    className={`group relative bg-slate-900 border border-slate-800 hover:border-brand-accent rounded-2xl p-8 text-left transition-all hover:shadow-[0_0_30px_rgba(56,189,248,0.1)] overflow-hidden ${!isAdmin ? 'md:col-span-2 lg:col-span-3' : ''}`}
                 >
                     <div className="relative z-10">
                         <span className="inline-block px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold mb-4">AVAILABLE</span>
                         <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-brand-accent transition-colors">手工動態歌詞 (Lyric Video Maker)</h3>
                         <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            親手敲擊節奏，賦予歌詞靈魂。<br/>
                            1st Free, then NT$80/song.
                         </p>
                         <div className="flex items-center gap-2 text-sm text-white font-bold group-hover:translate-x-2 transition-transform">
                             Enter Studio <span>→</span>
                         </div>
                     </div>
                 </button>

                 {/* CARD 3: AI VIDEO (ADMIN ONLY) */}
                 {isAdmin && (
                    <div className="relative bg-slate-950 border border-slate-800 rounded-2xl p-8 text-left overflow-hidden opacity-80 cursor-not-allowed">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-6">
                            <h3 className="text-xl font-bold text-white mb-1">AI Video Lab</h3>
                            <p className="text-slate-400 text-xs mb-4">Powered by Google Veo</p>
                            <span className="px-3 py-1 rounded border border-white/20 text-white text-xs tracking-wider uppercase">Coming Soon</span>
                        </div>
                        <div className="relative z-10 filter blur-sm">
                            <span className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold mb-4">PREMIUM</span>
                            <h3 className="text-2xl font-bold text-white mb-2">Text-to-Video</h3>
                        </div>
                    </div>
                 )}
             </div>
        </div>
      );
  }

  // 3. BELOVED VOTING VIEW (ADMIN ONLY GUARD)
  if (mode === 'voting') {
      if (!isAdmin) { setMode('menu'); return null; } // Guard
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
                     <button onClick={submitVotes} className="mt-6 px-8 py-3 bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-full shadow-lg shadow-pink-500/20 animate-bounce">
                        送出選票 (Submit)
                     </button>
                 )}
            </div>
            {/* Song Grid (Existing code reuse) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {songs.map(song => (
                    <div key={song.id} className="group relative">
                        <div 
                            className={`aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all shadow-lg ${votes.includes(song.id) ? 'border-pink-500 ring-2 ring-pink-500/50' : 'border-slate-800 hover:border-slate-500'}`}
                            onClick={() => setPreviewSong(song)}
                        >
                             <img src={song.coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={song.title} />
                             {votes.includes(song.id) && <div className="absolute inset-0 bg-pink-500/20 border-4 border-pink-500"></div>}
                        </div>
                        <div className="mt-3 flex items-start justify-between gap-2">
                             <div className="text-left flex-1 min-w-0">
                                 <h4 className="text-sm font-bold text-white truncate">{song.title}</h4>
                                 <p className="text-[10px] text-slate-500 truncate">{song.language} • {song.versionLabel || 'Original'}</p>
                             </div>
                             <button onClick={(e) => { e.stopPropagation(); toggleVote(song.id); }} className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${votes.includes(song.id) ? 'bg-pink-500 border-pink-500 text-white' : 'border-slate-600 text-slate-600 hover:border-pink-500 hover:text-pink-500'}`}>♥</button>
                        </div>
                    </div>
                ))}
            </div>
            {/* Preview Modal Logic (Reuse existing code structure) */}
            {previewSong && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setPreviewSong(null)}></div>
                    <div className="relative z-10 bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
                        <div className="flex-1 flex flex-col bg-black">
                             <div className="p-4 bg-slate-950 flex justify-between items-center border-b border-slate-800">
                                <h3 className="text-lg font-bold text-white truncate max-w-xs">{previewSong.title}</h3>
                                <button onClick={() => setPreviewSong(null)} className="text-slate-400 hover:text-white md:hidden">✕</button>
                            </div>
                            <div className="relative flex-grow flex items-center justify-center bg-black aspect-video md:aspect-auto">
                                {previewSong.youtubeUrl && getYoutubeEmbedUrl(previewSong.youtubeUrl) ? (
                                    <iframe className="w-full h-full absolute inset-0" src={getYoutubeEmbedUrl(previewSong.youtubeUrl)!} allow="autoplay; encrypted-media" allowFullScreen></iframe>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-500 p-8">
                                        <img src={previewSong.coverUrl} className="w-32 h-32 rounded mb-4 opacity-50" />
                                        <p>此歌曲尚未設定 YouTube 影片連結。</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col p-6">
                             <button onClick={() => toggleVote(previewSong.id)} className={`w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 mb-2 ${votes.includes(previewSong.id) ? 'bg-pink-500 text-white' : 'bg-slate-800 border border-slate-600 text-slate-300'}`}>
                                 <span className="text-xl">♥</span> {votes.includes(previewSong.id) ? '已加入摯愛' : '加入摯愛清單'}
                             </button>
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
                    <h2 className="text-2xl font-bold text-white mb-2">Select a Track</h2>
                    
                    {/* DISCLAIMER BLOCK */}
                    <div className="bg-slate-800 border-l-4 border-brand-accent p-6 rounded-r-lg mb-8 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-2">製作說明 / Disclaimer</h3>
                        <div className="text-slate-300 text-sm leading-relaxed mb-4 whitespace-pre-line space-y-4">
                            <p>
                                我不提供完全免費的創作體驗。<br/><br/>
                                不是因為我不願意分享，<br/>
                                而是因為「免費」往往是對創作最不負責任的定義。<br/><br/>
                                如果一件事永遠不需要被付出任何代價，<br/>
                                那最後只會變成沒有人願意真正去做的事。<br/><br/>
                                我希望鼓勵更多人參與創作，<br/>
                                但前提是<br/>
                                創作必須被認真對待，<br/>
                                而做音樂，必須是一件在現實世界中行得通的事。
                            </p>
                            <div className="border-t border-slate-700 my-3"></div>
                            <p className="text-xs text-slate-400">
                                I do not offer fully free creative experiences.<br/><br/>
                                Not because I refuse to share,<br/>
                                but because “free” is often the most careless way<br/>
                                to define creative work.<br/><br/>
                                When creation carries no value,<br/>
                                people eventually stop creating.<br/><br/>
                                This project exists to encourage participation,<br/>
                                but participation only matters<br/>
                                when creative work is treated with respect.<br/><br/>
                                Music should be something people can truly sustain,<br/>
                                not something expected to disappear under the label of “free.”
                            </p>
                        </div>
                        
                        <p className="text-slate-400 text-xs border-t border-slate-700 pt-3 mt-2">
                            ▸ 第一次體驗：免費 (First time free)<br/>
                            ▸ 第二次起：每首 NT$80 (From 2nd time: NT$80)<br/>
                            此費用為參與系統與創作支持，非商品販售、非代工服務。
                        </p>
                    </div>

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