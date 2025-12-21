import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_interactive: "Interactive Guide", 
    nav_catalog: "Music Library",
    nav_add: "Add",
    footer_rights: "Willwi Music. All rights reserved.",
    
    // Hero Generic
    hero_title: "WILLWI.",
    hero_subtitle: "OFFICIAL PLATFORM // PARTICIPATION & SUPPORT",
    hero_desc: "This is not a streaming service. This is an interactive base for supporting Willwi's creation.",
    common_verified: "Official Verified",

    // Home Column 1: Resonance Sync
    home_col_resonance_title: "Resonance Sync",
    home_col_resonance_desc: "Handcrafted Lyric Experience",
    home_col_resonance_price: "NT$ 320",
    home_col_resonance_li1: "✦ Access Single Session",
    home_col_resonance_li2: "✦ Handcrafted Interaction",
    home_col_resonance_li3: "✦ Digital Certificate",
    home_btn_enter: "ENTER",

    // Home Column 2: Cloud Cinema
    home_tag_premium: "Premium",
    home_col_cinema_title: "Cloud Cinema",
    home_col_cinema_desc: "Cloud High-Def Production",
    home_col_cinema_price: "NT$ 2,800",
    home_col_cinema_li1: "✦ 4K High Definition",
    home_col_cinema_li2: "✦ Lossless Audio",
    home_col_cinema_li3: "✦ Hand-Signed (Digital)",
    home_btn_details: "DETAILS",

    // Home Column 3: Pure Support
    home_col_support_title: "Pure Support",
    home_col_support_desc: "Pure Creative Support",
    home_col_support_price: "Flexible",
    home_col_support_li1: "✦ Support Creativity",
    home_col_support_li2: "✦ No Interaction Required",
    home_col_support_li3: "✦ Direct Contribution",
    home_btn_support: "SUPPORT",

    // Guide Section
    guide_section_subtitle: "User Guide",
    guide_section_title: "How to Participate",
    
    guide_step1_title: "SELECT OPTION",
    guide_step1_desc: "Choose your support method above\n(Interactive, Premium, or Pure Support)",
    
    guide_step2_title: "PROCESS PAYMENT",
    guide_step2_desc: "Secure payment via PayPal\nEnter process immediately after completion",
    
    guide_step3_title: "EXPERIENCE & KEEP",
    guide_step3_desc: "Experience the process or get the result\nLeave your connection with Willwi",

    // Database / Other
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
    common_result: "Production Result"
  },
  zh: {
    // Navigation
    nav_home: "活動首頁",
    nav_interactive: "互動引導",
    nav_catalog: "音樂庫",
    nav_add: "登錄作品",
    footer_rights: "Willwi Music. 版權所有",

    // Hero Generic
    hero_title: "WILLWI.",
    hero_subtitle: "官方平台 // 參與 ＆ 支持",
    hero_desc: "這不是串流平台。這是支持 Willwi 創作的互動基地。",
    common_verified: "官方認證",

    // Home Column 1: Resonance Sync
    home_col_resonance_title: "Resonance Sync",
    home_col_resonance_desc: "手工歌詞製作體驗",
    home_col_resonance_price: "NT$ 320",
    home_col_resonance_li1: "✦ 單次創作參與權限",
    home_col_resonance_li2: "✦ 手工互動體驗",
    home_col_resonance_li3: "✦ 數位參與證書",
    home_btn_enter: "進入 (ENTER)",

    // Home Column 2: Cloud Cinema
    home_tag_premium: "Premium",
    home_col_cinema_title: "Cloud Cinema",
    home_col_cinema_desc: "雲端高畫質製作",
    home_col_cinema_price: "NT$ 2,800",
    home_col_cinema_li1: "✦ 4K 高畫質重製",
    home_col_cinema_li2: "✦ 無損音質整合",
    home_col_cinema_li3: "✦ 數位親筆簽名",
    home_btn_details: "詳情 (DETAILS)",

    // Home Column 3: Pure Support
    home_col_support_title: "Pure Support",
    home_col_support_desc: "單純支持創作",
    home_col_support_price: "自由金額",
    home_col_support_li1: "✦ 支持創作能量",
    home_col_support_li2: "✦ 無需進行互動",
    home_col_support_li3: "✦ 直接挹注貢獻",
    home_btn_support: "支持 (SUPPORT)",

    // Guide Section
    guide_section_subtitle: "操作指南",
    guide_section_title: "參與方式說明",
    
    guide_step1_title: "選擇方式",
    guide_step1_desc: "從上方選擇您的支持方式\n(互動體驗、高畫質收藏或純支持)",
    
    guide_step2_title: "安全付款",
    guide_step2_desc: "透過 PayPal 安全付款\n完成後直接進入對應流程",
    
    guide_step3_title: "體驗與收藏",
    guide_step3_desc: "體驗創作過程或獲得成品\n留下您與 Willwi 的連結",

    // Database / Other
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