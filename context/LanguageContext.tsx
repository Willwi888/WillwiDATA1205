import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    // Nav & Footer
    nav_home: "Home",
    nav_catalog: "Catalog",
    nav_interactive: "Interactive Studio", 
    nav_add: "Add Song",
    footer_rights: "Willwi Music. All Rights Reserved.",
    
    // Home
    hero_title: "WILLWI MUSIC CATALOG.",
    hero_subtitle: "Because every note deserves a place to belong.",
    hero_btn_db: "Database",
    hero_btn_interactive: "Interactive",
    hero_latest: "Latest Release / Featured",
    
    // Home - Brand Section (New)
    home_verified_title: "Verified Presence & Global Recognition",
    home_verified_items: [
      "Spotify Verified Artist",
      "Apple Music Verified Artist",
      "Amazon Music Verified Artist",
      "TIDAL Verified Artist",
      "YouTube Official Artist Channel (OAC)",
      "TikTok Verified Creator",
      "Musixmatch Global Curator / Certified Artist",
      "Featured in Google Knowledge Graph"
    ],
    home_purpose_title: "Purpose-driven Creation",
    home_purpose_text: "Centered on emotional storytelling, our professional team provides customized songwriting and production services. From story interviews, lyric development, and composition to final production, every moment of life deserves to be preserved and heard through music.",
    home_quote_main: "Everyone deserves a theme song of their own.",
    home_quote_sub: "Music is more than melody — it is the voice of a story and the echo of a soul.",

    // Database
    db_title: "Music Catalog",
    db_total: "Total Tracks",
    db_search_placeholder: "Search Title, ISRC, UPC...",
    db_filter_lang: "All Languages",
    db_filter_project: "All Projects",
    db_view_list: "List",
    db_view_grid: "Grid",
    db_col_cover: "Cover",
    db_col_info: "Info",
    db_col_release: "Release",
    db_col_status: "Status",
    db_status_ok: "OK",
    db_status_missing: "MISSING",
    db_empty: "No songs found matching your criteria.",

    // Add / Edit Song
    form_title_add: "Add New Song",
    form_title_edit: "Edit Song",
    form_mode_single: "Single Track",
    form_mode_album: "Bulk Import (Album)",
    form_mode_mb: "Sync MusicBrainz", // NEW
    form_search_single: "Search Single from Spotify",
    form_search_album: "Search Album from Spotify",
    form_search_mb: "Willwi's Discography (MusicBrainz)", // NEW
    form_search_btn: "Search",
    form_search_searching: "Searching...",
    form_import_btn: "Import Data",
    form_section_basic: "Basic Information",
    form_label_title: "Title",
    form_label_version: "Version Label (e.g. Acoustic)",
    form_label_lang: "Language",
    form_label_project: "Project Type",
    form_label_date: "Release Date",
    form_label_cover: "Cover URL",
    form_label_pick: "Editor's Pick",
    form_section_meta: "Metadata (IDs)",
    form_section_links: "External Links & Content",
    form_label_youtube: "YouTube URL",
    form_label_spotify: "Spotify Link",
    form_label_apple: "Apple Music Link",
    form_label_lyrics: "Lyrics",
    form_label_desc: "Description",
    form_label_credits: "Credits",
    form_btn_cancel: "Cancel",
    form_btn_save: "Save to Database",
    form_btn_saving: "Saving...",
    
    // Song Detail
    detail_ai_btn: "Generate AI Critique",
    detail_ai_loading: "Generating...",
    detail_tab_story: "Story",
    detail_tab_maker: "Lyric Video Studio",
    detail_lyrics_header: "Lyrics",
    detail_links_header: "External Platforms",
    detail_player_header: "Preview & Video",
    
    // Common
    btn_edit: "Edit",
    btn_delete: "Delete",
    msg_confirm_delete: "Are you sure you want to delete this song?",
    msg_save_success: "Saved successfully!",
    msg_save_error: "Save failed.",
  },
  zh: {
    // Nav & Footer
    nav_home: "首頁",
    nav_catalog: "作品資料庫",
    nav_interactive: "互動實驗室",
    nav_add: "新增作品",
    footer_rights: "Willwi Music. 版權所有",

    // Home
    hero_title: "WILLWI MUSIC CATALOG.",
    hero_subtitle: "Because every note deserves a place to belong.", 
    hero_btn_db: "資料庫",
    hero_btn_interactive: "互動專區",
    hero_latest: "最新發行 / 精選",

    // Home - Brand Section (New)
    home_verified_title: "全球認證與影響力",
    home_verified_items: [
      "Spotify 官方認證藝人",
      "Apple Music 官方認證藝人",
      "Amazon Music 官方認證藝人",
      "TIDAL 官方認證藝人",
      "YouTube 官方音樂人頻道 (OAC)",
      "TikTok 認證創作者",
      "Musixmatch 全球策展人 / 認證藝人",
      "Google 知識圖譜收錄藝人"
    ],
    home_purpose_title: "以使命為核心的創作",
    home_purpose_text: "以情感敘事為核心，我們的專業團隊提供客製化的詞曲創作與製作服務。從故事訪談、歌詞發展、作曲到最終製作，生命中的每一個時刻都值得透過音樂被保存與聽見。",
    home_quote_main: "每個人都值得擁有一首主題曲。",
    home_quote_sub: "音樂不只是旋律，它是故事的聲音，是靈魂的迴響。",

    // Database
    db_title: "作品資料庫",
    db_total: "總曲目數",
    db_search_placeholder: "搜尋歌名, ISRC, UPC...",
    db_filter_lang: "所有語言",
    db_filter_project: "所有專案",
    db_view_list: "清單模式",
    db_view_grid: "卡片模式",
    db_col_cover: "封面",
    db_col_info: "作品資訊",
    db_col_release: "發行日",
    db_col_status: "狀態",
    db_status_ok: "完整",
    db_status_missing: "缺漏",
    db_empty: "找不到符合條件的歌曲。",

    // Add / Edit Song
    form_title_add: "新增作品",
    form_title_edit: "編輯作品",
    form_mode_single: "單曲填寫",
    form_mode_album: "整張專輯匯入",
    form_mode_mb: "MusicBrainz 同步", // NEW
    form_search_single: "從 Spotify 搜尋單曲",
    form_search_album: "從 Spotify 搜尋專輯",
    form_search_mb: "Willwi 的作品目錄 (MusicBrainz)", // NEW
    form_search_btn: "搜尋",
    form_search_searching: "搜尋中...",
    form_import_btn: "帶入資料",
    form_section_basic: "基本資訊",
    form_label_title: "歌名",
    form_label_version: "版本標記 (如: Acoustic)",
    form_label_lang: "語言",
    form_label_project: "專案類型",
    form_label_date: "發行日期",
    form_label_cover: "封面圖片 URL",
    form_label_pick: "編輯精選",
    form_section_meta: "識別碼 (Metadata)",
    form_section_links: "外部連結與內容",
    form_label_youtube: "YouTube 連結",
    form_label_spotify: "Spotify 連結",
    form_label_apple: "Apple Music 連結",
    form_label_lyrics: "歌詞",
    form_label_desc: "描述/文案",
    form_label_credits: "製作團隊",
    form_btn_cancel: "取消",
    form_btn_save: "儲存至資料庫",
    form_btn_saving: "儲存中...",

    // Song Detail
    detail_ai_btn: "生成 AI 樂評",
    detail_ai_loading: "生成中...",
    detail_tab_story: "創作故事",
    detail_tab_maker: "歌詞影片製作",
    detail_lyrics_header: "完整歌詞",
    detail_links_header: "外部平台連結",
    detail_player_header: "試聽與觀看",

    // Common
    btn_edit: "編輯",
    btn_delete: "刪除",
    msg_confirm_delete: "確定要刪除這首歌嗎？",
    msg_save_success: "儲存成功！",
    msg_save_error: "儲存失敗。",
  }
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof TRANSLATIONS['en']) => any; // Changed to any to support array return
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('en'); // Default to English

  const t = (key: keyof typeof TRANSLATIONS['en']) => {
    return TRANSLATIONS[lang][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
