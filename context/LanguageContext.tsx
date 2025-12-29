
import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_interactive: "Interactive Lab", 
    nav_catalog: "Catalog",
    nav_streaming: "Streaming",
    nav_add: "Login",
    nav_about: "About",
    nav_admin: "Manager",
    nav_exit_admin: "Exit Admin",
    footer_rights: "Willwi Music. All rights reserved.",
    
    // Streaming Page
    streaming_title: "STREAMING",
    streaming_subtitle: "Official Audio & Video Platforms",
    streaming_spotify_title: "Spotify Hub",
    streaming_spotify_desc: "Interactive Preview Player",
    streaming_youtube_title: "YouTube Exclusive",
    streaming_youtube_desc: "Private Video Vault",

    // Hero Generic
    hero_title: "WILLWI STUDIO",
    hero_verified: "OFFICIAL VERIFIED",
    hero_desc_long: "Support Musician WILLWI • Lyric Creation Tool\nSelect & Explore • Handcraft Sync • Support & Keep",

    // Home Columns
    home_col_resonance_title: "Handcraft Sync",
    home_col_resonance_desc: "Rhythmic Lyric Alignment",
    home_col_resonance_price: "NT$ 320",
    home_col_resonance_li1: "✦ 1 Interactive Video",
    home_col_resonance_li2: "✦ Creative Support",
    home_btn_enter: "ENTER LAB",

    home_tag_premium: "PREMIUM",
    home_col_cinema_title: "Cloud Cinema",
    home_col_cinema_desc: "4K High-Def + Digital Autograph",
    home_col_cinema_price: "NT$ 2,800",
    home_col_cinema_li1: "✦ 4K Rendering",
    home_col_cinema_li2: "✦ Artist Digital Signature",
    home_btn_details: "CUSTOMIZE",

    home_col_support_title: "Music Sustenance",
    home_col_support_desc: "Pure Creative Energy",
    home_col_support_price: "NT$ 100",
    home_col_support_li1: "✦ Keep Creation Alive",
    home_col_support_li3: "✦ Direct Contribution",
    home_btn_support: "SUPPORT",

    // Database
    db_title: "DATABASE",
    db_subtitle: "Willwi Official Catalog",
    db_search_placeholder: "SEARCH TRACK / ISRC...",
    db_filter_lang_all: "All Languages",
    db_empty: "Collection is silent.",

    // Interactive Intro
    interactive_disclaimer_1_title: "NOT A PURCHASE",
    interactive_disclaimer_1_text: "The content provided does not involve the sale of digital goods, nor copyright licensing. You are inviting support for creative labor.",
    interactive_disclaimer_2_title: "LABOR SUPPORT",
    interactive_disclaimer_2_text: "Fees are used to support the artist's time in manual alignment and guided participation.",
    interactive_disclaimer_3_title: "INVITATION",
    interactive_disclaimer_3_text: "If you only wish to listen, please visit major streaming platforms. This is a co-creator's invitation.",

    form_label_title: "Title",
    form_label_category: "Category",
    form_label_lang: "Language",
    form_label_date: "Date",
    form_label_publisher: "Publisher",
  },
  zh: {
    // Navigation
    nav_home: "首頁",
    nav_interactive: "互動創作", 
    nav_catalog: "作品庫",
    nav_streaming: "串流頻道",
    nav_add: "登錄",
    nav_about: "關於",
    nav_admin: "後台管理",
    nav_exit_admin: "登出管理",
    footer_rights: "Willwi Music. 版權所有",
    
    // Streaming Page
    streaming_title: "STREAMING",
    streaming_subtitle: "官方音樂與影音平台",
    streaming_spotify_title: "Spotify 歌手頁面",
    streaming_spotify_desc: "嵌入式互動試聽播放器",
    streaming_youtube_title: "YouTube 官方頻道",
    streaming_youtube_desc: "官網獨家影音專區",

    // Hero Generic
    hero_title: "WILLWI STUDIO",
    hero_verified: "官方認證",
    hero_desc_long: "支持音樂人 WILLWI 歌詞影片創作工具\n挑選作品 開始製作專屬您的動態歌詞影片",

    // Home Columns
    home_col_resonance_title: "動態歌詞影片",
    home_col_resonance_desc: "手工對時創作體驗",
    home_col_resonance_price: "NT$ 320",
    home_col_resonance_li1: "✦ 手工對時參與",
    home_col_resonance_li2: "✦ 支持藝術家勞動",
    home_btn_enter: "進入實驗室",

    home_tag_premium: "典藏",
    home_col_cinema_title: "雲端影院 + 簽名",
    home_col_cinema_desc: "高畫質嵌入歌手親筆簽名",
    home_col_cinema_price: "NT$ 2,800",
    home_col_cinema_li1: "✦ 4K 高畫質重製",
    home_col_cinema_li2: "✦ 歌手親筆數位簽名",
    home_btn_details: "專屬訂製",

    home_col_support_title: "音樂食糧",
    home_col_support_desc: "純粹創作能量挹注",
    home_col_support_price: "NT$ 100",
    home_col_support_li1: "✦ 贊助一份餐點",
    home_col_support_li3: "✦ 創作者社群感謝",
    home_btn_support: "投食",

    // Database
    db_title: "DATABASE",
    db_subtitle: "Willwi Official Catalog",
    db_search_placeholder: "搜尋作品名稱或 ISRC...",
    db_filter_lang_all: "所有語言",
    db_empty: "資料庫目前靜謐無聲。",

    // Interactive Intro
    interactive_disclaimer_1_title: "非商品販售",
    interactive_disclaimer_1_text: "本平台內容不涉及數位商品販售或著作權授權。你的支持是讓創作者能投入時間親手完成創作引導。",
    interactive_disclaimer_2_title: "支持創作勞動",
    interactive_disclaimer_2_text: "相關費用係用於支持創作者的手工對位與參與引導之人工勞務。",
    interactive_disclaimer_3_title: "共創者邀請",
    interactive_disclaimer_3_text: "如僅需聆聽音樂，請至各大音樂平台收聽。這裡不是購買歌曲，而是一種共創者的身份邀請。",

    form_label_title: "作品名稱",
    form_label_category: "發行類別",
    form_label_lang: "語系",
    form_label_date: "日期",
    form_label_publisher: "發行公司",
  }
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof TRANSLATIONS['en']) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('zh');
  const t = (key: keyof typeof TRANSLATIONS['en']) => {
      return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;
  };
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
