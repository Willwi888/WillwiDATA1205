
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';
import { useUser } from '../context/UserContext';
import { Song } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import { generateAiVideo } from '../services/geminiService';
import PaymentModal from '../components/PaymentModal';
import { useToast } from '../components/Layout';

type InteractionMode = 'intro' | 'select' | 'philosophy' | 'gate' | 'playing' | 'mastered' | 'rendering' | 'finished';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { isAdmin } = useUser();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  
  const [lyricsLines, setLyricsLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [renderProgress, setRenderProgress] = useState(0);
  const [bgVideoUrl, setBgVideoUrl] = useState<string | null>(null);
  const [stamps, setStamps] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.state?.targetSongId) {
        const s = songs.find(x => x.id === location.state.targetSongId);
        if (s) { setSelectedSong(s); setMode('philosophy'); }
    }
  }, [location.state, songs]);

  useEffect(() => {
    if (selectedSong?.lyrics) {
        setLyricsLines(selectedSong.lyrics.split('\n').filter(l => l.trim().length > 0));
    }
    setCurrentLineIndex(-1);
    setStamps([]);
  }, [selectedSong]);

  // 點擊歌詞對時邏輯
  const handleLyricClick = (index: number) => {
    if (mode !== 'playing' || isPaused || !audioRef.current) return;
    
    const now = audioRef.current.currentTime;
    // 只有按順序點擊才有效，或者管理者可以自由調整
    if (index === currentLineIndex + 1 || isAdmin) {
        const newStamps = [...stamps];
        newStamps[index] = now;
        setStamps(newStamps);
        setCurrentLineIndex(index);
    }
  };

  const handleTogglePlay = () => {
      if (!audioRef.current) return;
      if (isPaused) {
          audioRef.current.play();
          setIsPaused(false);
          if (currentLineIndex === -1) setCurrentLineIndex(0);
      } else {
          audioRef.current.pause();
          setIsPaused(true);
      }
  };

  const startExportProcess = async () => {
      // @ts-ignore
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
          // @ts-ignore
          await window.aistudio.openSelectKey();
      }

      setMode('rendering');
      setRenderProgress(10);
      
      try {
          const imgResponse = await fetch(selectedSong?.coverUrl || '');
          const blob = await imgResponse.blob();
          const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
          });
          
          setRenderProgress(40);
          const aiBg = await generateAiVideo(base64, selectedSong?.title || 'Unknown');
          
          if (aiBg) {
              setRenderProgress(100);
              setBgVideoUrl(aiBg);
              setMode('finished');
              showToast("氛圍底層渲染成功 - AI 已退至背景");
          } else {
              throw new Error("Render failed");
          }
      } catch (e) {
          showToast("渲染超時或失敗，請檢查金鑰狀態", "error");
          setMode('mastered');
      }
  };

  const currentAudioSrc = useMemo(() => {
      if (!selectedSong) return '';
      return resolveDirectLink(selectedSong.audioUrl || selectedSong.dropboxUrl || '');
  }, [selectedSong]);

  return (
    <div className={`min-h-screen flex flex-col pt-24 pb-32 relative overflow-hidden transition-colors duration-700 ${mode === 'playing' ? 'bg-white' : 'bg-[#020617]'}`}>
      
      {/* 只有非播放模式才顯示動態模糊背景 */}
      {mode !== 'playing' && (
        <div className="fixed inset-0 z-0 overflow-hidden">
            {bgVideoUrl ? (
                <video src={bgVideoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover blur-sm opacity-50" />
            ) : (
                <img src={selectedSong?.coverUrl || ''} className="w-full h-full object-cover blur-[100px] scale-125 opacity-10 animate-studio-breathe" alt="" />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black"></div>
        </div>
      )}

      {/* Intro & Select & Philosophy 模式保持暗色系 */}
      {(mode === 'intro' || mode === 'select' || mode === 'philosophy') && (
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-10 animate-fade-in">
           {mode === 'intro' && (
               <div className="max-w-4xl mx-auto text-center space-y-12">
                   <h2 className="text-brand-gold font-black uppercase tracking-[1em] text-sm">{t('manifesto_title')}</h2>
                   <div className="text-2xl md:text-4xl font-bold leading-relaxed tracking-widest text-slate-200">
                       {t('manifesto_content').split('\n').map((s, i) => <React.Fragment key={i}>{s}<br/></React.Fragment>)}
                   </div>
                   <button onClick={() => setMode('select')} className="w-full py-16 bg-white text-black font-black uppercase tracking-[0.5em] text-2xl rounded-sm hover:bg-brand-gold transition-all shadow-2xl">
                       {t('btn_start_studio')}
                   </button>
               </div>
           )}

           {mode === 'select' && (
               <div className="w-full max-w-6xl mx-auto py-10">
                   <h2 className="text-4xl font-black uppercase tracking-[0.4em] mb-12 border-b border-white/10 pb-6 text-white">Recording Vault</h2>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {songs.filter(s => s.isInteractiveActive || isAdmin).map(song => (
                           <div key={song.id} onClick={() => { setSelectedSong(song); setMode('philosophy'); }} className="group cursor-pointer bg-slate-900/40 p-10 rounded-sm border border-white/20 hover:border-brand-gold transition-all flex items-center gap-10">
                               <img src={song.coverUrl} className="w-32 h-32 object-cover shadow-2xl" alt="" />
                               <div className="text-left">
                                 <h4 className="text-2xl font-black uppercase tracking-widest text-white group-hover:text-brand-gold">{song.title}</h4>
                                 <span className="text-[11px] text-brand-gold font-mono tracking-widest uppercase font-bold">{song.isrc}</span>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           {mode === 'philosophy' && (
               <div className="max-w-5xl mx-auto space-y-20 text-center">
                   <div className="space-y-12">
                       <h3 className="text-brand-gold font-black uppercase tracking-[0.8em] text-lg">{t('before_start_title')}</h3>
                       <div className="text-2xl md:text-4xl text-slate-100 leading-loose tracking-[0.2em] font-medium px-10 border-l border-white/10">
                           {t('before_start_content')}
                       </div>
                   </div>
                   <button onClick={() => { isAdmin ? (setMode('playing')) : setMode('gate'); }} className="w-full max-w-2xl py-10 bg-white text-black font-black uppercase tracking-[0.4em] hover:bg-brand-gold transition-all shadow-2xl">
                       {t('btn_understand')}
                   </button>
               </div>
           )}
        </div>
      )}

      {mode === 'gate' && (
          <div className="flex-1 flex items-center justify-center relative z-10 animate-fade-in">
              <div className="max-w-xl w-full bg-slate-900/80 border border-white/10 p-16 text-center rounded-sm shadow-2xl space-y-12 backdrop-blur-3xl">
                  <img src={selectedSong?.coverUrl} className="w-48 h-48 mx-auto border-2 border-brand-gold" alt="" />
                  <h3 className="text-3xl font-black uppercase tracking-widest text-white">{selectedSong?.title}</h3>
                  <button onClick={() => setShowPayment(true)} className="w-full py-10 bg-brand-gold text-black font-black uppercase text-xl tracking-[0.2em] hover:bg-white transition-all">ACCESS STUDIO</button>
              </div>
          </div>
      )}

      {/* 重頭戲：手工對時模式 (依據圖片呈現) */}
      {mode === 'playing' && (
          <div className="flex-1 flex flex-col items-center z-10 animate-fade-in bg-white text-slate-900">
              
              {/* Top Control Station */}
              <div className="w-full max-w-4xl mt-10 space-y-0 shadow-2xl">
                  {/* Orange Banner */}
                  <div className="bg-[#FF8C00] text-white px-6 py-3 rounded-t-md">
                      <span className="text-[11px] font-black uppercase tracking-widest">CLICK PLAY TO BEGIN</span>
                  </div>
                  {/* Waveform Player Box */}
                  <div className="bg-[#F3F4F6] border border-slate-200 flex items-center p-6 gap-8">
                      {/* Play Button */}
                      <button 
                        onClick={handleTogglePlay}
                        className="w-20 h-20 bg-[#FF8C00] rounded-full flex items-center justify-center text-white transition-transform active:scale-90 shadow-lg shrink-0"
                      >
                          {isPaused ? (
                              <svg className="w-10 h-10 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                          ) : (
                              <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                          )}
                      </button>
                      
                      {/* Mock Waveform Track */}
                      <div className="flex-1 h-20 bg-[#E5E7EB] relative overflow-hidden flex items-center">
                          <div className="w-full flex items-end gap-[2px] h-12 px-4 opacity-40">
                              {Array.from({ length: 120 }).map((_, i) => (
                                  <div 
                                    key={i} 
                                    className="flex-1 bg-[#2D5A6E]" 
                                    style={{ height: `${Math.sin(i * 0.2) * 40 + 50}%` }}
                                  ></div>
                              ))}
                          </div>
                          {/* Playhead */}
                          <div 
                            className="absolute top-0 bottom-0 w-[2px] bg-[#FF8C00] transition-all duration-300" 
                            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                          ></div>
                      </div>
                  </div>
              </div>

              {/* Lyrics Scroll Area */}
              <div ref={scrollRef} className="flex-1 w-full max-w-4xl py-32 space-y-12 overflow-y-auto custom-scrollbar-light px-10 text-center">
                  {lyricsLines.map((line, idx) => {
                      const isStamped = stamps[idx] !== undefined;
                      const isActive = idx === currentLineIndex;
                      
                      return (
                          <div 
                            key={idx}
                            onClick={() => handleLyricClick(idx)}
                            className={`transition-all duration-500 cursor-pointer py-2 ${isActive ? 'scale-110' : ''}`}
                          >
                              <p className={`text-2xl md:text-3xl font-medium tracking-widest leading-relaxed ${
                                  isActive ? 'text-slate-900 font-bold' : isStamped ? 'text-slate-400' : 'text-slate-300'
                              }`}>
                                  {line}
                              </p>
                          </div>
                      );
                  })}

                  {/* Save Button (At the end) */}
                  <div className="pt-24 pb-20">
                      <button 
                        onClick={() => { audioRef.current?.pause(); setMode('mastered'); }}
                        className="bg-[#0078D4] text-white px-16 py-5 text-sm font-black uppercase tracking-[0.2em] rounded-sm hover:brightness-110 transition-all shadow-xl"
                      >
                        SAVE TIMED LYRICS
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Mastered & Rendering & Finished 恢復暗色系 */}
      {(mode === 'mastered' || mode === 'rendering' || mode === 'finished') && (
          <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10 animate-fade-in text-white">
              {mode === 'mastered' && (
                  <div className="max-w-4xl w-full bg-slate-900/90 border border-white/10 rounded-sm p-20 text-center space-y-16 shadow-2xl backdrop-blur-3xl">
                      <h2 className="text-6xl font-black uppercase tracking-tighter">READY TO EXPORT</h2>
                      <p className="text-white uppercase tracking-widest text-xs leading-loose font-bold">
                          對時完成。每一秒都是真實的痕跡。<br/>現在由 AI 運算氛圍底層，並合成高品質影片。
                      </p>
                      <button onClick={startExportProcess} className="w-full bg-brand-gold text-black py-12 rounded-sm font-black text-2xl uppercase tracking-[0.3em] hover:bg-white transition-all shadow-2xl">
                        🎬 {t('btn_get_mp4')}
                      </button>
                  </div>
              )}

              {mode === 'rendering' && (
                  <div className="space-y-16 text-center">
                      <div className="w-80 h-80 relative mx-auto">
                          <svg className="w-full h-full transform -rotate-90">
                              <circle cx="160" cy="160" r="150" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={942} strokeDashoffset={942 - (942 * renderProgress) / 100} className="text-brand-gold transition-all duration-1000" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center flex-col">
                              <span className="text-8xl font-black font-mono tracking-tighter">{Math.floor(renderProgress)}%</span>
                              <span className="text-[10px] font-black uppercase tracking-[0.6em] mt-6 text-brand-gold animate-pulse">VEO 3.1 渲染中</span>
                          </div>
                      </div>
                      <p className="text-white text-xs uppercase tracking-[0.4em] animate-pulse font-bold">正在運算一段 8 秒抽象氛圍... 請稍候</p>
                  </div>
              )}

              {mode === 'finished' && (
                  <div className="text-center space-y-16 w-full max-w-6xl">
                      <div className="aspect-video bg-black/90 rounded-sm overflow-hidden border border-white/10 shadow-2xl relative">
                          <video src={bgVideoUrl || ''} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover blur-sm opacity-30" />
                          <div className="absolute inset-0 flex items-center justify-between px-24 py-24 z-10">
                              <div className="flex-1 text-left space-y-10">
                                  <h2 className="text-4xl md:text-7xl font-black text-white uppercase tracking-tighter leading-tight drop-shadow-2xl">
                                      {lyricsLines[Math.floor(lyricsLines.length / 2)]}
                                  </h2>
                                  <div className="h-[1px] w-24 bg-brand-gold"></div>
                                  <p className="text-slate-500 text-sm uppercase tracking-[0.8em] font-bold">{selectedSong?.title} - Willwi</p>
                              </div>
                              <img src={selectedSong?.coverUrl} className="w-[350px] h-[350px] object-cover rounded-2xl shadow-2xl relative z-20" alt="" />
                          </div>
                      </div>
                      <div className="flex gap-8 justify-center">
                          <a href={bgVideoUrl || '#'} download={`WILLWI_STUDIO_${selectedSong?.title}.mp4`} className="px-16 py-6 bg-white text-black font-black uppercase text-xl tracking-widest rounded-sm hover:bg-brand-gold transition-all">
                            📥 下載影片
                          </a>
                          <button onClick={() => setMode('select')} className="px-16 py-6 border border-white/10 text-slate-500 font-black uppercase text-xs hover:text-white">返回錄音室</button>
                      </div>
                  </div>
              )}
          </div>
      )}

      <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); setMode('playing'); }} />
      {selectedSong && (
          <audio 
            key={currentAudioSrc} ref={audioRef} src={currentAudioSrc} 
            onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} 
            crossOrigin="anonymous" preload="auto"
          />
      )}
      
      <style>{`
        .custom-scrollbar-light::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
      `}</style>
    </div>
  );
}; export default Interactive;
