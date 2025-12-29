
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks, searchSpotifyAlbums, getSpotifyAlbum, getSpotifyAlbumTracks, SpotifyTrack, SpotifyAlbum } from '../services/spotifyService';
import { getWillwiReleases, getCoverArtUrl, getReleaseGroupDetails, MBReleaseGroup, MBTrack, MBImportData } from '../services/musicbrainzService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { GoogleGenAI, Type } from "@google/genai";

// 強化版連結轉換器
const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        const u = new URL(url);
        
        // Dropbox 處理 (包含 scl 與 www)
        if (u.hostname.includes('dropbox.com')) {
            u.searchParams.set('raw', '1');
            u.searchParams.delete('dl');
            return u.toString();
        }
        // Google Drive
        if (u.hostname.includes('drive.google.com') && u.pathname.includes('/file/d/')) {
            const id = u.pathname.split('/file/d/')[1].split('/')[0];
            return `https://docs.google.com/uc?export=download&id=${id}`;
        }
        return url;
    } catch (e) { return url; }
};

const DEFAULT_CREDITS = `Main Artist : Willwi 陳威兒
Composer : Tsung Yu Chen
Lyricist : Tsung Yu Chen
Arranger : Willwi
Producer : Will Chen
Recording | Mixing | Mastering : Will Chen
Studio : Willwi Studio, Taipei
Label : Willwi Music`;

