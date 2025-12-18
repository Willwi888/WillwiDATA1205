import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import { GoogleGenAI } from "@google/genai";
import PaymentModal from '../components/PaymentModal';

type InteractionMode = 'menu' | 'gate' | 'studio' | 'veo-lab';
type GameState = 'select' | 'ready' | 'standby' | 'playing' | 'processing' | 'finished';

const Interactive: React.FC = () => {
  const { user, isAdmin } = useUser();
  const { songs } = useData();
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [showPaymentModal, setShowPaymentModal] = useState(false); // Used for general donations
  const [gameState, setGameState] = useState<GameState>('select');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // Studio Gate State
  const [studioPass, setStudioPass] = useState('');
  const [studioError, setStudioError] = useState('');

  // Veo Security & Event States
  const [veoPass, setVeoPass] = useState('');
  const [isVeoUnlocked, setIsVeoUnlocked] = useState(false);
  const [veoPrompt, setVeoPrompt] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoModel, setVideoModel] = useState<'fast' | 'hq'>('fast');

  const [listenerOpinion, setListenerOpinion] = useState('');
  const [listenerName, setListenerName] = useState(user?.name || '');
  const [listenerEmail, setListenerEmail] = useState(user?.email || '');

  const [lineIndex, setLineIndex] = useState(0); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const lyricsArrayRef = useRef<string[]>([]);

  const handleToolClick = (targetMode: InteractionMode) => {
      // If target is studio, redirect to GATE first
      if (targetMode === 'studio') {
          setMode('gate');
          setStudioError('');
          setStudioPass('');
          return;
      }

      setMode(targetMode);
      setGameState('select');
      
      if (targetMode === 'veo-lab') {
          setIsVeoUnlocked(false);
          setVeoPass('');
      }
  };

  const handleStudioUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      // Simple gate check. In production, this would verify a token or backend validation.
      if (studioPass.toLowerCase() === 'willwi' || isAdmin) {
          setMode('studio');
          setGameState('select');
      } else {
          setStudioError('代碼錯誤。請確認您已完成支持並獲得代碼。');
      }
  };

  const handleVeoUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      if (veoPass === '20261212') {
          setIsVeoUnlocked(true);
      } else {
          alert("權限拒絕：AI 生成成本極高，僅限授權人員使用。");
      }
  };

  const generateVeoVideo = async () => {
    if (!veoPrompt.trim()) return;
    
    // 1. Mandatory API Key Selection Check
    if (!(await (window as any).aistudio.hasSelectedApiKey())) {
        await (window as any).aistudio.openSelectKey();
        return; 
    }
    
    // 2. Cost Warning
    if (!window.confirm(`【成本警告】\n即將調用 Google Veo 模型生成影片。\n這將會產生 API 費用。\n\n確定繼續嗎？`)) {
        return;
    }

    setIsGeneratingVideo(true);
    setGeneratedVideo(null);
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const modelName = videoModel === 'hq' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
        
        let operation = await ai.models.generateVideos({
            model: modelName,
            prompt: veoPrompt,
            config: {
                numberOfVideos: 1,
                resolution: '720p',
                aspectRatio: '16:9'
            }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.response?.generatedVideos?.[0]?.video?.uri) {
            const downloadLink = operation.response.generatedVideos[0].video.uri;
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const blob = await response.blob();
            setGeneratedVideo(URL.createObjectURL(blob));
        } else {
            throw new Error("No video URI in response");
        }

    } catch (error) {
        console.error("Veo Error:", error);
        alert("生成失敗。請檢查您的 API 配額或帳單狀態。");
    } finally {
        setIsGeneratingVideo(false);
    }
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    if (!song.lyrics) { alert("此歌曲無歌詞數據。"); return; }
    const rawLines = song.lyrics.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lyricsArrayRef.current = ["[ READY ]", ...rawLines, "[ END OF TRACK ]"]; 
    setGameState('ready');
  };

  const startRecording = () => {
      if (!canvasRef.current) return;
      const stream = canvasRef.current.captureStream(60);
      try {
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        recorder.ondataavailable = e => e.data.size > 0 && recordedChunksRef.current.push(e.data);
        recorder.onstop = () => setGameState('finished');
        recorder.start();
        mediaRecorderRef.current = recorder;
        audioRef.current?.play();
        setGameState('playing');
        requestAnimationFrame(loop);
      } catch (e) { setGameState('ready'); }
  };

  const loop = () => {
      drawFrame();
      if (gameState === 'playing') requestAnimationFrame(loop);
  };

  const drawFrame = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;
      const w = canvas.width, h = canvas.height;
      
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      const currLine = lyricsArrayRef.current[lineIndex] || "";
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.font = '900 80px Montserrat';
      ctx.textAlign = 'center';
      ctx.fillText(currLine, w/2, h / 2);
      ctx.restore();

      ctx.fillStyle = '#fbbf24'; ctx.font = '700 20px Montserrat'; ctx.textAlign = 'left';
      ctx.fillText(`WILLWI HANDCRAFTED STUDIO // ${selectedSong.title}`.toUpperCase(), 100, h - 80);
  };

  const downloadProductionPackage = () => {
    if (!selectedSong) return;
    const archiveData = {
        title: selectedSong.title,
        listener_info: { name: listenerName, email: listenerEmail, note: listenerOpinion },
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `WILLWI_STUDIO_${selectedSong.title}.json`; a.click();
    alert("創作參與數據已產出。感謝您的參與！");
  };

  return (
    <div className="max-w-6xl mx-auto pt-24 px-6 pb-40">
        {showPaymentModal && <PaymentModal isOpen={true} onClose={() => setShowPaymentModal(false)} />}
        
        {mode === 'menu' ? (
             <div className="flex flex-col items-center text-center">
                <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-6">Interactive Zone</h2>
                <p className="text-slate-500 text-sm tracking-[0.4em] uppercase mb-16 max-w-2xl leading-loose">
                    支持創作者，體驗手工歌詞同步製作。<br/>
                    <span className="text-[10px] text-slate-600">SUPPORT TO CREATE</span>
                </p>
                <div className="flex flex-col gap-6 w-full max-w-md">
                    <button onClick={() => handleToolClick('studio')} className="w-full py-6 bg-brand-gold text-slate-900 font-black text-xs uppercase tracking-[0.3em] transition-all hover:bg-white shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                        Resonance Sync (NT$ 320)
                    </button>
                    
                    <button onClick={() => setShowPaymentModal(true)} className="w-full py-6 bg-transparent border border-white/10 text-slate-400 font-black text-xs uppercase tracking-[0.3em] transition-all hover:border-brand-gold hover:text-brand-gold">
                        Pure Support (Free Amount)
                    </button>

                    {/* STRICT: HIDE AI FEATURE FOR NON-ADMINS COMPLETELY */}
                    {isAdmin && (
                        <button onClick={() => handleToolClick('veo-lab')} className="w-full py-6 border border-red-500/50 text-red-500/50 font-black text-xs uppercase tracking-[0.3em] transition-all hover:border-red-500 hover:text-red-500 hover:bg-red-500/10">
                            AI Video Lab (ADMIN ONLY)
                        </button>
                    )}
                </div>
             </div>
        ) : mode === 'gate' ? (
            <div className="flex flex-col items-center justify-center animate-fade-in w-full">
                <button onClick={() => setMode('menu')} className="self-start text-[10px] text-slate-500 uppercase tracking-widest mb-10">← Back</button>
                
                <div className="flex flex-col md:flex-row bg-slate-900 border border-white/10 max-w-4xl w-full shadow-2xl relative overflow-hidden">
                    {/* Left: QR & Price */}
                    <div className="w-full md:w-1/2 p-12 bg-white flex flex-col items-center justify-center text-slate-900">
                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-2">Sync License</h3>
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400 mb-8">Single Session Access</p>
                        
                        <div className="w-48 h-48 bg-slate-100 p-2 border-4 border-slate-900 mb-6">
                             <img 
                                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=WILLWI_PAYMENT_320" 
                                className="w-full h-full object-contain"
                                alt="Support QR"
                             />
                        </div>

                        <div className="text-center">
                            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Fixed Price</span>
                            <span className="block text-4xl font-black tracking-tighter mt-1">NT$ 320</span>
                        </div>
                    </div>

                    {/* Right: Input */}
                    <div className="w-full md:w-1/2 p-12 flex flex-col justify-center bg-slate-950 relative">
                        <div className="mb-8">
                             <h4 className="text-white font-black uppercase tracking-[0.2em] mb-4">Step 1: Scan & Pay</h4>
                             <p className="text-[10px] text-slate-500 leading-loose">
                                 請使用支付 App 掃描左側 QR Code。<br/>
                                 支付 NT$ 320 以支持這項功能的開發與維護。
                             </p>
                        </div>
                        <div className="mb-8">
                             <h4 className="text-white font-black uppercase tracking-[0.2em] mb-4">Step 2: Enter Code</h4>
                             <p className="text-[10px] text-slate-500 leading-loose mb-4">
                                 輸入您獲得的存取代碼 (Access Code)。
                             </p>
                             <form onSubmit={handleStudioUnlock} className="space-y-4">
                                <input 
                                    type="password" 
                                    placeholder="ENTER CODE" 
                                    className="w-full bg-black border border-white/20 p-4 text-center text-white tracking-[0.2em] text-xs outline-none focus:border-brand-gold transition-colors"
                                    value={studioPass}
                                    onChange={e => setStudioPass(e.target.value)}
                                />
                                {studioError && <p className="text-red-500 text-[10px] uppercase font-bold tracking-widest">{studioError}</p>}
                                <button className="w-full py-4 bg-brand-gold text-slate-900 font-black uppercase tracking-[0.3em] text-[10px] hover:bg-white transition-all">
                                    Verify & Enter
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        ) : mode === 'veo-lab' ? (
            <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
                <button onClick={() => setMode('menu')} className="self-start text-[10px] text-slate-500 uppercase tracking-widest mb-10">← Back</button>
                
                {!isVeoUnlocked ? (
                    <div className="w-full bg-slate-900/80 p-12 border border-red-600 text-center animate-fade-in shadow-[0_0_50px_rgba(220,38,38,0.1)] relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse"></div>
                        <h3 className="text-3xl font-black text-white uppercase tracking-widest mb-6 flex items-center justify-center gap-3">
                            <span className="text-red-500">⚠</span> 高成本區域
                        </h3>
                        <p className="text-slate-300 text-xs tracking-widest mb-8 leading-loose">
                            此功能調用 Google Veo 模型，每次生成都會產生實際費用。<br/>
                            為防止誤觸與資源濫用，此區域已上鎖。<br/>
                        </p>
                        
                        <form onSubmit={handleVeoUnlock} className="space-y-6 max-w-xs mx-auto">
                            <label className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Access Code</label>
                            <input 
                                type="password" 
                                placeholder="ENTER CODE" 
                                className="w-full bg-black border border-red-900/50 p-4 text-center text-white tracking-[0.5em] font-mono outline-none focus:border-red-500 transition-colors"
                                value={veoPass}
                                onChange={e => setVeoPass(e.target.value)}
                                autoFocus
                            />
                            <button className="w-full py-4 bg-red-900/20 border border-red-900/50 hover:bg-red-600 hover:text-white text-red-500 font-black uppercase text-xs tracking-widest transition-all">
                                解鎖實驗室
                            </button>
                        </form>
                    </div>
                ) : (
                    <div className="w-full space-y-12 animate-fade-in">
                        <div className="bg-slate-900 p-10 border border-brand-accent/20 relative">
                            <button 
                                onClick={() => setIsVeoUnlocked(false)} 
                                className="absolute top-4 right-4 text-[9px] text-slate-600 hover:text-red-500 uppercase font-black tracking-widest"
                            >
                                LOCK CONSOLE
                            </button>

                            <h3 className="text-sm font-black text-brand-accent uppercase tracking-[0.3em] mb-8">AI Cinematic Generation (Veo)</h3>
                            
                            <div className="flex gap-4 mb-6">
                                <button 
                                    onClick={() => setVideoModel('fast')} 
                                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border ${videoModel === 'fast' ? 'bg-brand-accent text-slate-900 border-brand-accent' : 'border-white/10 text-slate-500'}`}
                                >
                                    Fast Preview
                                </button>
                                <button 
                                    onClick={() => setVideoModel('hq')} 
                                    className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border ${videoModel === 'hq' ? 'bg-brand-accent text-slate-900 border-brand-accent' : 'border-white/10 text-slate-500'}`}
                                >
                                    High Quality ($$$)
                                </button>
                            </div>

                            <textarea 
                                placeholder="Describe the scene you want to generate for Willwi's world..."
                                className="w-full bg-black border border-white/10 p-6 text-white text-sm min-h-[150px] outline-none focus:border-brand-accent transition-all"
                                value={veoPrompt}
                                onChange={e => setVeoPrompt(e.target.value)}
                            />
                            <button 
                                onClick={generateVeoVideo}
                                disabled={isGeneratingVideo || !veoPrompt.trim()}
                                className="mt-8 w-full py-6 bg-brand-accent text-slate-950 font-black uppercase tracking-[0.5em] text-xs disabled:opacity-20 hover:bg-white transition-colors"
                            >
                                {isGeneratingVideo ? 'Processing on Cloud...' : 'Generate AI Cinema (Confirm Cost)'}
                            </button>
                        </div>

                        {isGeneratingVideo && (
                            <div className="text-center py-20 space-y-4 animate-pulse bg-black/20 rounded-xl border border-white/5">
                                <p className="text-brand-gold font-black uppercase tracking-[0.4em] text-xs">Generating Video...</p>
                                <p className="text-slate-600 text-[10px] uppercase">Please wait. Do not close this window.</p>
                            </div>
                        )}

                        {generatedVideo && (
                            <div className="bg-black border border-white/10 p-2 shadow-2xl animate-fade-in">
                                <video src={generatedVideo} controls className="w-full aspect-video" />
                                <div className="p-6 flex justify-between items-center">
                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Output: 720p Cinema</span>
                                    <a href={generatedVideo} download="willwi_ai_vision.mp4" className="text-[10px] text-brand-gold uppercase font-black tracking-widest underline">Download Video</a>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        ) : (
            <div className="flex flex-col items-center">
                <button onClick={() => setMode('menu')} className="self-start text-[10px] text-slate-500 uppercase tracking-widest mb-10">← Back</button>
                {gameState === 'select' && (
                    <div className="w-full">
                        <h3 className="text-center text-sm font-black text-brand-gold uppercase tracking-[0.4em] mb-12">Select Track for Lyric Video</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
                            {songs.map(s => (
                                <div key={s.id} onClick={() => handleSelectSong(s)} className="bg-slate-900/40 p-6 border border-white/5 hover:border-brand-gold cursor-pointer transition-all group">
                                    <div className="overflow-hidden mb-4">
                                        <img src={s.coverUrl} className="w-full aspect-square object-cover grayscale group-hover:grayscale-0 transition-all duration-700 transform group-hover:scale-110" alt="" />
                                    </div>
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest truncate">{s.title}</h4>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedSong && gameState !== 'select' && (
                    <div className="w-full flex flex-col items-center">
                        {gameState === 'finished' ? (
                            <div className="w-full max-w-xl bg-slate-900 p-12 border border-brand-gold/20 animate-fade-in text-center">
                                <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-10">Capture Finished / 錄製完成</h3>
                                <div className="space-y-6 mb-12 text-left">
                                    <input placeholder="Your Name" className="w-full bg-black border border-white/10 p-4 text-white text-xs uppercase font-black" value={listenerName} onChange={e => setListenerName(e.target.value)} />
                                    <textarea placeholder="Tell Willwi something about this song..." className="w-full bg-black border border-white/10 p-4 text-white text-xs h-32" value={listenerOpinion} onChange={e => setListenerOpinion(e.target.value)} />
                                </div>
                                <button onClick={downloadProductionPackage} className="w-full py-6 bg-brand-gold text-slate-950 font-black uppercase tracking-[0.5em] text-xs">Export Resonance JSON</button>
                            </div>
                        ) : (
                            <>
                                <div className="mb-12 h-10 flex items-center">
                                    {gameState === 'ready' && <button onClick={() => setGameState('standby')} className="px-12 py-3 bg-white text-black font-black uppercase tracking-widest text-[10px]">Initialize Terminal</button>}
                                    {gameState === 'playing' && <span className="text-brand-gold font-black animate-pulse uppercase tracking-[0.5em] text-xs">Tap Space/Click to Sync Lyrics...</span>}
                                </div>
                                <div className="w-full bg-black border border-white/10 shadow-2xl overflow-hidden aspect-video relative">
                                    <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full cursor-pointer" onClick={() => (gameState === 'playing' ? setLineIndex(p => p+1) : gameState === 'standby' ? startRecording() : null)} />
                                    {gameState === 'standby' && <div className="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer" onClick={startRecording}><span className="text-white font-black uppercase tracking-widest">Click to Start / 按下開始同步</span></div>}
                                </div>
                                {selectedSong.audioUrl && <audio ref={audioRef} src={selectedSong.audioUrl} className="hidden" onEnded={() => setGameState('finished')} />}
                            </>
                        )}
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default Interactive;