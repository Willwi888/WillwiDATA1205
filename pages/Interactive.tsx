
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
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const [lyricsLines, setLyricsLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isStamping, setIsStamping] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Sync with target song if passed via navigate state
  useEffect(() => {
    if (location.state?.targetSongId) {
        const s = songs.find(x => x.id === location.state.targetSongId);
        if (s) { setSelectedSong(s); setMode('philosophy'); }
    }
  }, [location.state, songs]);

  // Load lyrics when song is selected
  useEffect(() => {
    if (selectedSong?.lyrics) {
        setLyricsLines(selectedSong.lyrics.split('\n').filter(l => l.trim().length > 0));
    } else {
        setLyricsLines([]);
    }
    setCurrentLineIndex(0);
    setAudioError(null);
  }, [selectedSong]);

  // The core timing mechanism
  const handleStamp = useCallback(() => {
      if (mode !== 'playing' || !audioRef.current) return;
      
      // Visual feedback trigger
      setIsStamping(true);
      setTimeout(() => setIsStamping(false), 100);

      setCurrentLineIndex(prev => {
          if (prev < lyricsLines.length - 1) {
              return prev + 1;
          } else {
              // Final line reached: stop and transition
              audioRef.current?.pause();
              setMode('mastered');
              showToast("SESSION MASTERED");
              return prev;
          }
      });
  }, [mode, lyricsLines.length, showToast]);

  // Keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && mode === 'playing') {
            e.preventDefault(); // Prevent page scroll
            handleStamp();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handleStamp]);

  const startExportProcess = async () => {
      if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
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
          const mp4Url = await generateAiVideo(base64, selectedSong?.title || 'Unknown');
          if (mp4Url) {
              setRenderProgress(100);
              setFinalVideoUrl(mp4Url);
              setMode('finished');
              showToast("VIDEO READY FOR DOWNLOAD");
          } else throw new Error();
      } catch (e) {
          showToast("GENERATION FAILED", "error");
          setMode('mastered');
      }
  };

  const currentAudioSrc = useMemo(() => {
      if (!selectedSong) return '';
      return resolveDirectLink(selectedSong.audioUrl || selectedSong.dropboxUrl || '');
  }, [selectedSong]);

  const handleAudioError = () => {
      setAudioError("音訊加載失敗，請檢查連結是否有效。");
      showToast("AUDIO LOAD ERROR", "error");
  };

  // Helper to start playback
  const playAudio = () => {
    if (audioRef.current) {
        audioRef.current.play().catch(e => {
            console.error("Playback blocked or failed", e);
            showToast("CLICK TO START AUDIO", "error");
        });
    }
  };

  return (
    <div className="bg-[#020617] min-h-screen text-white flex flex-col pt-24 pb-32 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 opacity-20">
          <img src={selectedSong?.coverUrl || ''} className="w-full h-full object-cover blur-[100px] scale-125 animate-studio-breathe" alt="" />
      </div>

      {mode === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-10 max-w-4xl mx-auto text-center animate-fade-in space-y-12">
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
          <div className="flex-1 w-full max-w-6xl mx-auto px-10 py-10 relative z-10 animate-fade-in overflow-y-auto custom-scrollbar">
              <h2 className="text-4xl font-black uppercase tracking-[0.4em] mb-12 border-b border-white/10 pb-6">Recording Vault</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {songs.filter(s => s.isInteractiveActive || isAdmin).map(song => (
                      <div key={song.id} onClick={() => { setSelectedSong(song); setMode('philosophy'); }} className="group cursor-pointer bg-slate-900/40 p-10 rounded-sm border border-white/5 hover:border-brand-gold transition-all flex items-center gap-10">
                          <img src={song.coverUrl} className="w-32 h-32 object-cover grayscale group-hover:grayscale-0 transition-all shadow-2xl" alt="" />
                          <div className="text-left">
                            <h4 className="text-2xl font-black uppercase tracking-widest text-white/60 group-hover:text-brand-gold">{song.title}</h4>
                            <span className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">{song.isrc}</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {mode === 'playing' && (
          <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10 animate-fade-in h-full">
              {audioError && <div className="absolute top-0 left-0 w-full bg-rose-600 text-white py-4 text-center text-xs font-black uppercase tracking-widest z-50">{audioError}</div>}
              
              <div className="w-full max-w-5xl space-y-16 text-center mb-24 pointer-events-none transition-transform duration-100" style={{ transform: isStamping ? 'scale(0.98)' : 'scale(1)' }}>
                  <p className="text-xl text-white/10 font-bold uppercase tracking-widest h-8 overflow-hidden">{lyricsLines[currentLineIndex - 1] || ''}</p>
                  
                  <div key={currentLineIndex} className={`bg-black/90 px-16 py-14 rounded-sm border-l-[10px] border-brand-gold shadow-2xl inline-block cinema-lyrics-blur ${isStamping ? 'shadow-[0_0_30px_rgba(251,191,36,0.3)]' : ''}`}>
                      <h2 className="text-5xl md:text-8xl font-black text-white uppercase tracking-tight leading-tight">
                          {lyricsLines[currentLineIndex] || '...'}
                      </h2>
                  </div>
                  
                  <p className="text-xl text-white/10 font-bold uppercase tracking-widest h-8 overflow-hidden">{lyricsLines[currentLineIndex + 1] || ''}</p>
              </div>

              <button 
                onMouseDown={handleStamp} 
                className={`w-full max-w-4xl py-24 bg-white/5 border-2 border-white/20 text-white rounded-sm font-black text-4xl uppercase tracking-[0.4em] transition-all shadow-2xl ${isStamping ? 'bg-brand-gold text-black scale-95 border-brand-gold' : 'hover:bg-white/10'}`}
              >
                  TAP OR PRESS SPACE
              </button>

              {/* Real-time Progress Bar */}
              <div className="fixed bottom-0 left-0 w-full h-2 bg-white/5">
                <div 
                  className="h-full bg-brand-gold transition-all duration-300 shadow-[0_0_20px_#fbbf24]" 
                  style={{ width: `${(currentTime / (audioRef.current?.duration || 1)) * 100}%` }}
                ></div>
              </div>
          </div>
      )}

      {mode === 'philosophy' && (
          <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10 animate-fade-in max-w-4xl mx-auto space-y-16">
              <div className="text-center space-y-8">
                  <h3 className="text-brand-gold font-black uppercase tracking-[0.8em]">{t('before_start_title')}</h3>
                  <p className="text-xl text-slate-300 leading-loose tracking-widest">{t('before_start_content')}</p>
              </div>
              <button 
                onClick={() => { 
                    if (isAdmin) {
                        setMode('playing');
                        setTimeout(playAudio, 100);
                    } else {
                        setMode('gate');
                    }
                }} 
                className="w-full py-10 bg-white text-black font-black uppercase tracking-[0.4em] hover:bg-brand-gold transition-all"
              >
                  {t('btn_understand')}
              </button>
          </div>
      )}

      {mode === 'gate' && (
          <div className="flex-1 flex items-center justify-center relative z-10 animate-fade-in">
              <div className="max-w-xl w-full bg-slate-900/80 border border-white/10 p-16 text-center rounded-sm shadow-2xl space-y-12 backdrop-blur-3xl">
                  <img src={selectedSong?.coverUrl} className="w-48 h-48 mx-auto border-2 border-brand-gold" alt="" />
                  <h3 className="text-3xl font-black uppercase tracking-widest">{selectedSong?.title}</h3>
                  <button onClick={() => setShowPayment(true)} className="w-full py-10 bg-brand-gold text-black font-black uppercase text-xl tracking-[0.2em] hover:bg-white transition-all">ACCESS STUDIO</button>
              </div>
          </div>
      )}

      {mode === 'mastered' && (
          <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10 animate-fade-in">
              <div className="max-w-4xl w-full bg-slate-900/90 border border-white/10 rounded-sm p-20 text-center space-y-16 shadow-2xl backdrop-blur-3xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12">
                      <span className="text-[150px] font-black text-brand-gold tracking-tighter">DONE</span>
                  </div>
                  <h2 className="text-6xl font-black uppercase tracking-tighter text-white">READY TO EXPORT</h2>
                  <p className="text-slate-400 uppercase tracking-widest text-xs">手稿對時已完成。接下來將為您導出 AI 微動態影片。</p>
                  <button onClick={startExportProcess} className="w-full bg-brand-gold text-black py-12 rounded-sm font-black text-2xl uppercase tracking-[0.3em] hover:bg-white transition-all shadow-2xl">
                    {t('btn_get_mp4')}
                  </button>
              </div>
          </div>
      )}

      {mode === 'rendering' && (
          <div className="flex-1 flex flex-col items-center justify-center relative z-10 animate-fade-in space-y-16">
              <div className="w-80 h-80 relative">
                  <svg className="w-full h-full transform -rotate-90">
                      <circle cx="160" cy="160" r="150" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-white/5" />
                      <circle cx="160" cy="160" r="150" stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={942} strokeDashoffset={942 - (942 * renderProgress) / 100} className="text-brand-gold transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-8xl font-black font-mono tracking-tighter">{renderProgress}%</span>
                      <span className="text-[10px] font-black uppercase tracking-[0.6em] mt-6 text-brand-gold animate-pulse">Veo 3.1 Mastering</span>
                  </div>
              </div>
          </div>
      )}

      {mode === 'finished' && (
          <div className="flex-1 flex flex-col items-center justify-center px-10 relative z-10 animate-fade-in text-center space-y-12">
              <div className="relative mb-10">
                  <div className="absolute inset-0 bg-brand-gold blur-[100px] opacity-20 animate-pulse"></div>
                  <div className="w-48 h-48 border-[10px] border-brand-gold rounded-full flex items-center justify-center mx-auto scale-110 mb-10 rotate-[-12deg] shadow-[0_0_50px_rgba(251,191,36,0.5)]">
                      <span className="text-3xl font-black text-brand-gold uppercase tracking-tighter">MASTERED</span>
                  </div>
                  <h2 className="text-7xl md:text-9xl font-black uppercase tracking-tighter text-white leading-none">SUCCESS</h2>
              </div>

              <p className="text-slate-400 font-bold uppercase tracking-[0.5em] text-sm max-w-xl mx-auto leading-loose">
                  作品已保存至您的設備。每一秒對時的刻度，都是你曾真實停留在這首歌裡的證明。
              </p>

              <div className="flex flex-col gap-6 w-full max-w-4xl">
                  <a href={finalVideoUrl || '#'} download={`WILLWI_${selectedSong?.title}_Studio.mp4`} className="inline-block w-full py-12 bg-white text-black font-black uppercase text-xl tracking-widest rounded-sm hover:bg-brand-gold transition-all shadow-2xl animate-pulse">
                    📥 DOWNLOAD VIDEO
                  </a>
                  <button onClick={() => setMode('select')} className="block w-full py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:text-white transition-all">返回工作室</button>
              </div>
          </div>
      )}

      <PaymentModal 
        isOpen={showPayment} 
        onClose={() => { 
            setShowPayment(false); 
            setMode('playing'); 
            setTimeout(playAudio, 100);
        }} 
      />
      
      {selectedSong && (
          <audio 
            key={currentAudioSrc} 
            ref={audioRef} 
            src={currentAudioSrc} 
            onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} 
            onPlay={() => { if(mode === 'philosophy') setMode('playing'); }}
            onError={handleAudioError}
            crossOrigin="anonymous"
            preload="auto"
          />
      )}
    </div>
  );
}; export default Interactive;
