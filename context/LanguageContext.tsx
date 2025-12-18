import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    nav_home: "Intro",
    nav_catalog: "Catalog",
    nav_interactive: "Interaction", 
    nav_add: "Add",
    footer_rights: "Willwi Music. All rights reserved.",
    
    hero_title: "WILLWI.",
    hero_subtitle: "Official Platform. Dedicated to Introduction, Interactive Guidance, Creative Explanation, and Data Collection.",
    hero_btn_db: "Explore Music",
    hero_btn_interactive: "Interactive Studio",
    
    home_verified_title: "Verified Artist",
    home_purpose_text: "This platform is built for deep musical connection. Beyond a simple database, it's a bridge between the creator's vision and the listener's heart through data-driven storytelling.",
    home_eco_text: "Building a sustainable creative ecosystem where every note is documented and every fan's resonance is valued.",

    db_title: "Music Catalog",
    db_search_placeholder: "Search title, ISRC, or keywords...",
    db_col_info: "Track Info",
    db_col_release: "Release Date",
    db_col_status: "Status",

    form_title_add: "Add New Work",
    form_section_basic: "Basic Information",
    form_label_title: "Song Title",
    form_label_lang: "Language",
    form_label_lyrics: "Lyrics",
    form_btn_save: "Save to Database",
    form_btn_cancel: "Cancel",
    form_btn_saving: "Saving...",
    
    msg_save_error: "Error saving to database.",
    
    common_verified: "Official Verified",
    common_result: "Production Result"
  },
  zh: {
    nav_home: "個人簡介",
    nav_catalog: "音樂庫",
    nav_interactive: "互動引導",
    nav_add: "登錄作品",
    footer_rights: "Willwi Music. 版權所有",

    hero_title: "WILLWI.",
    hero_subtitle: "官方互動平台：專注於個人簡介、製作導覽、創作解說與數據採集。", 
    hero_btn_db: "探索作品",
    hero_btn_interactive: "互動實驗室",

    home_verified_title: "官方認證藝人",
    home_purpose_text: "這不僅是一個音樂資料庫，更是一個深度連結創作者與聽眾的橋樑。我們透過數據與影像，完整紀錄每一段旋律背後的真實故事。",
    home_eco_text: "致力於建立永續的創作生態圈，讓每一份支持都能轉化為持續產出的熱能。",

    db_title: "作品資料庫",
    db_search_placeholder: "搜尋歌名、ISRC 或關鍵字...",
    db_col_info: "作品資訊",
    db_col_release: "發行日期",
    db_col_status: "狀態",

    form_title_add: "登錄新作品",
    form_section_basic: "基本資訊",
    form_label_title: "作品名稱",
    form_label_lang: "語系",
    form_label_lyrics: "歌詞內容",
    form_btn_save: "儲存作品",
    form_btn_cancel: "取消",
    form_btn_saving: "儲存中...",

    msg_save_error: "儲存至資料庫時發生錯誤。",

    common_verified: "官方認證",
    common_result: "製作成果"
  }
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof TRANSLATIONS['en']) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('zh');
  const t = (key: keyof typeof TRANSLATIONS['en']) => TRANSLATIONS[lang][key] || key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation error');
  return context;
};