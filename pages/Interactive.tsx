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
  | 'cloud-cinema'      // 新增：雲端高畫質製作
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
  // REMOVED: isVeoUnlocked, veoPass (Direct access for admins now)
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

  // --- Keyboard Interaction ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (mode === 'playing') {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault(); // Prevent scrolling
                handleLineClick();
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  // --- Handlers ---

  const handleStudioUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      // 在此處設定後台給予的密碼，例如 'willwi2024'
      if (studioPass.toLowerCase() === 'willwi' || isAdmin) {
          setMode('studio-welcome');
          setStudioError('');
      } else {
          setStudioError('代碼錯誤。請確認您已付款並收到確認信。');
      }
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    if (!song.lyrics) { alert("此歌曲尚未建立歌詞文本，無法進行練習。"); return; }
    
    // Prepare Lyrics
    const rawLines = song.lyrics.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // [ READY ] is index 0. First tap moves to index 1 (First Line).
    lyricsArrayRef.current = ["[ READY ]", ...rawLines, "[ END ]"]; 
    
    // Preload Cover Image for Canvas to avoid flickering/loading issues during record
    if (song.coverUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Important for canvas export
        img.src = song.coverUrl;
        img.onload = () => { bgImageRef.current = img; };
        // If image fails to load, we still proceed but without BG
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
            // Re-connect audio nodes if needed
            if (!audioSourceRef.current) {
                const source = ctx.createMediaElementSource(audioRef.current);
                const dest = ctx.createMediaStreamDestination();
                source.connect(dest);
                source.connect(ctx.destination); // Monitor output
                audioSourceRef.current = source;
                audioDestRef.current = dest;
            }
        } catch (e) {
            console.warn("Audio node connection warning (already connected?):", e);
        }

        // 2. Prepare Streams
        // Capture Video from Canvas
        // Important: Canvas must be visible/rendered for captureStream to work in some browsers
        const canvasStream = (canvasRef.current as any).captureStream(60); 
        const tracks = [...canvasStream.getVideoTracks()];
        
        // Add Audio Track if available
        if (audioDestRef.current) {
            const audioTracks = audioDestRef.current.stream.getAudioTracks();
            if (audioTracks.length > 0) tracks.push(audioTracks[0]);
        }

        const combinedStream = new MediaStream(tracks);

        // 3. Determine Supported MimeType (Prioritize MP4)
        const mimeTypes = [
            'video/mp4', // Safari / Some modern browsers
            'video/webm;codecs=h264,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm'
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
        setLineIndex(0); // Start at [ READY ]
        
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
          // Advance lyric
          setLineIndex(prev => {
              // Don't go past the end
              if (prev < lyricsArrayRef.current.length - 1) {
                  return prev + 1;
              }
              return prev;
          });
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
      
      // 1. Background: Blurred Album Cover
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);

      if (bgImageRef.current) {
          ctx.save();
          // Heavy blur for background
          ctx.filter = 'blur(20px) brightness(0.4)';
          // Fill screen keeping aspect ratio
          const scale = Math.max(w / bgImageRef.current.width, h / bgImageRef.current.height);
          const x = (w / 2) - (bgImageRef.current.width / 2) * scale;
          const y = (h / 2) - (bgImageRef.current.height / 2) * scale;
          ctx.drawImage(bgImageRef.current, x, y, bgImageRef.current.width * scale, bgImageRef.current.height * scale);
          ctx.restore();
      }

      // 2. Lyrics Engine (3 Lines Visible)
      // Visual Config
      const centerY = h / 2 - 50; // Shifted up slightly to make room for cover at bottom
      const lineHeight = 80;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // -- Previous Line --
      if (lineIndex > 0) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '700 32px Montserrat';
          const prevText = lyricsArrayRef.current[lineIndex - 1];
          ctx.fillText(prevText, w/2, centerY - lineHeight);
          ctx.restore();
      }

      // -- Current Line --
      ctx.save();
      const currText = lyricsArrayRef.current[lineIndex] || "";
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      
      // Dynamic scaling for current line based on length
      const fontSize = currText.length > 20 ? 48 : 60;
      ctx.font = `900 ${fontSize}px Montserrat`;
      
      ctx.fillText(currText, w/2, centerY);
      ctx.restore();

      // -- Next Line --
      if (lineIndex < lyricsArrayRef.current.length - 1) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '700 32px Montserrat';
          const nextText = lyricsArrayRef.current[lineIndex + 1];
          ctx.fillText(nextText, w/2, centerY + lineHeight);
          ctx.restore();
      }

      // 3. Bottom Elements: 1:1 Cover & Song Info
      if (bgImageRef.current) {
          const coverSize = 180;
          const coverY = h - coverSize - 80;
          
          // Draw 1:1 Cover with shadow
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 30;
          const coverX = (w / 2) - (coverSize / 2);
          
          // Draw a white border around cover
          ctx.fillStyle = 'white';
          ctx.fillRect(coverX - 2, coverY - 2, coverSize + 4, coverSize + 4);
          
          ctx.drawImage(bgImageRef.current, 0, 0, bgImageRef.current.width, bgImageRef.current.height, coverX, coverY, coverSize, coverSize);
          ctx.restore();

          // Song Title
          ctx.fillStyle = '#fbbf24'; // Brand Gold
          ctx.font = '800 24px Montserrat';
          ctx.fillText(selectedSong.title.toUpperCase(), w/2, coverY + coverSize + 35);

          // Artist / Credits
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '500 14px Montserrat';
          ctx.letterSpacing = '2px';
          const creator = user?.name ? `HANDCRAFTED BY ${user.name}` : 'WILLWI OFFICIAL DB';
          ctx.fillText(creator.toUpperCase(), w/2, coverY + coverSize + 60);
      }

      // 4. Progress Bar (Bottom Edge)
      if (audioRef.current) {
          const progress = audioRef.current.currentTime / audioRef.current.duration || 0;
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(0, h - 6, w * progress, 6);
      }
  };

  const downloadProductionPackage = () => {
    if (recordedChunksRef.current.length === 0) {
        alert("未偵測到錄製數據。");
    } else {
        const mimeType = mediaRecorderRef.current?.mimeType || 'video/mp4';
        // Force .mp4 extension for compatibility, even if browser generates webm/h264
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `WILLWI_HANDCRAFTED_${selectedSong?.title || 'DEMO'}.mp4`;
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
                    {/* Option 1: Resonance Sync */}
                    <button onClick={() => setMode('intro')} className="group relative w-full py-6 bg-slate-900 border border-white/10 hover:border-brand-gold transition-all overflow-hidden">
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-brand-gold font-black text-sm uppercase tracking-[0.3em] mb-2 group-hover:scale-110 transition-transform">Resonance Sync</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest">手工歌詞製作</span>
                        </div>
                        <div className="absolute inset-0 bg-brand-gold/5 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                    </button>

                    {/* Option 2: Pure Support */}
                    <button onClick={() => setMode('pure-support')} className="group relative w-full py-6 bg-transparent border border-white/10 hover:border-white transition-all">
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-white font-black text-sm uppercase tracking-[0.3em] mb-2">Pure Support</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest">單純支持</span>
                        </div>
                    </button>

                    {/* Option 3: Cloud Cinema */}
                    <button onClick={() => setMode('cloud-cinema')} className="group relative w-full py-6 bg-gradient-to-r from-slate-900 to-black border border-white/10 hover:border-brand-accent transition-all">
                        <div className="relative z-10 flex flex-col items-center">
                            <span className="text-brand-accent font-black text-sm uppercase tracking-[0.3em] mb-2">Cloud Cinema</span>
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest">雲端高畫質製作</span>
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

        {/* --- MODE: INTRO (Updated Copy) --- */}
        {mode === 'intro' && (
            <div className="max-w-2xl w-full text-center animate-fade-in space-y-12">
                <div>
                    <h3 className="text-brand-gold text-xs font-black uppercase tracking-[0.5em] mb-6">參與一首歌的方式</h3>
                    <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight mb-8 leading-snug">
                        這不是購買，也不是授權<br/>
                        是一次創作在場的紀錄
                    </h2>
                    <p className="text-slate-400 text-sm leading-loose tracking-widest font-light">
                        此頁面的金額，並非購買任何商品或內容。<br/>
                        這是一種參與創作的行為。<br/><br/>
                        透過參與自己親手製作一支<br/>
                        Willwi 純手工歌詞動態影片<br/><br/>
                        該影片不附帶任何使用權、授權，<br/>
                        僅提供私人觀看連結保存。
                    </p>
                </div>
                
                <div className="pt-12 border-t border-white/5">
                    <button onClick={() => setMode('gate')} className="px-12 py-5 bg-brand-gold text-slate-950 font-black text-xs uppercase tracking-[0.3em] hover:bg-white transition-all shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                        參與創作 (NT$ 320)
                    </button>
                </div>
            </div>
        )}

        {/* --- MODE: GATE (Updated: Hidden QR, PayPal Only) --- */}
        {mode === 'gate' && (
            <div className="max-w-4xl w-full flex flex-col md:flex-row bg-slate-900 border border-white/10 shadow-2xl animate-fade-in">
                <div className="w-full md:w-1/2 bg-white p-12 flex flex-col items-center justify-center text-slate-900">
                    <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Access Ticket</h3>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-8">Single Session</p>
                    
                    {/* QR Code Hidden as requested */}
                    <div className="text-center w-full py-10">
                        <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Entry Fee</span>
                        <span className="block text-5xl font-black tracking-tighter mt-2 mb-8">NT$ 320</span>
                        
                        {/* PAYPAL ONLY */}
                        <a href="https://paypal.me/Willwichen/320TWD" target="_blank" rel="noopener noreferrer" className="block w-full py-4 bg-[#003087] text-white font-bold text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-[#00256b] transition-all transform hover:-translate-y-1">
                            Pay via PayPal
                        </a>
                        <p className="mt-4 text-[9px] text-slate-500 leading-relaxed">
                            付款後請將單據 Email 至 <br/>
                            <span className="font-bold">will@willwi.com</span> <br/>
                            我們將以人工方式回傳通行碼 (Code)
                        </p>
                    </div>
                </div>
                <div className="w-full md:w-1/2 bg-slate-950 p-12 flex flex-col justify-center">
                    <h4 className="text-white font-black uppercase tracking-[0.2em] mb-6">Enter Access Code</h4>
                    
                    {/* Disclaimer Box */}
                    <div className="mb-8 p-4 border border-brand-gold/20 bg-brand-gold/5 text-[10px] text-brand-gold/80 leading-loose">
                        點擊付款，即表示你理解並同意：<br/>
                        ・這不是商品販售<br/>
                        ・不包含任何授權或權利轉移<br/>
                        ・此為一次性的創作參與紀錄
                    </div>

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

        {/* --- MODE: STUDIO WELCOME (Updated Copy) --- */}
        {mode === 'studio-welcome' && (
            <div className="max-w-2xl w-full text-center animate-fade-in py-20">
                <div className="mb-12">
                    <div className="w-16 h-1 bg-brand-gold mx-auto mb-8"></div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-6">實驗場已解鎖</h2>
                    <p className="text-slate-400 text-sm leading-loose tracking-widest">
                        謝謝你選擇參與。<br/>
                        接下來，請您親手完成一支<br/>
                        歌詞時間對齊影片，作為這次參與的紀錄。
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
                            <li>點擊下方按鈕開始，音樂將隨即播放</li>
                            <li>當您感覺歌詞該出現時，請點擊畫面或按空白鍵/Enter</li>
                            <li>第一下點擊將同步第一句歌詞</li>
                            <li>直到 [ END ] 出現，創作即完成</li>
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
            </div>
        )}

        {/* --- MODE: PLAYING --- */}
        {mode === 'playing' && (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-end pb-20 pointer-events-none">
                 <div className="pointer-events-auto">
                     <span className="bg-black/50 text-white px-4 py-2 text-[10px] uppercase tracking-widest backdrop-blur-md border border-white/20 animate-pulse">
                         Tap or Press Space to Sync
                     </span>
                 </div>
                 <div className="mt-8 text-center pointer-events-auto">
                     <p className="text-brand-gold text-xs font-black uppercase tracking-[0.5em]">Recording...</p>
                 </div>
                 {/* Backdrop for playing mode to cover other content */}
                 <div className="fixed inset-0 bg-black -z-10" />
            </div>
        )}

        {/* --- MODE: FINISHED --- */}
        {mode === 'finished' && (
            <div className="max-w-3xl w-full text-center animate-fade-in py-12">
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4">創作完成</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mb-12">Session Completed</p>
                
                {/* 1. STANDARD DOWNLOAD AREA */}
                <div className="bg-slate-900/80 p-10 border border-white/10 mb-16 backdrop-blur-sm">
                    <p className="text-slate-300 text-sm leading-loose tracking-widest font-light mb-8">
                        這支影片，是為這次參與留下的創作紀錄。<br/>
                        它不代表任何權利，也不構成內容授權或轉讓。<br/>
                        謝謝你曾經在這首歌裡。
                    </p>
                    <div className="flex flex-col gap-4 max-w-md mx-auto">
                        <input 
                            placeholder="輸入您的名字 (作為紀錄)" 
                            className="w-full bg-black border border-white/20 p-4 text-center text-white text-xs uppercase tracking-widest outline-none focus:border-brand-gold"
                            value={listenerName}
                            onChange={e => setListenerName(e.target.value)}
                        />
                        <button onClick={downloadProductionPackage} className="w-full py-5 bg-white text-slate-950 font-black text-xs uppercase tracking-[0.3em] hover:bg-brand-gold transition-all">
                            下載成果 (MP4 Video)
                        </button>
                    </div>
                </div>

                <div className="py-8 border-t border-white/5">
                    <button onClick={() => setMode('cloud-cinema')} className="text-slate-500 hover:text-white text-[10px] uppercase tracking-widest transition-colors border border-white/10 px-6 py-3 hover:bg-white/5">
                        Upgrade to Cloud Cinema / 雲端高畫質收藏
                    </button>
                </div>
                
                <button onClick={() => setMode('menu')} className="mt-8 text-slate-500 hover:text-white text-[10px] uppercase tracking-widest transition-colors">
                    Return to Menu
                </button>
            </div>
        )}

        {/* --- MODE: CLOUD CINEMA (Standalone) --- */}
        {mode === 'cloud-cinema' && (
            <div className="max-w-3xl w-full text-center animate-fade-in py-12">
                <div className="relative p-1 border-2 border-brand-accent/20 bg-gradient-to-br from-slate-900 to-black overflow-hidden shadow-[0_0_50px_rgba(56,189,248,0.1)]">
                    
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/10 blur-3xl rounded-full"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-accent/5 blur-3xl rounded-full"></div>
                    
                    <div className="p-10 md:p-14 relative z-10">
                        
                        {/* Header */}
                        <div className="flex flex-col items-center mb-10">
                            <span className="text-brand-accent font-serif italic text-xl mb-2">Cloud Cinema</span>
                            <h3 className="text-white text-3xl font-black uppercase tracking-[0.3em]">
                                雲端高畫質製作
                            </h3>
                            <div className="w-12 h-0.5 bg-brand-accent mt-6"></div>
                        </div>

                        {/* Story / Context */}
                        <div className="text-left md:text-center text-sm text-slate-300 leading-loose tracking-widest space-y-6 font-light max-w-2xl mx-auto mb-10">
                            <p>
                                如果您希望將這份回憶以最高品質保存下來，<br className="hidden md:block"/>
                                我想邀請您收藏這份由我們共同完成的作品。
                            </p>
                            <p>
                                這不只是一支影片，是我們在音樂裡相遇的證明。<br/>
                                我會親自回到工作室，使用原始專案檔，為您重新算圖與輸出。
                            </p>
                        </div>

                        {/* Features List */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 border-y border-white/5 py-8">
                            <div className="text-center space-y-2">
                                <div className="text-brand-accent text-lg">✦</div>
                                <h4 className="text-white text-xs font-bold uppercase tracking-widest">High Definition</h4>
                                <p className="text-[10px] text-slate-500">1080p / 4K 高畫質重製</p>
                            </div>
                            <div className="text-center space-y-2">
                                <div className="text-brand-accent text-lg">✦</div>
                                <h4 className="text-white text-xs font-bold uppercase tracking-widest">Lossless Audio</h4>
                                <p className="text-[10px] text-slate-500">無損音質整合</p>
                            </div>
                            <div className="text-center space-y-2">
                                <div className="text-brand-accent text-lg">✦</div>
                                <h4 className="text-white text-xs font-bold uppercase tracking-widest">Hand-Signed</h4>
                                <p className="text-[10px] text-slate-500">Willwi 專屬親筆簽名 (數位)</p>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div className="flex flex-col items-center mb-10 space-y-6">
                            <div className="flex flex-col md:flex-row justify-center gap-8 md:gap-16">
                                <div className="text-center group cursor-default">
                                    <span className="block text-[10px] text-slate-500 uppercase font-bold mb-2 group-hover:text-brand-accent transition-colors">Single Collection (一部)</span>
                                    <span className="text-3xl font-serif text-white italic">NT$ 2,800</span>
                                </div>
                                <div className="w-px bg-white/10 hidden md:block"></div>
                                <div className="text-center group cursor-default">
                                    <span className="block text-[10px] text-slate-500 uppercase font-bold mb-2 group-hover:text-brand-accent transition-colors">Double Collection (兩部)</span>
                                    <span className="text-3xl font-serif text-white italic">NT$ 5,000</span>
                                </div>
                            </div>
                        </div>

                        {/* Call to Action */}
                        <div className="flex flex-col items-center space-y-6">
                            <a 
                                href="https://paypal.me/Willwichen" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group relative inline-flex items-center gap-4 px-10 py-4 bg-[#003087] text-white font-bold text-xs uppercase tracking-[0.2em] hover:bg-[#00256b] transition-all overflow-hidden shadow-lg hover:shadow-blue-900/30 rounded-sm"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    前往 PayPal 付款
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                </span>
                            </a>
                            
                            <div className="text-center space-y-2">
                                <p className="text-[10px] text-slate-400">
                                    付款後，請將您的「歌名」與「希望署名」寄至：
                                </p>
                                <a href="mailto:will@willwi.com" className="text-brand-accent hover:text-white border-b border-brand-accent/30 pb-0.5 transition-colors text-xs font-mono">
                                    will@willwi.com
                                </a>
                            </div>
                        </div>

                        {/* Disclaimer */}
                        <div className="mt-10 pt-6 border-t border-white/5 text-center">
                             <p className="text-[9px] text-slate-600 leading-relaxed">
                                 * 此費用包含 Willwi 親自重新製作的人力成本、器材使用與雲端空間。<br/>
                                 * 影片成品僅供您個人收藏與非商業用途觀看，不包含任何音樂或影像的商業授權。
                             </p>
                        </div>
                    </div>
                </div>
                
                <button onClick={() => setMode('menu')} className="mt-12 text-slate-500 hover:text-white text-[10px] uppercase tracking-widest transition-colors">
                    Return to Menu
                </button>
            </div>
        )}

        {/* --- MODE: PURE SUPPORT (Updated: Hidden QR, PayPal Only) --- */}
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
                    
                    {/* QR Hidden */}
                    <div className="w-full text-center py-10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 block">Support via PayPal</span>

                        {/* PAYPAL ADDITION */}
                        <a href="https://paypal.me/Willwichen" target="_blank" rel="noopener noreferrer" className="block w-full py-5 bg-[#003087] text-white font-bold text-xs uppercase tracking-[0.2em] text-center shadow-lg hover:bg-[#00256b] transition-all transform hover:-translate-y-1">
                            Pay via PayPal
                        </a>
                    </div>
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

        {/* --- MODE: VEO LAB (NO PASSWORD) --- */}
        {isAdmin && mode === 'veo-lab' && (
             <div className="flex flex-col items-center w-full max-w-3xl mx-auto animate-fade-in">
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
            </div>
        )}

        {/* --- PERSISTENT ELEMENTS --- */}
        {selectedSong && (
            <>
                {/* 
                   KEY CHANGE: 
                   Canvas and Audio must persist in the DOM to avoid breaking MediaRecorder streams.
                   We toggle visibility via CSS opacity/pointer-events instead of unmounting.
                */}
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
                
                <canvas 
                    ref={canvasRef} 
                    width={1280} 
                    height={720} 
                    className={`transition-all duration-500 ${
                        mode === 'playing' 
                            ? 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-6xl aspect-video z-[45] shadow-2xl cursor-pointer opacity-100' 
                            : 'fixed top-0 left-0 opacity-0 pointer-events-none -z-50 w-px h-px'
                    }`}
                    onClick={mode === 'playing' ? handleLineClick : undefined}
                />
            </>
        )}

    </div>
  );
};

export default Interactive;