const AddSong: React.FC = () => {
  const navigate = useNavigate();
  const { addSong, bulkAddSongs } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [importMode, setImportMode] = useState<'smart' | 'manual' | 'spotify-search' | 'mb'>('smart'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [albumResults, setAlbumResults] = useState<SpotifyAlbum[]>([]);
  
  const [selectedAlbumForBatch, setSelectedAlbumForBatch] = useState<SpotifyAlbum | null>(null);
  const [batchTracks, setBatchTracks] = useState<SpotifyTrack[]>([]);
  const [batchDropboxLink, setBatchDropboxLink] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const [mbResults, setMbResults] = useState<MBReleaseGroup[]>([]);
  const [selectedMBGroup, setSelectedMBGroup] = useState<MBReleaseGroup | null>(null);
  const [mbImportData, setMbImportData] = useState<MBImportData | null>(null);
  const [mbCoverUrl, setMbCoverUrl] = useState<string>('');

  const [searchError, setSearchError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Song>>({
    title: '',
    versionLabel: '',
    language: Language.Mandarin,
    projectType: ProjectType.Indie,
    releaseCategory: ReleaseCategory.Single,
    releaseCompany: 'Willwi Music', 
    publisher: 'Willwi Music', 
    releaseDate: new Date().toISOString().split('T')[0],
    isEditorPick: false,
    isInteractiveActive: false,
    isOfficialExclusive: false,
    coverUrl: '', 
    coverOverlayText: '',
    lyrics: '',
    description: '',
    credits: DEFAULT_CREDITS, 
    spotifyLink: '',
    appleMusicLink: '',
    youtubeMusicUrl: '',
    musixmatchUrl: '', 
    smartLink: '', 
    distrokidManageUrl: '',
    musicBrainzId: '',
    audioUrl: '',
    youtubeUrl: '',
  });

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const correctPwd = localStorage.getItem('willwi_admin_password') || '8520';
      if (passwordInput === correctPwd) { enableAdmin(); setLoginError(''); }
      else { setLoginError('Invalid Access Code'); }
  };

  const playPreview = (url: string | null | undefined, id: string) => {
      if (!url) return;
      if (playingPreviewId === id) {
          audioPreviewRef.current?.pause();
          setPlayingPreviewId(null);
          return;
      }
      setPlayingPreviewId(id);
      if (audioPreviewRef.current) {
          audioPreviewRef.current.src = url;
          audioPreviewRef.current.play().catch(() => setPlayingPreviewId(null));
      }
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-bold text-white mb-2">{t('form_title_add')}</h2>
                   <p className="text-slate-400 text-sm mb-6">請輸入存取密碼以新增作品。</p>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <input type="password" placeholder="Code" className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] font-mono outline-none" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                       <button className="w-full py-3 bg-brand-accent text-slate-900 font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-widest">Unlock</button>
                   </form>
               </div>
          </div>
      );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const detectLanguage = (text: string): Language => {
      if (/[\u3040-\u30ff]/.test(text)) return Language.Japanese;
      if (/[\uac00-\ud7af]/.test(text)) return Language.Korean;
      if (/[\u4e00-\u9fa5]/.test(text)) return Language.Mandarin;
      return Language.English;
  };

  const handleSearch = async () => {
    setTrackResults([]); setAlbumResults([]); setMbResults([]); setSelectedMBGroup(null);
    setSearchError('');
    setSelectedAlbumForBatch(null);
    
    if (importMode === 'smart') {
        if (!searchQuery.trim()) return setSearchError('Please enter a URL');
        setIsSearching(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const bridgeResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Find Spotify Link for: "${searchQuery}"`,
                config: {
                    tools: [{ googleSearch: {} }],
                    responseMimeType: "application/json",
                    responseSchema: { type: Type.OBJECT, properties: { spotifyUrl: { type: Type.STRING } } }
                }
            });
            const bridgeData = JSON.parse(bridgeResponse.text);
            if (bridgeData.spotifyUrl) {
                const id = bridgeData.spotifyUrl.split('/track/')[1]?.split('?')[0];
                if (id) {
                    const tracks = await searchSpotifyTracks(id);
                    setTrackResults(tracks);
                }
            }
        } catch (e) { setSearchError("Smart Import failed."); }
        finally { setIsSearching(false); }
        return;
    }

    setIsSearching(true);
    try {
        if (importMode === 'mb') {
            const results = await getWillwiReleases();
            setMbResults(results);
        } else if (importMode === 'spotify-search') {
            const results = await searchSpotifyTracks(searchQuery);
            setTrackResults(results);
            const albums = await searchSpotifyAlbums(searchQuery);
            setAlbumResults(albums);
        }
    } catch (err) { setSearchError('Search connection failed.'); } 
    finally { setIsSearching(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return alert("Please enter a Title.");
    setIsSaving(true);
    const newSong: Song = {
      id: Date.now().toString(),
      title: formData.title!,
      versionLabel: formData.versionLabel || '',
      coverUrl: formData.coverUrl || '',
      language: formData.language as Language,
      projectType: formData.projectType as ProjectType,
      releaseCategory: formData.releaseCategory as ReleaseCategory,
      releaseCompany: formData.releaseCompany || '',
      releaseDate: formData.releaseDate || new Date().toISOString().split('T')[0],
      isEditorPick: !!formData.isEditorPick,
      isInteractiveActive: !!formData.isInteractiveActive,
      isOfficialExclusive: !!formData.isOfficialExclusive,
      audioUrl: convertToDirectStream(formData.audioUrl || ''),
      youtubeUrl: formData.youtubeUrl,
      spotifyId: formData.spotifyId,
      lyrics: formData.lyrics,
      description: formData.description,
      credits: formData.credits
    };
    if (await addSong(newSong)) navigate('/database');
    else { alert(t('msg_save_error')); setIsSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 px-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">{t('form_title_add')}</h2>
          <div className="bg-slate-800 p-1 rounded flex border border-slate-700">
              <button onClick={() => setImportMode('smart')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'smart' ? 'bg-white text-black' : 'text-slate-500'}`}>Smart</button>
              <button onClick={() => setImportMode('manual')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'manual' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Manual</button>
          </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_title')}</label><input name="title" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.title} onChange={handleChange} required /></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_version')}</label><input name="versionLabel" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.versionLabel} onChange={handleChange} placeholder="e.g. Acoustic, Remix" /></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_lang')}</label><select name="language" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none appearance-none" value={formData.language} onChange={handleChange}>{Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}</select></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_date')}</label><input type="date" name="releaseDate" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none" value={formData.releaseDate} onChange={handleChange} /></div>
             <div className="space-y-2"><label className="text-[10px] text-brand-gold font-black uppercase tracking-widest">官網獨家影音</label>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-800/50 border border-brand-gold/30 rounded">
                    <input type="checkbox" name="isOfficialExclusive" checked={formData.isOfficialExclusive} onChange={handleChange} className="w-4 h-4 accent-brand-gold" />
                    <span className="text-[10px] text-brand-gold font-black uppercase">Yes, Exclusive</span>
                </label>
             </div>
             <div className="space-y-2"><label className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">互動實驗室開放</label>
                <label className="flex items-center gap-3 cursor-pointer p-3 bg-emerald-950/20 border border-emerald-500/30 rounded">
                    <input type="checkbox" name="isInteractiveActive" checked={formData.isInteractiveActive} onChange={handleChange} className="w-4 h-4 accent-emerald-500" />
                    <span className="text-[10px] text-emerald-400 font-black uppercase">Open</span>
                </label>
             </div>
        </div>

        <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_links')}</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="youtubeUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.youtubeUrl} onChange={handleChange} placeholder="YouTube Video URL (required for Exclusive section)" />
                <input name="spotifyId" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.spotifyId} onChange={handleChange} placeholder="Spotify Track ID (e.g. 5Lqex...)" />
            </div>
        </div>

        <div className="space-y-2">
            <label className="text-[10px] text-brand-accent font-black uppercase tracking-widest">{t('form_label_audio')}</label>
            <div className="space-y-2">
                <input name="audioUrl" className="w-full bg-slate-800 border border-brand-accent/30 px-4 py-3 text-brand-accent text-xs focus:border-brand-accent outline-none font-mono" value={formData.audioUrl} onChange={handleChange} placeholder={t('form_placeholder_audio')} />
                {formData.audioUrl && (
                    <div className="bg-black/50 p-4 border border-white/10 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] text-brand-accent font-bold uppercase tracking-widest">Audio Verification Player</span>
                            <span className="text-[8px] text-slate-600 font-mono">Real-time Stream Test</span>
                        </div>
                        <audio controls src={convertToDirectStream(formData.audioUrl)} className="w-full h-10 filter invert grayscale" />
                        <p className="text-[9px] text-slate-500 italic">If player is 0:00, ensure Dropbox link has "?raw=1" or use "Copy Link" again.</p>
                    </div>
                )}
            </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
            <button type="button" onClick={() => navigate('/database')} className="px-8 py-3 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest">{t('form_btn_cancel')}</button>
            <button type="submit" disabled={isSaving} className="px-8 py-3 bg-brand-accent text-slate-900 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg">{isSaving ? t('form_btn_saving') : t('form_btn_save')}</button>
        </div>
      </form>
      <audio ref={audioPreviewRef} className="hidden" />
    </div>
  );
};

export default AddSong;
