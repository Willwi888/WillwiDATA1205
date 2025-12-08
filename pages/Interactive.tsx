import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { Link } from 'react-router-dom';
import PaymentModal from '../components/PaymentModal';
import { generateAiVideo } from '../services/geminiService';
import { useTranslation } from '../context/LanguageContext';

// -------------------
// Types & Helper
// -------------------
type GameState = 'login' | 'select' | 'ready' | 'playing' | 'finished';
type ViewMode = 'audience' | 'director' | 'vote'; // Added 'vote' mode

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
  const { user, login, logout, deductCredit, isAdmin } = useUser(); // Added isAdmin
  const { t } = useTranslation();
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');

  // Lock System State
  const [isSystemLocked, setIsSystemLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [lockError, setLockError] = useState('');

  // View Mode State - Default to 'vote' as it's the new event
  const [viewMode, setViewMode] = useState<ViewMode>('vote');

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

  // Auto-switch to Director Mode if Admin logs in
  useEffect(() => {
      if (isAdmin) {
          setIsSystemLocked(false); // Unlock system for admin
      }
  }, [isAdmin]);

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
    
    if (lineIndex >= lyricsLines.length) {
        finishGame();
        return;
    }

    const currentLine = lyricsLines[lineIndex];
    const newSyncPoint = { time: elapsedTime, text: currentLine };
    setSyncData(prev => [...prev, newSyncPoint]);

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

  const handleTimeEdit = (index: number, newTimeVal: string) => {
      const val = parseFloat(newTimeVal);
      if (!isNaN(val)) {
          setSyncData(prev => {
              const newData = [...prev];
              newData[index].time = val;
              return newData;
          });
      }
  };

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
        e.preventDefault();
        handleSync();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, lineIndex, elapsedTime]);

  // -------------------
  // Director Interface Component (Admin Only)
  // -------------------
  const DirectorInterface = () => {
      const [prompt, setPrompt] = useState('');
      const [isGenerating, setIsGenerating] = useState(false);
      const [videoUrl, setVideoUrl] = useState<string | null>(null);
      const [uploadedImage, setUploadedImage] = useState<string | null>(null);
      const [statusMsg, setStatusMsg] = useState('');
      
      const fileRef = useRef<HTMLInputElement>(null);

      const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                  setUploadedImage(reader.result as string);
              };
              reader.readAsDataURL(file);
          }
      };

      const handleGenerate = async () => {
          if (!prompt && !uploadedImage) {
              alert("請輸入提示詞或上傳圖片");
              return;
          }

          setIsGenerating(true);
          setVideoUrl(null);
          setStatusMsg('Initializing Veo Model...');

          try {
              let imageBytes = undefined;
              let mimeType = 'image/png';

              if (uploadedImage) {
                  // Extract base64 part
                  const parts = uploadedImage.split(',');
                  imageBytes = parts[1];
                  mimeType = parts[0].split(':')[1].split(';')[0];
              }

              setStatusMsg('Generating video... This may take 1-2 minutes.');
              const url = await generateAiVideo(prompt, imageBytes, mimeType);
              
              if (url) {
                  setVideoUrl(url);
                  setStatusMsg('Generation Complete!');
              } else {
                  setStatusMsg('Generation failed.');
              }
          } catch (e: any) {
              console.error(e);
              setStatusMsg(`Error: ${e.message || 'Unknown error'}`);
          } finally {
              setIsGenerating(false);
          }
      };

      return (
          <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-8 shadow-2xl">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="bg-indigo-600 p-2 rounded text-white">🎬</div>
                      <div>
                          <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Director Studio</h2>
                          <p className="text-slate-400 text-xs">Powered by Google Veo (Generative Video)</p>
                      </div>
                      <div className="ml-auto px-3 py-1 bg-indigo-900/30 border border-indigo-500/50 text-indigo-300 rounded text-xs font-bold uppercase">
                          Admin Only
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Controls */}
                      <div className="space-y-6">
                          <div>
                              <label className="block text-slate-300 text-sm font-bold mb-2">1. Prompt (提示詞)</label>
                              <textarea 
                                  className="w-full bg-slate-950 border border-slate-700 rounded p-4 text-white focus:border-indigo-500 outline-none h-32 text-sm"
                                  placeholder="Describe the scene (e.g., A cyberpunk city with neon lights, slow motion)"
                                  value={prompt}
                                  onChange={(e) => setPrompt(e.target.value)}
                              />
                          </div>

                          <div>
                              <label className="block text-slate-300 text-sm font-bold mb-2">2. Reference Image (Optional)</label>
                              <div 
                                  onClick={() => fileRef.current?.click()}
                                  className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-lg p-6 text-center cursor-pointer transition-colors"
                              >
                                  {uploadedImage ? (
                                      <img src={uploadedImage} alt="ref" className="max-h-32 mx-auto rounded shadow-lg" />
                                  ) : (
                                      <div className="text-slate-500 text-sm">
                                          <span>Click to upload image</span>
                                      </div>
                                  )}
                                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                              </div>
                              {uploadedImage && (
                                  <button onClick={() => { setUploadedImage(null); if(fileRef.current) fileRef.current.value='' }} className="text-xs text-red-400 mt-2 hover:underline">Clear Image</button>
                              )}
                          </div>

                          <div className="bg-slate-800 p-4 rounded text-xs text-slate-400 leading-relaxed">
                              <strong>Note:</strong> Video generation takes time. You may need to select a billing project via the pop-up if this is your first time.
                          </div>

                          <button 
                              onClick={handleGenerate}
                              disabled={isGenerating}
                              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                              {isGenerating ? 'Generating (Please Wait)...' : '✨ Generate Video (MP4)'}
                          </button>
                          
                          {statusMsg && (
                              <p className={`text-center text-sm font-mono ${statusMsg.includes('Error') ? 'text-red-400' : 'text-indigo-300'} animate-pulse`}>
                                  {statusMsg}
                              </p>
                          )}
                      </div>

                      {/* Preview */}
                      <div className="bg-black rounded-lg border border-slate-800 flex items-center justify-center min-h-[300px] relative overflow-hidden">
                          {videoUrl ? (
                              <div className="w-full h-full flex flex-col">
                                  <video 
                                      src={videoUrl} 
                                      controls 
                                      className="w-full h-auto max-h-[400px]"
                                      autoPlay
                                      loop
                                  />
                                  <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-center">
                                      <a 
                                          href={videoUrl} 
                                          download="willwi_veo_generated.mp4"
                                          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-bold rounded flex items-center gap-2"
                                      >
                                          ⬇ Download MP4
                                      </a>
                                  </div>
                              </div>
                          ) : (
                              <div className="text-center text-slate-600">
                                  <div className="text-4xl mb-2">🎬</div>
                                  <div className="text-sm">Preview will appear here</div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // -------------------
  // VOTE EVENT Component
  // -------------------
  const VoteEvent = () => {
      const { songs } = useData();
      const [userName, setUserName] = useState('');
      const [userEmail, setUserEmail] = useState('');
      const [isLoggedIn, setIsLoggedIn] = useState(false);
      const [selectedVotes, setSelectedVotes] = useState<Set<string>>(new Set());
      const [isSubmitted, setIsSubmitted] = useState(false);
      
      // Candidate Detail Modal
      const [previewSong, setPreviewSong] = useState<Song | null>(null);
      // New: Tab for Lyric/Credits in Modal
      const [previewTab, setPreviewTab] = useState<'lyrics' | 'credits'>('lyrics');

      // Generate 40 Candidates (Mix of real songs + mocked duplicates for demo)
      const candidates = React.useMemo(() => {
          if (songs.length === 0) return [];
          const list = [...songs];
          // Fill up to 40 for demo purposes if not enough
          while (list.length < 40) {
              const seed = songs[list.length % songs.length];
              list.push({
                  ...seed,
                  id: `${seed.id}-mock-${list.length}`,
                  title: `${seed.title} (Remix ${list.length})`
              });
          }
          return list.slice(0, 40);
      }, [songs]);

      const toggleVote = (id: string) => {
          const newSet = new Set(selectedVotes);
          if (newSet.has(id)) {
              newSet.delete(id);
          } else {
              if (newSet.size < 10) newSet.add(id);
          }
          setSelectedVotes(newSet);
      };

      const handleVoteLogin = (e: React.FormEvent) => {
          e.preventDefault();
          if (userName && userEmail) setIsLoggedIn(true);
      };

      const handleSubmitVotes = () => {
          if (selectedVotes.size !== 10) {
              alert(t('vote_limit_msg'));
              return;
          }
          setIsSubmitted(true);
          // In real app, send to backend here
      };

      // 1. Login Wall
      if (!isLoggedIn) {
          return (
              <div className="max-w-md mx-auto py-20 px-4 animate-fade-in">
                  <div className="bg-gradient-to-br from-slate-900 to-black border border-brand-gold/30 rounded-xl p-8 shadow-[0_0_30px_rgba(251,191,36,0.1)] text-center relative overflow-hidden">
                       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-gold to-transparent"></div>
                       
                       <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-2 font-serif">{t('vote_title')}</h2>
                       <p className="text-brand-gold text-sm font-medium uppercase tracking-widest mb-8">{t('vote_subtitle')}</p>
                       
                       <div className="text-slate-400 text-sm leading-relaxed mb-8 font-light">
                          {t('vote_desc')}
                       </div>

                       <form onSubmit={handleVoteLogin} className="space-y-4">
                           <input 
                              required 
                              placeholder="Name / 姓名"
                              className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-brand-gold outline-none text-center"
                              value={userName}
                              onChange={e => setUserName(e.target.value)}
                           />
                           <input 
                              required 
                              type="email"
                              placeholder="Email / 電子信箱"
                              className="w-full bg-slate-950 border border-slate-700 rounded p-3 text-white focus:border-brand-gold outline-none text-center"
                              value={userEmail}
                              onChange={e => setUserEmail(e.target.value)}
                           />
                           <button className="w-full py-4 bg-brand-gold text-slate-900 font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors">
                               {t('vote_login_title')}
                           </button>
                       </form>
                  </div>
              </div>
          );
      }

      // 3. Gift Success Screen
      if (isSubmitted) {
          return (
              <div className="max-w-2xl mx-auto py-20 px-4 animate-fade-in text-center">
                  <div className="bg-slate-900/80 backdrop-blur-xl border border-brand-gold/50 rounded-2xl p-10 shadow-2xl relative">
                      <div className="w-20 h-20 bg-brand-gold rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                          🎁
                      </div>
                      <h2 className="text-3xl font-black text-white uppercase mb-4">{t('vote_gift_title')}</h2>
                      <p className="text-slate-300 mb-8 max-w-md mx-auto">{t('vote_gift_desc')}</p>
                      
                      {/* Audio Player Card */}
                      <div className="bg-black/50 rounded-xl p-6 border border-white/10 flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center shrink-0">
                              ▶️
                          </div>
                          <div className="text-left flex-grow">
                              <div className="text-brand-gold font-bold text-sm uppercase tracking-wider">Voice Message</div>
                              <div className="text-white text-xs opacity-70">Duration: 0:45</div>
                              <div className="h-1 bg-slate-700 w-full mt-2 rounded-full overflow-hidden">
                                  <div className="h-full w-1/3 bg-brand-gold"></div>
                              </div>
                          </div>
                      </div>

                      <div className="mt-8 text-slate-500 text-xs uppercase tracking-widest">
                          Thank you for being part of Willwi's journey.
                      </div>
                      <button onClick={() => setIsSubmitted(false)} className="mt-8 text-slate-500 hover:text-white underline text-xs">Return to Event</button>
                  </div>
              </div>
          );
      }

      // 2. Voting Grid
      return (
          <div className="max-w-7xl mx-auto py-10 px-4 animate-fade-in relative pb-32">
              
              {/* Event Header */}
              <div className="text-center mb-12">
                  <h2 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-brand-gold to-yellow-700 uppercase tracking-tighter mb-4 font-serif">
                      Beloved
                  </h2>
                  <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
                      {t('vote_desc')}
                  </p>
              </div>

              {/* Sticky Counter */}
              <div className="sticky top-20 z-30 bg-slate-900/90 backdrop-blur border-y border-brand-gold/20 py-3 mb-8 flex justify-between items-center px-6 shadow-xl">
                  <div className="font-mono text-brand-gold font-bold">
                      SELECTED: <span className="text-white text-xl">{selectedVotes.size}</span> / 10
                  </div>
                  <button 
                      onClick={handleSubmitVotes}
                      disabled={selectedVotes.size !== 10}
                      className={`px-6 py-2 rounded font-bold uppercase tracking-widest text-xs transition-all ${selectedVotes.size === 10 ? 'bg-brand-gold text-slate-900 shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                  >
                      {t('vote_submit')}
                  </button>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {candidates.map(song => {
                      const isSelected = selectedVotes.has(song.id);
                      return (
                          <div key={song.id} className={`group relative bg-slate-900 rounded-lg overflow-hidden border transition-all duration-300 ${isSelected ? 'border-brand-gold ring-2 ring-brand-gold/50 scale-[1.02]' : 'border-slate-800 hover:border-slate-600'}`}>
                              {/* Cover */}
                              <div className="aspect-square relative">
                                  <img src={song.coverUrl} className={`w-full h-full object-cover transition-all duration-500 ${isSelected ? 'grayscale-0' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100'}`} alt={song.title} />
                                  <button 
                                      onClick={() => setPreviewSong(song)}
                                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40"
                                  >
                                      <span className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-brand-gold hover:text-black transition-colors">▶</span>
                                  </button>
                              </div>
                              
                              {/* Info & Action */}
                              <div className="p-3">
                                  <h4 className="text-white text-xs font-bold truncate mb-3">{song.title}</h4>
                                  <button 
                                      onClick={() => toggleVote(song.id)}
                                      disabled={!isSelected && selectedVotes.size >= 10}
                                      className={`w-full py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${isSelected ? 'bg-brand-gold text-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                  >
                                      {isSelected ? 'SELECTED' : 'VOTE'}
                                  </button>
                              </div>
                          </div>
                      );
                  })}
              </div>

              {/* Preview Modal */}
              {previewSong && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setPreviewSong(null)}>
                      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-5xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row h-[80vh] md:h-auto" onClick={e => e.stopPropagation()}>
                          {/* Close */}
                          <button onClick={() => setPreviewSong(null)} className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/50 rounded-full text-white flex items-center justify-center hover:bg-red-500 transition-colors">✕</button>
                          
                          {/* Left: Player Container (Big visual) */}
                          <div className="w-full md:w-5/12 bg-black relative flex flex-col items-center justify-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] overflow-hidden p-8">
                              {/* Visualizer Background */}
                              <div className="absolute inset-0 opacity-30 bg-gradient-to-t from-brand-gold/20 to-transparent"></div>
                              
                              {/* Large Cover Art (Album Cover) */}
                              <div className="relative z-10 w-full aspect-square shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/10 rounded-md overflow-hidden mb-8">
                                  <img src={previewSong.coverUrl} className="w-full h-full object-cover" alt="Album Cover" />
                              </div>

                              <div className="z-10 w-full text-center">
                                  <div className="text-white font-bold text-xl mb-1 truncate">{previewSong.title}</div>
                                  <div className="text-brand-gold text-xs font-bold uppercase tracking-[0.2em] mb-6">Instrumental Master Tape</div>

                                  {previewSong.audioUrl ? (
                                      <>
                                          {/* Custom Styled Audio Player */}
                                          <audio 
                                              controls 
                                              controlsList="nodownload" 
                                              className="w-full mix-blend-screen invert hue-rotate-180 contrast-125 mb-4" 
                                              style={{height: '40px'}}
                                          >
                                              <source src={previewSong.audioUrl} type="audio/mpeg" />
                                              <source src={previewSong.audioUrl} type="audio/wav" />
                                              Your browser does not support audio playback.
                                          </audio>
                                          <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                                              Private Session • Do Not Distribute
                                          </div>
                                      </>
                                  ) : (
                                      <div className="flex flex-col items-center justify-center py-4 text-slate-500 gap-2 border border-slate-800 rounded">
                                          <span>💽</span>
                                          <span className="uppercase text-xs tracking-widest">No Master Tape</span>
                                      </div>
                                  )}
                              </div>
                          </div>

                          {/* Right: Info & Lyrics Tabs */}
                          <div className="w-full md:w-7/12 bg-slate-900 flex flex-col h-full min-h-[400px]">
                              {/* Tabs */}
                              <div className="flex border-b border-slate-700">
                                  <button 
                                    onClick={() => setPreviewTab('lyrics')}
                                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${previewTab === 'lyrics' ? 'bg-slate-800 text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}
                                  >
                                      Lyrics
                                  </button>
                                  <button 
                                    onClick={() => setPreviewTab('credits')}
                                    className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${previewTab === 'credits' ? 'bg-slate-800 text-brand-gold border-b-2 border-brand-gold' : 'text-slate-500 hover:text-white'}`}
                                  >
                                      Credits & Info
                                  </button>
                              </div>

                              {/* Content */}
                              <div className="p-8 overflow-y-auto flex-grow custom-scrollbar">
                                  {previewTab === 'lyrics' ? (
                                      <div className="text-sm text-slate-300 whitespace-pre-line font-light leading-8 text-center md:text-left">
                                          {previewSong.lyrics || (
                                              <div className="text-slate-500 italic py-10 text-center">
                                                  No lyrics available for this track.
                                              </div>
                                          )}
                                      </div>
                                  ) : (
                                      <div className="space-y-6">
                                          <div>
                                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                                              <p className="text-sm text-slate-300 leading-relaxed">
                                                  {previewSong.description || "No description provided."}
                                              </p>
                                          </div>
                                          <div>
                                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Credits</h4>
                                              <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950/50 p-4 rounded border border-slate-800">
                                                  {previewSong.credits || "No credits provided."}
                                              </div>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                                  <div className="text-[10px] text-slate-500 uppercase">Release Date</div>
                                                  <div className="text-white font-mono text-sm">{previewSong.releaseDate}</div>
                                              </div>
                                              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                                                  <div className="text-[10px] text-slate-500 uppercase">Label</div>
                                                  <div className="text-white font-mono text-sm">{previewSong.releaseCompany || '-'}</div>
                                              </div>
                                          </div>
                                      </div>
                                  )}
                              </div>
                              
                              {/* Action Bar */}
                              <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-between items-center">
                                  <div className="text-xs text-slate-500">
                                      {previewSong.isrc && <span className="font-mono mr-4">ISRC: {previewSong.isrc}</span>}
                                  </div>
                                  <button 
                                      onClick={() => { toggleVote(previewSong.id); setPreviewSong(null); }}
                                      disabled={!selectedVotes.has(previewSong.id) && selectedVotes.size >= 10}
                                      className={`px-6 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors ${selectedVotes.has(previewSong.id) ? 'bg-brand-gold text-slate-900' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                                  >
                                      {selectedVotes.has(previewSong.id) ? 'Selected' : 'Vote for this track'}
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
      );
  }


  // -------------------
  // View Switcher (Top)
  // -------------------
  const ViewSwitcher = () => (
      <div className="flex justify-center mb-8 gap-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-800 w-fit mx-auto backdrop-blur-sm sticky top-2 z-20 shadow-lg">
          <button 
            onClick={() => setViewMode('vote')}
            className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${viewMode === 'vote' ? 'bg-brand-gold text-slate-900 shadow' : 'text-slate-500 hover:text-white'}`}
          >
              <span>🏆</span> {t('vote_tab')}
          </button>
          
          {/* HIDE STUDIO & DIRECTOR FROM PUBLIC - ONLY SHOW IF ADMIN */}
          {isAdmin && (
            <>
                <div className="w-px bg-slate-800 mx-1"></div>
                <button 
                    onClick={() => setViewMode('audience')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${viewMode === 'audience' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                >
                    <span>🎤</span> Studio
                </button>
                <button 
                    onClick={() => setViewMode('director')}
                    className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${viewMode === 'director' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-white'}`}
                >
                    <span>🎬</span> Director
                </button>
            </>
          )}
      </div>
  );

  // -------------------
  // Render Views
  // -------------------

  // Lock Screen Logic - Only show if in Audience mode AND locked AND not admin
  // Vote mode is public. Director is admin only.
  if (viewMode === 'audience' && isSystemLocked && !isAdmin) {
      return (
        <div className="min-h-screen">
            <ViewSwitcher />
            <div className="min-h-[50vh] flex items-center justify-center px-4 animate-fade-in">
                <div className="bg-slate-900 border border-slate-800 rounded-sm p-8 max-w-md w-full shadow-2xl text-center">
                    <div className="text-3xl text-brand-gold mb-4 font-mono tracking-widest">SYSTEM LOCKED</div>
                    <p className="text-slate-400 mb-8 text-sm">Interactive Studio Restricted. Password Required.</p>
                    
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
        </div>
      );
  }

  // Common Wrapper
  return (
      <div className="min-h-screen">
          <ViewSwitcher />
          
          {viewMode === 'vote' && <VoteEvent />}

          {viewMode === 'director' && isAdmin && <DirectorInterface />}

          {viewMode === 'audience' && (
             // Re-injecting the existing Audience Mode logic
             gameState === 'login' ? (
                <div className="max-w-md mx-auto mt-20 px-4 animate-fade-in">
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
             ) : gameState === 'select' ? (
                <div className="max-w-6xl mx-auto pb-12 px-4 relative animate-fade-in">
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
                              Professional manual synchronization tool. Curate your lyrics line-by-line, Musixmatch style.
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
                              {/* Removed grayscale, changed opacity */}
                              <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover transition-opacity duration-500" />
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
             ) : gameState === 'finished' ? (
                  <div className="max-w-4xl mx-auto px-4 py-12 text-center animate-fade-in">
                     <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
                     
                     <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 md:p-16 shadow-2xl">
                         <h2 className="text-3xl font-bold text-white mb-2 uppercase tracking-tight">Session Complete</h2>
                         <p className="text-slate-400 text-sm mb-10 tracking-wide uppercase">
                           Project: <span className="text-brand-accent">{selectedSong?.title}</span>
                         </p>

                         <div className="grid grid-cols-2 gap-px bg-slate-800 max-w-lg mx-auto mb-8 border border-slate-800">
                            <div className="bg-slate-900 p-6">
                               <div className="text-3xl font-light text-white mb-1 font-mono">{syncData.length}</div>
                               <div className="text-[10px] text-slate-500 uppercase tracking-widest">Lines Synced</div>
                            </div>
                            <div className="bg-slate-900 p-6">
                               <div className="text-3xl font-light text-white mb-1 font-mono">{formatTime(elapsedTime)}</div>
                               <div className="text-[10px] text-slate-500 uppercase tracking-widest">Total Duration</div>
                            </div>
                         </div>

                         {/* Editable Table */}
                         <div className="max-w-xl mx-auto mb-10 bg-black/50 rounded border border-slate-700 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar text-left p-2">
                             <table className="w-full text-xs font-mono">
                                 <thead>
                                     <tr>
                                         <th className="text-slate-500 pb-2 pl-2">Time (sec)</th>
                                         <th className="text-slate-500 pb-2">Lyric</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {syncData.map((row, i) => (
                                         <tr key={i} className="border-b border-slate-800/50">
                                             <td className="py-1">
                                                 <input 
                                                    type="number" 
                                                    step="0.01"
                                                    className="bg-transparent text-brand-accent w-20 outline-none border-b border-transparent focus:border-brand-accent"
                                                    value={row.time}
                                                    onChange={(e) => handleTimeEdit(i, e.target.value)}
                                                 />
                                             </td>
                                             <td className="py-1 text-slate-400 truncate max-w-[200px]">{row.text}</td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
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
             ) : (
                // Ready & Playing
                <div className="max-w-4xl mx-auto px-4 pb-12 min-h-screen flex flex-col animate-fade-in">
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
                                  <li className="flex gap-3"><span className="text-brand-accent font-bold">03.</span> <span className="text-white">Press SPACEBAR at the start of each line.</span></li>
                                </ol>
                                <button 
                                  onClick={startGame}
                                  className="w-full py-4 bg-brand-accent hover:bg-white text-brand-darker font-bold rounded-sm text-sm uppercase tracking-widest transition-colors shadow-lg shadow-brand-accent/20"
                                >
                                  Start Live Sync
                                </button>
                            </div>
                          ) : (
                            <>
                               {/* NEXT Line Preview (Top) */}
                               <div className="mb-12 min-h-[60px] flex flex-col items-center justify-end opacity-50 transition-all">
                                  {(() => {
                                      const lyricsLines = selectedSong!.lyrics!.split('\n').filter(l => l.trim() !== '');
                                      const nextLine = lineIndex < lyricsLines.length - 1 ? lyricsLines[lineIndex + 1] : '';
                                      return (
                                          <>
                                              <p className="text-brand-accent text-[10px] font-bold tracking-[0.3em] uppercase mb-2">UP NEXT</p>
                                              <p className="text-slate-400 text-lg font-light text-center px-4">{nextLine}</p>
                                          </>
                                      );
                                  })()}
                               </div>

                               {/* CURRENT Line (Center Focus) */}
                               <div className="space-y-4 mb-16 transform transition-all duration-300">
                                  <div className="bg-slate-900/50 backdrop-blur-md border-l-4 border-brand-accent py-8 px-6 rounded-r-lg shadow-2xl">
                                       <p className="text-3xl md:text-5xl font-black text-white leading-tight">
                                          {(() => {
                                              const lyricsLines = selectedSong!.lyrics!.split('\n').filter(l => l.trim() !== '');
                                              return lyricsLines[lineIndex] || "END";
                                          })()}
                                      </p>
                                  </div>
                               </div>

                               <div className="pt-4">
                                  <button 
                                    onClick={handleSync}
                                    className="w-full max-w-xs h-24 border border-slate-600 hover:border-brand-accent bg-transparent text-slate-500 hover:text-white rounded-sm transition-all flex flex-col items-center justify-center gap-2 mx-auto uppercase tracking-widest text-xs active:scale-95 active:bg-slate-800"
                                  >
                                     <span className="text-brand-accent font-bold text-lg">⬇ NEXT LINE</span>
                                     <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">PRESS SPACEBAR</span>
                                  </button>
                               </div>
                            </>
                          )}
                       </div>
                    </div>

                    {/* Progress Bar */}
                    {(() => {
                         const lyricsLines = selectedSong!.lyrics!.split('\n').filter(l => l.trim() !== '');
                         const progress = (lineIndex / lyricsLines.length) * 100;
                         return (
                            <>
                                <div className="mt-8 h-1 bg-slate-800 w-full">
                                    <div className="h-full bg-brand-accent transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                </div>
                                <div className="flex justify-between mt-2 text-[10px] text-slate-600 font-mono uppercase">
                                    <span>Lines Synced</span>
                                    <span>{lineIndex} / {lyricsLines.length}</span>
                                </div>
                            </>
                         )
                    })()}
                </div>
             )
          )}
      </div>
  );
};

export default Interactive;