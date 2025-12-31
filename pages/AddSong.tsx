
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Language, ProjectType, ReleaseCategory, Song } from '../types';
import { searchSpotifyTracks, searchSpotifyAlbums, getSpotifyAlbum, getSpotifyAlbumTracks, SpotifyTrack, SpotifyAlbum } from '../services/spotifyService';
import { getWillwiReleases, getCoverArtUrl, getReleaseGroupDetails, MBReleaseGroup, MBTrack, MBImportData } from '../services/musicbrainzService';
import { useTranslation } from '../context/LanguageContext';
import { useUser } from '../context/UserContext';
import { GoogleGenAI, Type } from "@google/genai";

const convertToDirectStream = (url: string) => {
    try {
        if (!url) return '';
        const u = new URL(url);
        if (u.hostname.includes('dropbox.com')) {
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
  const { addSong } = useData();
  const { t } = useTranslation();
  const { isAdmin, enableAdmin } = useUser();

  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [importMode, setImportMode] = useState<'smart' | 'manual' | 'spotify' | 'mb'>('smart'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [trackResults, setTrackResults] = useState<SpotifyTrack[]>([]);
  const [mbResults, setMbResults] = useState<MBReleaseGroup[]>([]);
  const [searchError, setSearchError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const audioPreviewRef = useRef<HTMLAudioElement>(null);

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
    lyrics: '',
    description: '',
    credits: DEFAULT_CREDITS, 
    spotifyId: '',
    audioUrl: '',
    customAudioLink: '',
    youtubeUrl: '',
    cloudVideoUrl: '',
  });

  const handleAdminLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const correctPwd = localStorage.getItem('willwi_admin_password') || '8520';
      if (passwordInput === correctPwd) { enableAdmin(); setLoginError(''); }
      else { setLoginError('Invalid Access Code'); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSearch = async () => {
    setTrackResults([]); setMbResults([]); setSearchError('');
    if (!searchQuery.trim() && importMode !== 'mb') return setSearchError('Please enter a query');
    
    setIsSearching(true);
    try {
        if (importMode === 'smart') {
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
            } else { setSearchError("Smart Import could not find a match."); }
        } else if (importMode === 'spotify') {
            const results = await searchSpotifyTracks(searchQuery);
            setTrackResults(results);
        } else if (importMode === 'mb') {
            const results = await getWillwiReleases();
            setMbResults(results);
        }
    } catch (err) { setSearchError('Search failed.'); } 
    finally { setIsSearching(false); }
  };

  const importSpotifyTrack = (track: SpotifyTrack) => {
      setFormData(prev => ({
          ...prev,
          title: track.name,
          coverUrl: track.album.images[0]?.url,
          releaseDate: track.album.release_date,
          spotifyId: track.id,
          isrc: track.external_ids.isrc,
          releaseCompany: track.album.name,
      }));
      setTrackResults([]);
      alert(`已填入: ${track.name}`);
  };

  const importMBRelease = async (group: MBReleaseGroup) => {
      setIsSearching(true);
      const details = await getReleaseGroupDetails(group.id, group['primary-type']);
      const cover = await getCoverArtUrl(group.id);
      if (details) {
          setFormData(prev => ({
              ...prev,
              title: group.title,
              releaseDate: details.releaseDate,
              coverUrl: cover || prev.coverUrl,
              releaseCompany: details.releaseCompany,
              releaseCategory: details.category,
          }));
      }
      setMbResults([]);
      setIsSearching(false);
      alert(`已從 MusicBrainz 填入: ${group.title}`);
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
      customAudioLink: formData.customAudioLink || '',
      youtubeUrl: formData.youtubeUrl,
      cloudVideoUrl: formData.cloudVideoUrl,
      spotifyId: formData.spotifyId,
      lyrics: formData.lyrics,
      description: formData.description,
      credits: formData.credits
    };
    if (await addSong(newSong)) navigate('/database');
    else { alert(t('msg_save_error')); setIsSaving(false); }
  };

  if (!isAdmin) {
      return (
          <div className="min-h-[70vh] flex items-center justify-center px-4 animate-fade-in">
               <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full shadow-2xl text-center">
                   <h2 className="text-2xl font-bold text-white mb-2">{t('nav_add')}</h2>
                   <p className="text-slate-400 text-sm mb-6">請輸入管理員存取密碼。</p>
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <input type="password" placeholder="Code" className="w-full bg-black border border-slate-700 rounded-lg px-4 py-3 text-white text-center tracking-[0.5em] font-mono outline-none" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} />
                       {loginError && <p className="text-red-500 text-xs">{loginError}</p>}
                       <button className="w-full py-3 bg-brand-gold text-slate-900 font-bold rounded-lg hover:bg-white transition-colors uppercase tracking-widest">Unlock</button>
                   </form>
               </div>
          </div>
      );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 px-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">登錄作品</h2>
          <div className="bg-slate-800 p-1 rounded flex border border-slate-700">
              <button onClick={() => setImportMode('smart')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'smart' ? 'bg-white text-black' : 'text-slate-500'}`}>Smart</button>
              <button onClick={() => setImportMode('spotify')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'spotify' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>Spotify</button>
              <button onClick={() => setImportMode('mb')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'mb' ? 'bg-blue-500 text-white' : 'text-slate-500'}`}>MusicBrainz</button>
              <button onClick={() => setImportMode('manual')} className={`px-4 py-2 rounded text-[10px] font-black uppercase tracking-widest ${importMode === 'manual' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}>Manual</button>
          </div>
      </div>

      {importMode !== 'manual' && (
          <div className="mb-12 bg-slate-900/50 p-6 border border-white/5 rounded-xl">
             <div className="flex gap-2">
                 <input 
                    type="text" 
                    placeholder={importMode === 'smart' ? "貼上網址或輸入描述..." : (importMode === 'mb' ? "搜尋威威的 MBID 作品..." : "輸入歌曲名稱或 Spotify URL...")} 
                    className="flex-grow bg-black border border-white/10 px-4 py-3 text-white text-sm outline-none focus:border-brand-accent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                 />
                 <button 
                    onClick={handleSearch} 
                    disabled={isSearching}
                    className="px-6 bg-brand-accent text-slate-950 font-black text-xs uppercase tracking-widest disabled:opacity-50"
                 >
                     {isSearching ? 'Searching...' : 'Search'}
                 </button>
             </div>
             {searchError && <p className="text-red-500 text-[10px] mt-2 font-bold">{searchError}</p>}
             
             {/* 搜尋結果列表 */}
             <div className="mt-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                 {trackResults.map(track => (
                     <div key={track.id} onClick={() => importSpotifyTrack(track)} className="flex items-center gap-4 p-3 bg-black/40 hover:bg-white/10 cursor-pointer border border-white/5 transition-all">
                         <img src={track.album.images[0]?.url} className="w-10 h-10 object-cover" alt="" />
                         <div className="flex-grow">
                             <div className="text-white text-xs font-bold">{track.name}</div>
                             <div className="text-slate-500 text-[9px] uppercase">{track.album.name} • {track.album.release_date}</div>
                         </div>
                         <div className="text-emerald-500 text-[9px] font-bold uppercase tracking-widest">Import Spotify</div>
                     </div>
                 ))}
                 {mbResults.map(group => (
                     <div key={group.id} onClick={() => importMBRelease(group)} className="flex items-center gap-4 p-3 bg-black/40 hover:bg-white/10 cursor-pointer border border-white/5 transition-all">
                         <div className="flex-grow">
                             <div className="text-white text-xs font-bold">{group.title}</div>
                             <div className="text-slate-500 text-[9px] uppercase">{group['primary-type']} • {group['first-release-date']}</div>
                         </div>
                         <div className="text-blue-500 text-[9px] font-bold uppercase tracking-widest">Import MB</div>
                     </div>
                 ))}
             </div>
          </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_title')}</label><input name="title" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.title} onChange={handleChange} required /></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_version')}</label><input name="versionLabel" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-sm focus:border-brand-accent outline-none" value={formData.versionLabel} onChange={handleChange} placeholder="e.g. Acoustic, Remix" /></div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_lang')}</label><select name="language" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none appearance-none" value={formData.language} onChange={handleChange}>{Object.values(Language).map(l => <option key={l} value={l}>{l}</option>)}</select></div>
             <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('form_label_date')}</label><input type="date" name="releaseDate" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none" value={formData.releaseDate} onChange={handleChange} /></div>
             <div className="space-y-2">
                <label className="text-[10px] text-brand-gold font-black uppercase tracking-widest block mb-2">官網獨家</label>
                <input type="checkbox" name="isOfficialExclusive" checked={formData.isOfficialExclusive} onChange={handleChange} className="w-4 h-4 accent-brand-gold" />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] text-emerald-500 font-black uppercase tracking-widest block mb-2">互動實驗室</label>
                <input type="checkbox" name="isInteractiveActive" checked={formData.isInteractiveActive} onChange={handleChange} className="w-4 h-4 accent-emerald-500" />
             </div>
        </div>

        <div className="space-y-2"><label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">外部資源連結</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="coverUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.coverUrl} onChange={handleChange} placeholder="封面圖片網址 (Cover URL)" />
                <input name="spotifyId" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.spotifyId} onChange={handleChange} placeholder="Spotify Track ID" />
                <input name="youtubeUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.youtubeUrl} onChange={handleChange} placeholder="YouTube URL" />
                <input name="cloudVideoUrl" className="bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.cloudVideoUrl} onChange={handleChange} placeholder="Cloud Video URL (4K Vault)" />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-[10px] text-brand-accent font-black uppercase tracking-widest">音檔來源網址 (Stream Source)</label>
                <input name="audioUrl" className="w-full bg-slate-800 border border-brand-accent/30 px-4 py-3 text-brand-accent text-xs focus:border-brand-accent outline-none font-mono" value={formData.audioUrl} onChange={handleChange} placeholder="貼上直連音檔連結 (Dropbox ?raw=1)" />
            </div>
            <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest">備用音源 / 自定義連結 (Backup/Custom Link)</label>
                <input name="customAudioLink" className="w-full bg-slate-900 border border-white/10 px-4 py-3 text-white text-xs focus:border-brand-accent outline-none font-mono" value={formData.customAudioLink} onChange={handleChange} placeholder="任何您想附加的外部連結" />
            </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
            <button type="button" onClick={() => navigate('/database')} className="px-8 py-3 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest">{t('form_btn_cancel')}</button>
            <button type="submit" disabled={isSaving} className="px-8 py-3 bg-brand-accent text-slate-950 font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all shadow-lg">{isSaving ? t('form_btn_saving') : t('form_btn_save')}</button>
        </div>
      </form>
      <audio ref={audioPreviewRef} className="hidden" />
    </div>
  );
};

export default AddSong;
