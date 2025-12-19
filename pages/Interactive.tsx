import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData } from '../context/DataContext';
import { Song } from '../types';
import { GoogleGenAI } from "@google/genai";

// 狀態定義
type InteractionMode = 
  | 'menu'              // 首頁選單
  | 'intro'             // 模組 1 & 2：說明與定義
  | 'gate'              // 掃碼與解鎖
  | 'studio-welcome'    // 模組 3：成功進入
  | 'select'            // 模組 4：選曲
  | 'tool-start'        // 模組 5 & 6：工具啟動前引導
  | 'playing'           // 錄製中
  | 'finished'          // 模組 7 & 8：完成與下載
  | 'pure-support'      // 單純支持頁面
  | 'support-thanks'    // 支持感謝頁
  | 'veo-lab';          // 管理員專用 AI 實驗室

const Interactive: React.FC = () => {
  const { user, isAdmin } = useUser();
  const { songs } = useData();
  
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // Studio Gate State
  const [studioPass, setStudioPass] = useState('');
  const [studioError, setStudioError] = useState('');

  // Veo State
  const [veoPass, setVeoPass] = useState('');
  const [isVeoUnlocked, setIsVeoUnlocked] = useState(false);
  const [veoPrompt, setVeoPrompt] = useState('');
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoModel, setVideoModel] = useState<'fast' | 'hq'>('fast');

  // Archive Data
  const [listenerName, setListenerName] = useState(user?.name || '');

  // Refs
  const [lineIndex, setLineIndex] = useState(0); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const lyricsArrayRef = useRef<string[]>([]);
  
  // Audio Context Refs (For mixing audio into video)
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  // Background Image Ref (Preloaded)
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  
  // Animation Ref
  const animationFrameRef = useRef<number>(0);

  // --- Handlers ---

  const handleStudioUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      if (studioPass.toLowerCase() === 'willwi' || isAdmin) {
          setMode('studio-welcome');
          setStudioError('');
      } else {
          setStudioError('代碼錯誤。請確認您已完成支持並獲得通行碼。');
      }
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    if (!song.lyrics) { alert("此歌曲尚未建立歌詞文本，無法進行練習。"); return; }
    
    // Prepare Lyrics
    const rawLines = song.lyrics.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lyricsArrayRef.current = ["[ READY ]", ...rawLines, "[ END ]"]; 
    
    // Preload Cover Image for Canvas to avoid flickering/loading issues during record
    if (song.coverUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Important for canvas export
        img.src = song.coverUrl;
        bgImageRef.current = img;
    } else {
        bgImageRef.current = null;
    }

    setMode('tool-start');
  };

  const startRecording = async () => {
      if (!canvasRef.current || !audioRef.current || !selectedSong) return;
      
      try {
        // 1. Setup Audio Context & Mix
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') await ctx.resume();

        try {
            if (!audioSourceRef.current) {
                const source = ctx.createMediaElementSource(audioRef.current);
                const dest = ctx.createMediaStreamDestination();
                source.connect(dest);
                source.connect(ctx.destination); // Monitor output
                audioSourceRef.current = source;
                audioDestRef.current = dest;
            }
        } catch (e) {
            console.warn("Audio node connection warning:", e);
        }

        // 2. Prepare Streams
        // Capture Video from Canvas
        const canvasStream = (canvasRef.current as any).captureStream(60); 
        const tracks = [...canvasStream.getVideoTracks()];
        
        // Add Audio Track if available
        if (audioDestRef.current) {
            const audioTracks = audioDestRef.current.stream.getAudioTracks();
            if (audioTracks.length > 0) tracks.push(audioTracks[0]);
        }

        const combinedStream = new MediaStream(tracks);

        // 3. Determine Supported MimeType
        const mimeTypes = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=h264,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ];
        const selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
        const options = selectedMime ? { mimeType: selectedMime, videoBitsPerSecond: 8000000 } : { videoBitsPerSecond: 8000000 };
        
        const recorder = new MediaRecorder(combinedStream, options);
        
        recordedChunksRef.current = [];
        recorder.ondataavailable = e => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        
        recorder.onstop = () => {
            setMode('finished');
            cancelAnimationFrame(animationFrameRef.current);
        };

        // 4. Start
        setMode('playing');
        setLineIndex(0);
        
        recorder.start();
        mediaRecorderRef.current = recorder;
        
        await audioRef.current.play();
        loop();

      } catch (e) { 
        console.error("Recording Start Failed:", e);
        alert("錄製初始化遭遇問題 (可能為瀏覽器相容性或權限)。將切換至無錄影模式。");
        setMode('playing');
        setLineIndex(0);
        audioRef.current.play();
        loop();
      }
  };

  const handleLineClick = () => {
      if (mode === 'playing') {
          setLineIndex(prev => prev + 1);
      } else if (mode === 'tool-start') {
          startRecording();
      }
  };

  const loop = () => {
      drawFrame();
      
      const audio = audioRef.current;
      if (audio && !audio.paused && !audio.ended) {
          animationFrameRef.current = requestAnimationFrame(loop);
      } else if (audio?.ended) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              mediaRecorderRef.current.stop();
          } else if (mode === 'playing') {
              setMode('finished');
          }
      }
  };

  const drawFrame = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;

      const w = canvas.width, h = canvas.height;
      const time = Date.now();
      
      // 1. Background (Strictly Album Cover)
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current) {
          ctx.save();
          // Darken background for legibility
          ctx.globalAlpha = 0.3;
          ctx.filter = 'blur(15px) grayscale(30%)';
          
          // Center crop logic
          const scale = Math.max(w / bgImageRef.current.width, h / bgImageRef.current.height);
          const x = (w / 2) - (bgImageRef.current.width / 2) * scale;
          const y = (h / 2) - (bgImageRef.current.height / 2) * scale;
          ctx.drawImage(bgImageRef.current, x, y, bgImageRef.current.width * scale, bgImageRef.current.height * scale);
          ctx.restore();
      }

      // 2. Lyrics - Vertical Upward Motion
      const currLine = lyricsArrayRef.current[lineIndex] || "";
      
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Motion Calculation: Subtle float upward
      // We simulate a continuous upward drift for "life"
      const floatY = (time / 50) % 10; 
      
      // Main Text
      ctx.fillStyle = 'white';
      ctx.font = '900 64px Montserrat';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 30;
      
      // Position: Center with slight upward motion bias
      ctx.fillText(currLine, w/2, h/2 - floatY);
      
      // Optional: Show previous line fading out above
      if (lineIndex > 0) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '700 40px Montserrat';
          ctx.fillText(lyricsArrayRef.current[lineIndex - 1], w/2, h/2 - 120 - floatY);
      }
      
      ctx.restore();

      // 3. Watermark / UI
      ctx.fillStyle = '#fbbf24'; 
      ctx.font = '700 20px Montserrat'; 
      ctx.textAlign = 'left';
      ctx.fillText(`HANDCRAFTED BY ${user?.name || 'GUEST'} // ${selectedSong.title}`.toUpperCase(), 50, h - 50);

      // Progress bar
      if (audioRef.current) {
          const progress = audioRef.current.currentTime / audioRef.current.duration;
          ctx.fillStyle = 'rgba(255,255,255,0.1)';
          ctx.fillRect(0, h - 10, w, 10);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(0, h - 10, w * progress, 10);
      }
  };

  const downloadProductionPackage = () => {
    if (recordedChunksRef.current.length === 0) {
        alert("未偵測到錄製數據。");
    } else {
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/webm';
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WILLWI_HANDCRAFTED_${selectedSong?.title || 'DEMO'}.${ext}`;
        a.click();
    }
    
    // JSON Archive
    const archiveData = {
        title: selectedSong?.title,
        creator_note: "User Handcrafted Session",
        timestamp: new Date().toISOString(),
        listener_info: {
            name: listenerName,
            id: user?.email || 'anonymous'
        }
    };
    const jsonBlob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const aj = document.createElement('a');
    aj.href = jsonUrl;
    aj.download = `WILLWI_LOG_${selectedSong?.title || 'DEMO'}.json`;
    aj.click();
  };

  // --- Veo Admin Functions ---
  const handleVeoUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      if (veoPass === '20261212') setIsVeoUnlocked(true);
      else alert("權限拒絕");
  };

  const generateVeoVideo = async () => {
    if (!veoPrompt.trim()) return;
    if (!(await (window as any).aistudio.hasSelectedApiKey())) { await (window as any).aistudio.openSelectKey(); return; }
    if (!window.confirm(`【成本警告】API計費確認。`)) return;

    setIsGeneratingVideo(true);
    setGeneratedVideo(null);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const modelName = videoModel === 'hq' ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
        let operation = await ai.models.generateVideos({ model: modelName, prompt: veoPrompt, config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' } });
        while (!operation.done) { await new Promise(resolve => setTimeout(resolve, 10000)); operation = await ai.operations.getVideosOperation({ operation: operation }); }
        if (operation.response?.generatedVideos?.[0]?.video?.uri) {
            const downloadLink = operation.response.generatedVideos[0].video.uri;
            const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
            const blob = await response.blob();
            setGeneratedVideo(URL.createObjectURL(blob));
        }
    } catch (error) { console.error(error); alert("生成失敗"); } finally { setIsGeneratingVideo(false); }
  };

  // --- RENDER ---

  return (
    <div className="max-w-6xl mx-auto pt-24 px-6 pb-40 min-h-screen flex flex-col items-center">
        
        {/* TOP NAV */}
        {mode !== 'menu' && mode !== 'playing' && (
             <button onClick={() => setMode('menu')} className="self-start text-[10px] text-slate-500 hover:text-white uppercase tracking-widest mb-10 transition-colors">
                 ← Back to Menu
             </button>
        )}

        {/* --- MODE: MENU --- */}
        {mode === 'menu' && (
            <div className="flex flex-col items-center text-center animate-fade-in">
                <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter mb-8">Creative Field</h2>
                <p className="text-slate-500 text-xs tracking-[0.4em] uppercase mb-20 max-w-xl leading-loose">
                    這裡不是商店，而是創作實驗場。<br/>
                    選擇你的參與方式。
                </p>
                
                <div className="flex flex-col gap-8 w-full max-w-sm">
                    <button onClick={() => setMode('intro')} className="group relative w-full py-6 bg-slate-900 border border-white/10 hover:border-brand-gold transition-all overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-brand-gold font-black text-sm uppercase tracking-[0.3em] mb-2 group-hover:scale-110 transition-transform">Resonance Sync</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest">進入手工歌詞製作 (需支持)</span>
                        </div>
                        <div className="absolute inset-0 bg-brand-gold/5 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </button>

                    <button onClick={() => setMode('pure-support')} className="group relative w-full py-6 bg-transparent border border-white/10 hover:border-white transition-all">
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-white font-black text-sm uppercase tracking-[0.3em] mb-2">Pure Support</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest">單純支持 (不參與製作)</span>
                        </div>
                    </button>

                    {isAdmin && (
                        <button onClick={() => setMode('veo-lab')} className="mt-8 py-4 border border-red-900/30 text-red-900 hover:text-red-500 hover:border-red-500 text-[9px] font-black uppercase tracking-[0.3em] transition-all">
                            [ADMIN] AI Video Lab
                        </button>
                    )}
                </div>
            </div>
        )}

        {/* --- MODE: INTRO --- */}
        {mode === 'intro' && (
            <div className="max-w-2xl w-full text-center animate-fade-in space-y-12">
                <div>
                    <h3 className="text-brand-gold text-xs font-black uppercase tracking-[0.5em] mb-6">關於參與</h3>
                    <h2 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-8">這不是購買作品</h2>
                    <p className="text-slate-400 text-sm leading-loose tracking-widest font-light">
                        這也不是委託他人製作。<br/><br/>
                        這是一個讓你親手完成歌詞影片的創作實驗場。<br/>
                        你將會進入一個已準備好素材的環境：<br/>
                        <span className="block mt-4 text-white">
                        ・ 原創音檔 (作為創作練習素材)<br/>
                        ・ 已整理完成的歌詞文本<br/>
                        ・ 一個手工對齊歌詞的操作介面<br/>
                        </span>
                        <br/>
                        創作的每一個動作，都將由你親自完成。
                    </p>
                </div>
                
                <div className="pt-12 border-t border-white/5">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">
                        參與金額為一次性進場門票，<br/>用於解鎖創作實驗場之使用權限。<br/>
                        此行為不包含任何作品授權、不構成商品購買或服務交付。
                    </p>
                    <button onClick={() => setMode('gate')} className="px-12 py-5 bg-brand-gold text-slate-950 font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                        解鎖創作實驗場 (NT$ 320)
                    </button>
                </div>
            </div>
        )}

        {/* --- MODE: GATE --- */}
        {mode === 'gate' && (
            <div className="max-w-4xl w-full flex flex-col md:flex-row bg-slate-900 border border-white/10 shadow-2xl animate-fade-in">
                <div className="w-full md:w-1/2 bg-white p-12 flex flex-col items-center justify-center text-slate-900">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Access Ticket</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-8">Single Session</p>
                    <div className="w-48 h-48 bg-slate-100 p-2 border-4 border-slate-900 mb-6">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=WILLWI_PAYMENT_320" className="w-full h-full object-contain" alt="QR" />
                    </div>
                    <div className="text-center">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Entry Fee</span>
                        <span className="block text-4xl font-black tracking-tighter mt-1">NT$ 320</span>
                    </div>
                </div>
                <div className="w-full md:w-1/2 bg-slate-950 p-12 flex flex-col justify-center">
                    <h4 className="text-white font-black uppercase tracking-[0.2em] mb-6">Enter Access Code</h4>
                    <p className="text-[10px] text-slate-500 leading-loose mb-8">
                        請掃描左側 QR Code 進行支持。<br/>
                        完成後，輸入您獲得的通行碼 (Access Code)。
                    </p>
                    <form onSubmit={handleStudioUnlock} className="space-y-4">
                        <input 
                            type="password" 
                            placeholder="CODE" 
                            className="w-full bg-black border border-white/20 p-4 text-center text-white tracking-[0.3em] text-sm outline-none focus:border-brand-gold transition-colors"
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
        )}

        {/* --- MODE: STUDIO WELCOME --- */}
        {mode === 'studio-welcome' && (
            <div className="max-w-2xl w-full text-center animate-fade-in py-20">
                <div className="mb-12">
                    <div className="w-16 h-1 bg-brand-gold mx-auto mb-8"></div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-6">實驗場已解鎖</h2>
                    <p className="text-slate-400 text-sm leading-loose tracking-widest">
                        你已成功進入創作實驗場。<br/><br/>
                        接下來，請選擇一首你想參與的作品。<br/>
                        系統將會為你準備該作品的音檔與歌詞素材，<br/>
                        並引導你完成手工對齊。
                    </p>
                </div>
                <button onClick={() => setMode('select')} className="px-12 py-5 border border-white/20 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white hover:text-black transition-all">
                    前往選曲 (Select Work)
                </button>
            </div>
        )}

        {/* --- MODE: SELECT --- */}
        {mode === 'select' && (
            <div className="w-full animate-fade-in">
                <h3 className="text-center text-sm font-black text-brand-gold uppercase tracking-[0.4em] mb-12">Select Material</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
                    {songs.map(s => (
                        <div key={s.id} onClick={() => handleSelectSong(s)} className="bg-slate-900/40 p-6 border border-white/5 hover:border-brand-gold cursor-pointer transition-all group">
                            <div className="overflow-hidden mb-4 aspect-square bg-slate-800">
                                <img src={s.coverUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 opacity-60 group-hover:opacity-100" alt="" />
                            </div>
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest truncate">{s.title}</h4>
                            <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                載入素材...
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- MODE: TOOL START --- */}
        {mode === 'tool-start' && selectedSong && (
            <div className="max-w-4xl w-full flex flex-col items-center animate-fade-in">
                <div className="w-full aspect-video bg-black border border-white/10 mb-8 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-30 bg-cover bg-center grayscale" style={{backgroundImage: `url(${selectedSong.coverUrl})`}}></div>
                    <div className="relative z-10 text-center space-y-6 bg-black/80 p-12 backdrop-blur-sm border border-white/10">
                        <h3 className="text-xl font-black text-white uppercase tracking-[0.3em]">準備開始你的創作</h3>
                        <div className="text-left space-y-2 text-[10px] text-slate-400 font-mono tracking-widest border-l border-brand-gold pl-4 py-2">
                            <p>✓ 音檔素材載入 ({selectedSong.title})</p>
                            <p>✓ 歌詞文本載入</p>
                            <p>✓ 手工介面就緒</p>
                        </div>
                        <p className="text-xs text-white leading-loose tracking-widest">
                            接下來的所有對齊動作，將由你親自完成。
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                    <div className="bg-slate-900 p-6 border border-white/5">
                        <h4 className="text-brand-gold text-[10px] font-black uppercase tracking-widest mb-4">操作指引</h4>
                        <ul className="text-[10px] text-slate-400 space-y-3 leading-relaxed list-disc list-inside">
                            <li>播放音檔，聆聽旋律與節奏</li>
                            <li>當你感覺一句歌詞「剛好出現的時刻」，請點擊畫面</li>
                            <li>系統將記錄你每一次的選擇</li>
                            <li>完成所有歌詞後，即完成本次對齊</li>
                        </ul>
                    </div>
                    <div className="flex flex-col justify-center items-center text-center p-6 border border-white/5 bg-slate-900/50">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-6">
                            不需要追求完美，<br/>這是一段創作練習，而不是考試。
                        </p>
                        <button onClick={startRecording} className="px-8 py-4 bg-white text-black font-black text-xs uppercase tracking-[0.3em] hover:bg-brand-gold transition-all">
                            開始創作 (Start Session)
                        </button>
                    </div>
                </div>
                
                {/* Audio with KEY to force re-mount on song change and ensure clean state */}
                {selectedSong.audioUrl && (
                    <audio 
                        ref={audioRef} 
                        src={selectedSong.audioUrl} 
                        crossOrigin="anonymous" 
                        key={selectedSong.id} 
                        className="hidden" 
                        onEnded={() => {
                            if (mediaRecorderRef.current?.state === 'recording') {
                                mediaRecorderRef.current.stop();
                            } else if (mode === 'playing') {
                                setMode('finished');
                            }
                        }}
                    />
                )}
                <canvas ref={canvasRef} width={1280} height={720} className="hidden" />
            </div>
        )}

        {/* --- MODE: PLAYING --- */}
        {mode === 'playing' && (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
                 <div className="w-full max-w-6xl aspect-video bg-slate-900 relative shadow-2xl cursor-pointer group" onClick={handleLineClick}>
                     <canvas ref={canvasRef} width={1280} height={720} className="w-full h-full" />
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="bg-black/50 text-white px-4 py-2 text-[10px] uppercase tracking-widest backdrop-blur-md border border-white/20">
                             Tap / Click to Sync Next Line
                         </span>
                     </div>
                 </div>
                 <div className="mt-8 text-center">
                     <p className="text-brand-gold text-xs font-black uppercase tracking-[0.5em] animate-pulse">Recording Session Active</p>
                     <p className="text-slate-600 text-[10px] mt-2 uppercase tracking-widest">Listening: {selectedSong?.title}</p>
                 </div>
            </div>
        )}

        {/* --- MODE: FINISHED --- */}
        {mode === 'finished' && (
            <div className="max-w-2xl w-full text-center animate-fade-in py-12">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">創作完成</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-12">Session Completed</p>
                
                <div className="bg-slate-900 p-10 border border-white/10 mb-12">
                    <p className="text-slate-300 text-sm leading-loose tracking-widest font-light mb-8">
                        這是一支由你親手完成的歌詞影片。<br/>
                        它是一段屬於你的創作練習紀錄。<br/>
                        你可以下載或保存此檔案，作為這次參與的留存。
                    </p>
                    <div className="flex flex-col gap-4">
                        <input 
                            placeholder="Enter Your Name for Credits" 
                            className="w-full bg-black border border-white/20 p-4 text-center text-white text-xs uppercase tracking-widest outline-none focus:border-brand-gold"
                            value={listenerName}
                            onChange={e => setListenerName(e.target.value)}
                        />
                        <button onClick={downloadProductionPackage} className="w-full py-5 bg-brand-gold text-slate-950 font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all">
                            下載成果 (Download MP4 & JSON)
                        </button>
                    </div>
                </div>
                
                <button onClick={() => setMode('menu')} className="text-slate-500 hover:text-white text-[10px] uppercase tracking-widest">
                    Return to Menu
                </button>
            </div>
        )}

        {/* --- MODE: PURE SUPPORT --- */}
        {mode === 'pure-support' && (
            <div className="max-w-4xl w-full flex flex-col md:flex-row bg-slate-900 border border-white/10 shadow-2xl animate-fade-in">
                <div className="w-full md:w-1/2 bg-slate-950 p-12 flex flex-col justify-center">
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Pure Support</h3>
                    <p className="text-slate-400 text-xs leading-loose tracking-widest mb-8">
                        如果你只是想支持我的創作，<br/>
                        而不是參與任何互動流程，<br/>
                        你可以選擇在這裡完成支持。<br/><br/>
                        <span className="text-[10px] text-slate-600">
                        這個支持不包含：<br/>
                        創作參與、工具使用、內容取得、成果輸出。<br/>
                        它只是一份心意，讓我能繼續把音樂與系統好好做完。
                        </span>
                    </p>
                    <button onClick={() => setMode('support-thanks')} className="mt-8 py-4 border border-white/20 text-white hover:bg-white hover:text-black transition-all text-[10px] font-black uppercase tracking-[0.2em]">
                        我已完成支持 (Confirm)
                    </button>
                </div>
                <div className="w-full md:w-1/2 bg-white p-12 flex flex-col items-center justify-center text-slate-900">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-8">Flexible Amount</p>
                    <div className="w-48 h-48 bg-slate-100 p-2 border-4 border-slate-900 mb-6">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=WILLWI_PURE_SUPPORT" className="w-full h-full object-contain" alt="QR" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Scan to Support</span>
                </div>
            </div>
        )}

        {/* --- MODE: SUPPORT THANKS --- */}
        {mode === 'support-thanks' && (
            <div className="max-w-xl w-full text-center animate-fade-in py-20">
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-6">Thank You.</h2>
                <p className="text-slate-400 text-sm leading-loose tracking-widest mb-12">
                    已收到你的支持。<br/>
                    謝謝你把這份心意，留給創作本身。
                </p>
                <button onClick={() => setMode('menu')} className="px-12 py-4 border border-white/10 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">
                    Return
                </button>
            </div>
        )}

        {/* --- MODE: VEO LAB --- */}
        {isAdmin && mode === 'veo-lab' && (
             <div className="flex flex-col items-center w-full max-w-3xl mx-auto animate-fade-in">
                {!isVeoUnlocked ? (
                    <div className="w-full bg-slate-900/80 p-12 border border-red-600 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-600 animate-pulse"></div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-6">Admin Verification</h3>
                        <form onSubmit={handleVeoUnlock} className="space-y-6 max-w-xs mx-auto">
                            <input type="password" placeholder="CODE" className="w-full bg-black border border-red-900/50 p-4 text-center text-white tracking-[0.5em] outline-none" value={veoPass} onChange={e => setVeoPass(e.target.value)} />
                            <button className="w-full py-4 bg-red-900/20 text-red-500 font-black uppercase text-xs tracking-widest">Unlock</button>
                        </form>
                    </div>
                ) : (
                    <div className="w-full bg-slate-900 p-10 border border-brand-accent/20">
                        <h3 className="text-sm font-black text-brand-accent uppercase tracking-[0.3em] mb-8">AI Cinematic Generation (Veo)</h3>
                        <div className="flex gap-4 mb-6">
                             <button onClick={() => setVideoModel('fast')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border ${videoModel === 'fast' ? 'bg-brand-accent text-black' : 'text-slate-500'}`}>Fast</button>
                             <button onClick={() => setVideoModel('hq')} className={`px-4 py-2 text-[9px] font-black uppercase tracking-widest border ${videoModel === 'hq' ? 'bg-brand-accent text-black' : 'text-slate-500'}`}>HQ ($$$)</button>
                        </div>
                        <textarea placeholder="Prompt..." className="w-full bg-black border border-white/10 p-6 text-white text-sm min-h-[150px] outline-none focus:border-brand-accent" value={veoPrompt} onChange={e => setVeoPrompt(e.target.value)} />
                        <button onClick={generateVeoVideo} disabled={isGeneratingVideo || !veoPrompt.trim()} className="mt-8 w-full py-6 bg-brand-accent text-slate-950 font-black uppercase tracking-[0.5em] text-xs hover:bg-white">{isGeneratingVideo ? 'Generating...' : 'Generate (Cost Apply)'}</button>
                        {generatedVideo && <div className="mt-8"><video src={generatedVideo} controls className="w-full aspect-video" /></div>}
                    </div>
                )}
            </div>
        )}

    </div>
  );
};

export default Interactive;