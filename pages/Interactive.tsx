import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { useData, ASSETS } from '../context/DataContext';
import { Song } from '../types';
import PaymentModal from '../components/PaymentModal';
import { GoogleGenAI } from "@google/genai";

type InteractionMode = 'menu' | 'lyric-maker' | 'ai-director';
type GameState = 'select' | 'ready' | 'standby' | 'playing' | 'processing' | 'finished';

const Interactive: React.FC = () => {
  const { user, login, deductCredit, isAdmin } = useUser();
  const { songs } = useData();
  const [mode, setMode] = useState<InteractionMode>('menu');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [gameState, setGameState] = useState<GameState>('select');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // Audience Inputs
  const [listenerOpinion, setListenerOpinion] = useState('');
  const [listenerName, setListenerName] = useState(user?.name || '');
  const [listenerEmail, setListenerEmail] = useState(user?.email || '');

  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [lineIndex, setLineIndex] = useState(0); 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  const coverImageRef = useRef<HTMLImageElement | null>(null);
  const portraitImageRef = useRef<HTMLImageElement | null>(null);
  const lyricsArrayRef = useRef<string[]>([]);

  const handleToolClick = (targetMode: InteractionMode) => {
      setMode(targetMode);
      setGameState('select');
  };

  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    if (!song.lyrics) { alert("此歌曲無歌詞資料。"); return; }
    const rawLines = song.lyrics.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lyricsArrayRef.current = ["( 準備開始 )", ...rawLines, "( 製作完成 )"]; 
    setGameState('ready');
  };

  const enterStandby = () => {
      if (!selectedSong) return;
      if (!isAdmin && (user?.credits || 0) <= 0) { setShowPaymentModal(true); return; }
      setGameState('standby');
      setLineIndex(0);
      recordedChunksRef.current = [];
      setTimeout(() => drawFrame(), 100);
  };

  const startRecording = () => {
      if (!canvasRef.current) return;
      const canvasStream = canvasRef.current.captureStream(60);
      let stream = canvasStream;
      try {
          if (audioRef.current) {
               const audioStream = (audioRef.current as any).captureStream?.() || (audioRef.current as any).mozCaptureStream?.();
               if (audioStream) stream = new MediaStream([...canvasStream.getTracks(), ...audioStream.getAudioTracks()]);
          }
      } catch (e) {}

      try {
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 });
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
      if (gameState === 'playing') animationFrameRef.current = requestAnimationFrame(loop);
  };

  const drawFrame = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx || !selectedSong) return;
      const w = canvas.width, h = canvas.height;
      
      // 1. Background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, w, h);
      const bgImg = portraitImageRef.current || coverImageRef.current;
      if (bgImg) {
          ctx.save();
          ctx.filter = 'blur(60px) brightness(0.2)';
          const scale = Math.max(w / bgImg.width, h / bgImg.height);
          ctx.drawImage(bgImg, (w - bgImg.width * scale) / 2, (h - bgImg.height * scale) / 2, bgImg.width * scale, bgImg.height * scale);
          ctx.restore();
      }

      // 2. Lyrics (Left)
      const currLine = lyricsArrayRef.current[lineIndex] || "";
      ctx.save();
      ctx.fillStyle = 'white';
      ctx.font = '900 90px Montserrat';
      ctx.shadowColor = 'black'; ctx.shadowBlur = 20;
      ctx.fillText(currLine, 150, h / 2);
      ctx.restore();

      // 3. Cover (Right)
      const coverSize = 600;
      if (coverImageRef.current) {
          ctx.save();
          ctx.shadowColor = 'black'; ctx.shadowBlur = 50;
          const cx = w - coverSize - 150, cy = (h - coverSize) / 2;
          ctx.drawImage(coverImageRef.current, cx, cy, coverSize, coverSize);
          if (selectedSong.coverOverlayText) {
              ctx.translate(cx + coverSize/2, cy + coverSize/2); ctx.rotate(-0.08);
              ctx.textAlign = 'center'; ctx.font = '900 120px Montserrat'; ctx.fillStyle = '#f97316';
              ctx.fillText(selectedSong.coverOverlayText.toUpperCase(), 0, 40);
          }
          ctx.restore();
      }

      // 4. Info
      ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '700 20px Montserrat';
      ctx.fillText(`${selectedSong.title} // WILLWI CATALOG MASTER`.toUpperCase(), 150, h - 100);
  };

  const handleNext = () => {
      if (lineIndex < lyricsArrayRef.current.length - 1) {
          setLineIndex(prev => prev + 1);
          if (lyricsArrayRef.current[lineIndex+1] === "( 製作完成 )") setTimeout(finish, 1000);
      } else finish();
  };

  const finish = () => {
      if (gameState !== 'playing') return;
      setGameState('processing');
      audioRef.current?.pause();
      mediaRecorderRef.current?.stop();
      if (!isAdmin) deductCredit(); 
  };

  const downloadProductionPackage = () => {
    if (!selectedSong) return;

    // 1. Export DB-Ready JSON
    const archiveData = {
        ...selectedSong,
        id: `PROD-${Date.now()}`,
        description: listenerOpinion, // Store opinion here
        listener_info: { name: listenerName, email: listenerEmail },
        archive_date: new Date().toISOString()
    };
    const jsonBlob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const aJson = document.createElement('a');
    aJson.href = jsonUrl;
    aJson.download = `WILLWI_SYNC_${selectedSong.title}.json`;
    aJson.click();

    // 2. Video Download
    const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
    const videoUrl = URL.createObjectURL(videoBlob);
    const aVideo = document.createElement('a');
    aVideo.href = videoUrl;
    aVideo.download = `WILLWI_VIDEO_${selectedSong.title}.webm`;
    aVideo.click();

    alert("製作檔案已下載！您可以將 JSON 檔案提供給管理員進行資料庫更新。");
  };

  useEffect(() => {
    if (selectedSong) {
        const img = new Image(); img.crossOrigin = "anonymous"; img.src = selectedSong.coverUrl;
        img.onload = () => { coverImageRef.current = img; drawFrame(); };
        const portrait = new Image(); portrait.crossOrigin = "anonymous"; portrait.src = ASSETS.willwiPortrait;
        portrait.onload = () => { portraitImageRef.current = portrait; drawFrame(); };
    }
  }, [selectedSong]);

  if (mode === 'menu') {
      return (
        <div className="max-w-4xl mx-auto pt-32 px-6 flex flex-col items-center text-center">
            <h2 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 italic">Interactive Studio</h2>
            <p className="text-slate-500 text-sm tracking-widest uppercase mb-12">參與 Willwi 的音樂製作流程，親手對位歌詞並留下您的觀點。</p>
            <button onClick={() => handleToolClick('lyric-maker')} className="group relative px-16 py-8 bg-slate-900 border border-white/5 hover:border-brand-accent transition-all">
                <div className="text-brand-accent font-black text-xs uppercase tracking-[0.5em] mb-2">Module Alpha</div>
                <div className="text-2xl font-black text-white uppercase tracking-tighter">歌詞影片對位製作</div>
                <div className="mt-4 h-px w-0 group-hover:w-full bg-brand-accent transition-all duration-700"></div>
            </button>
        </div>
      );
  }

  return (
    <div className="max-w-6xl mx-auto pt-12 px-6 pb-32">
        {showPaymentModal && <PaymentModal isOpen={true} onClose={() => setShowPaymentModal(false)} />}
        
        {gameState === 'select' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {songs.map(s => (
                    <div key={s.id} onClick={() => handleSelectSong(s)} className="bg-slate-900 p-4 cursor-pointer hover:border-brand-accent border border-transparent transition-all">
                        <img src={s.coverUrl} className="w-full aspect-square object-cover mb-4" alt="cover" />
                        <h4 className="font-bold text-white text-[11px] uppercase tracking-widest">{s.title}</h4>
                    </div>
                ))}
            </div>
        )}

        {selectedSong && gameState !== 'select' && (
            <div className="flex flex-col items-center">
                {gameState === 'finished' ? (
                    <div className="w-full max-w-2xl bg-slate-900 border border-brand-accent/30 p-12 rounded-lg animate-fade-in shadow-2xl">
                        <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 text-center">製作完成！請填寫最後資訊</h3>
                        
                        <div className="space-y-6 mb-12">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">您的姓名</label>
                                    <input className="w-full bg-black border border-white/10 p-3 text-white text-sm" value={listenerName} onChange={e => setListenerName(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">聯繫信箱</label>
                                    <input className="w-full bg-black border border-white/10 p-3 text-white text-sm" value={listenerEmail} onChange={e => setListenerEmail(e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">對這部作品的意見與感受 (將帶入資料庫)</label>
                                <textarea className="w-full bg-black border border-white/10 p-4 text-white text-sm h-32" placeholder="寫下您的看法..." value={listenerOpinion} onChange={e => setListenerOpinion(e.target.value)} />
                            </div>
                        </div>

                        <button onClick={downloadProductionPackage} className="w-full py-6 bg-brand-accent text-slate-950 font-black uppercase tracking-[0.4em] text-xs hover:bg-white transition-all shadow-[0_0_30px_rgba(56,189,248,0.3)]">
                            下載完整資料包 (含同步 JSON / 影片)
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-10 text-center h-20">
                            {gameState === 'ready' && <button onClick={enterStandby} className="px-16 py-4 border border-brand-accent text-brand-accent font-black uppercase tracking-[0.4em] text-xs hover:bg-brand-accent hover:text-black transition-all">進入錄製間</button>}
                            {gameState === 'standby' && <div className="text-white font-black animate-pulse tracking-[0.3em] cursor-pointer" onClick={startRecording}>[ 點擊畫面或按空格鍵開始對歌詞 ]</div>}
                            {gameState === 'playing' && <div className="text-red-500 font-black animate-pulse tracking-[0.4em]">● 正在錄製：按空格鍵切換下一句歌詞</div>}
                            {gameState === 'processing' && <div className="text-brand-accent font-black animate-pulse tracking-[0.4em]">正在封裝高畫質檔案...</div>}
                        </div>
                        <div className="w-full border border-white/10 shadow-2xl bg-black rounded-xl overflow-hidden">
                            <canvas ref={canvasRef} width={1920} height={1080} className="w-full cursor-pointer" onClick={() => (gameState === 'playing' ? handleNext() : gameState === 'standby' ? startRecording() : null)} />
                        </div>
                        {selectedSong.audioUrl && <audio ref={audioRef} src={selectedSong.audioUrl} crossOrigin="anonymous" className="hidden" />}
                    </>
                )}
            </div>
        )}
    </div>
  );
};

export default Interactive;