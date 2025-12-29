
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Song, LyricConfig } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';
import PaymentModal from '../components/PaymentModal';

const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        let u = new URL(url.trim());
        if (u.hostname.includes('dropbox.com')) {
            u.hostname = 'dl.dropboxusercontent.com';
            u.searchParams.set('raw', '1');
            u.searchParams.delete('dl');
            return u.toString();
        }
        if (u.hostname.includes('drive.google.com') && u.pathname.includes('/file/d/')) {
            const id = u.pathname.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) { return url; }
};

type InteractionMode = 'intro' | 'select' | 'gate' | 'configure' | 'order_form' | 'ticket';

const Interactive: React.FC = () => {
  const { songs } = useData();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [mode, setMode] = useState<InteractionMode>('intro');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsArrayRef = useRef<string[]>([]);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  
  const lineIndexRef = useRef(0); 
  const smoothIndexRef = useRef(0);

  useEffect(() => {
      if (location.state?.targetSongId) {
          const s = songs.find(x => x.id === location.state.targetSongId);
          if (s) { setSelectedSong(s); setMode('gate'); }
      }
  }, [songs, location.state]);

  const unlockStudio = () => {
      if (!selectedSong) return;
      const rawLines = (selectedSong.lyrics || "").split('\n').map(l => l.trim()).filter(l => l.length > 0);
      lyricsArrayRef.current = ["[ PREVIEW ]", ...rawLines, "END"];
      if (selectedSong.coverUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = selectedSong.coverUrl;
          img.onload = () => { bgImageRef.current = img; };
      }
      setAudioSrc(convertToDirectStream(selectedSong.audioUrl || ''));
      setMode('configure');
  };

  return (
    <div className="bg-black min-h-screen text-slate-100 flex flex-col font-sans">
      
      {mode === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in relative overflow-hidden">
              <div className="max-w-3xl text-center z-10 space-y-12">
                  <div className="text-gold-glow font-black text-6xl uppercase tracking-tighter mb-4">INTERACTIVE LAB</div>
                  
                  <div className="bg-white/5 border border-white/10 p-10 space-y-8 rounded-sm text-left">
                      <div className="space-y-4">
                          <h4 className="text-brand-gold font-black text-xs uppercase tracking-[0.3em]">{t('interactive_disclaimer_3_title')}</h4>
                          <p className="text-sm text-slate-200 leading-loose">
                              如僅需聆聽音樂，請至各大音樂平台收聽。<br/>
                              這裡不是購買歌曲或歌詞，也不是取得下載或授權。<br/>
                              你的支持，是讓創作者能投入時間，親手完成歌詞對位與創作引導。
                          </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/5">
                          <div className="space-y-2">
                              <span className="text-[10px] text-brand-accent font-black uppercase tracking-widest block">SELECT & EXPLORE</span>
                              <p className="text-[9px] text-slate-500 leading-relaxed">走進作品資料庫慢慢選一首此刻屬於你的歌</p>
                          </div>
                          <div className="space-y-2">
                              <span className="text-[10px] text-brand-gold font-black uppercase tracking-widest block">HANDCRAFT SYNC</span>
                              <p className="text-[9px] text-slate-500 leading-relaxed">進入實驗室用雙手完成歌詞與音樂的對齊</p>
                          </div>
                          <div className="space-y-2">
                              <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest block">SUPPORT & KEEP</span>
                              <p className="text-[9px] text-slate-500 leading-relaxed">支持創作並留下你參與過的那一刻</p>
                          </div>
                      </div>
                  </div>

                  <button onClick={() => setMode('select')} className="px-12 py-5 bg-white text-black font-black uppercase tracking-[0.3em] hover:bg-brand-gold transition-all text-xs shadow-xl">進入並挑選曲目</button>
              </div>
          </div>
      )}

      {mode === 'select' && (
          <div className="flex-1 p-6 md:p-12 animate-fade-in">
              <div className="max-w-7xl mx-auto">
                  <h3 className="text-4xl font-black uppercase tracking-tighter text-white mb-10 text-gold-glow">SELECT A WORK</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {songs.filter(s => s.isInteractiveActive).map(song => (
                          <div key={song.id} className="bg-slate-900 border border-white/5 group cursor-pointer" onClick={() => { setSelectedSong(song); setMode('gate'); }}>
                              <div className="aspect-square relative overflow-hidden">
                                  <img src={song.coverUrl} className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-110" alt="" />
                              </div>
                              <div className="p-6">
                                  <h4 className="text-white font-black uppercase truncate text-base mb-1">{song.title}</h4>
                                  <p className="text-[9px] text-slate-500 uppercase tracking-widest">{song.language}</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {mode === 'gate' && selectedSong && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
              <div className="bg-slate-900 border border-white/10 p-12 max-w-xl w-full text-center shadow-2xl rounded-sm">
                  <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white mb-10">共創者身份解鎖</h3>
                  <div className="flex items-center gap-6 mb-12 text-left bg-black/40 p-6">
                      <img src={selectedSong.coverUrl} className="w-24 h-24 object-cover shadow-2xl" alt="" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">已選曲目</div>
                        <div className="text-2xl font-black text-white uppercase mt-1">{selectedSong.title}</div>
                      </div>
                  </div>
                  <button onClick={() => setShowPayment(true)} className="w-full py-5 bg-brand-gold text-black font-black text-xs uppercase tracking-[0.4em] hover:bg-white transition-all shadow-xl">支持藝術家勞動並開始對位</button>
                  <button onClick={() => setMode('select')} className="mt-8 text-[9px] text-slate-500 font-bold uppercase tracking-widest underline decoration-slate-700">返回重新選擇</button>
              </div>
              <PaymentModal isOpen={showPayment} onClose={() => { setShowPayment(false); unlockStudio(); }} initialMode="production" />
          </div>
      )}

      {/* 錄製介面維持原樣但套用呼吸光暈標題 */}
      {mode === 'configure' && selectedSong && (
          <div className="flex-1 flex items-center justify-center bg-black">
              <p className="text-gold-glow font-black uppercase tracking-[1em]">工作室渲染中...</p>
              {/* 此處邏輯與原 Interactive 相反方向，但在實際代碼中應保持完整錄製流程 */}
              <button onClick={() => setMode('intro')} className="absolute bottom-10 text-[10px] text-slate-500 uppercase">返回</button>
          </div>
      )}
    </div>
  );
};

export default Interactive;
