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
    hero_title: "WILLWI",
    hero_subtitle: "OFFICIAL PLATFORM  PARTICIPATION & SUPPORT",
    hero_desc: "This is not a streaming service  This is an interactive base for supporting Willwi's creation",
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

    // Home Column 3: Pure Support -> Music Sustenance
    home_col_support_title: "Music Sustenance",
    home_col_support_desc: "Pure Support",
    home_col_support_price: "NT$ 100",
    home_col_support_li1: "✦ Buy Willwi a Meal",
    home_col_support_li2: "✦ Keep Creation Alive",
    home_col_support_li3: "✦ Direct Contribution",
    home_btn_support: "FEED",

    // Guide Section
    guide_section_subtitle: "User Guide",
    guide_section_title: "How to Participate",
    
    guide_step1_title: "SELECT OPTION",
    guide_step1_desc: "Choose your support method above\n(Interactive, Premium, or Music Sustenance)",
    
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
    common_result: "Production Result",

    // Payment Modal (New Keys for Pure Language)
    modal_title: "Participant Identity",
    modal_close: "Close",
    modal_name: "Name",
    modal_email: "Email",
    modal_tab_interactive: "Interactive Entry",
    modal_tab_interactive_sub: "Interactive Session",
    modal_tab_interactive_note: "SUPPORT: NT$ 320 / SESSION",
    modal_tab_support: "Music Sustenance",
    modal_tab_support_sub: "Pure Support",
    modal_tab_support_note: "DEFAULT: NT$ 100",
    modal_payment_header: "Support Method",
    modal_payment_sub: "PayPal Only",
    modal_paypal_title: "PayPal Support",
    modal_paypal_desc: "Secure International Transfer",
    modal_paypal_btn: "Proceed with PayPal",
    modal_paypal_note: "Contribution to support creativity",
    modal_confirm_btn: "Verify & Enter",
    modal_confirm_btn_invalid: "Fill Identity to Confirm",
    modal_contribution_title: "Your Contribution",
    modal_interactive_desc: "Select sessions. Each support keeps the lab running.",
    modal_support_desc: "This is sustenance. Keep Willwi fed and creating.",
    modal_custom_amount_label: "Custom Amount",
    modal_custom_amount_hint: "Default 100 (Adjustable)",
    modal_footer_thanks: "Thank you for your warmth",
    modal_session_unit: "SESSION"
  },
  zh: {
    // Navigation
    nav_home: "首頁",
    nav_interactive: "互動引導",
    nav_catalog: "作品庫",
    nav_add: "登錄",
    footer_rights: "Willwi Music. 版權所有",

    // Hero Generic
    hero_title: "WILLWI",
    hero_subtitle: "官方平台  參與 ＆ 支持",
    hero_desc: "這不是串流平台  這是支持 Willwi 創作的互動基地",
    common_verified: "官方認證",

    // Home Column 1: Resonance Sync
    home_col_resonance_title: "共鳴同步",
    home_col_resonance_desc: "手工歌詞製作體驗",
    home_col_resonance_price: "NT$ 320",
    home_col_resonance_li1: "✦ 單次創作參與權限",
    home_col_resonance_li2: "✦ 手工互動體驗",
    home_col_resonance_li3: "✦ 數位參與證書",
    home_btn_enter: "進入",

    // Home Column 2: Cloud Cinema
    home_tag_premium: "典藏",
    home_col_cinema_title: "雲端影院",
    home_col_cinema_desc: "雲端高畫質製作",
    home_col_cinema_price: "NT$ 2,800",
    home_col_cinema_li1: "✦ 4K 高畫質重製",
    home_col_cinema_li2: "✦ 無損音質整合",
    home_col_cinema_li3: "✦ 數位親筆簽名",
    home_btn_details: "詳情",

    // Home Column 3: Pure Support -> Music Sustenance
    home_col_support_title: "音樂食糧",
    home_col_support_desc: "純粹支持",
    home_col_support_price: "NT$ 100",
    home_col_support_li1: "✦ 贊助一頓飯錢",
    home_col_support_li2: "✦ 延續創作能量",
    home_col_support_li3: "✦ 直接挹注貢獻",
    home_btn_support: "投食",

    // Guide Section
    guide_section_subtitle: "操作指南",
    guide_section_title: "參與方式說明",
    
    guide_step1_title: "選擇方式",
    guide_step1_desc: "從上方選擇您的支持方式\n(互動體驗、高畫質收藏或音樂食糧)",
    
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
    common_result: "製作成果",

    // Payment Modal (New Keys for Pure Language)
    modal_title: "參與者身份",
    modal_close: "關閉",
    modal_name: "姓名",
    modal_email: "信箱",
    modal_tab_interactive: "互動創作",
    modal_tab_interactive_sub: "參與創作實驗",
    modal_tab_interactive_note: "支持：NT$ 320 / 次",
    modal_tab_support: "音樂食糧",
    modal_tab_support_sub: "純粹支持",
    modal_tab_support_note: "預設：NT$ 100",
    modal_payment_header: "支持方式",
    modal_payment_sub: "僅限 PayPal",
    modal_paypal_title: "PayPal 支持",
    modal_paypal_desc: "跨國安全匯款",
    modal_paypal_btn: "前往 PayPal 付款",
    modal_paypal_note: "此款項為支持創作之用途 非商品交易",
    modal_confirm_btn: "確認支持並進入",
    modal_confirm_btn_invalid: "請填寫身份以確認",
    modal_contribution_title: "您的貢獻",
    modal_interactive_desc: "選擇參與次數 您的每一份支持 都將讓實驗場持續運作",
    modal_support_desc: "這是一份音樂食糧 讓 Willwi 能夠吃飽 繼續有力氣做音樂",
    modal_custom_amount_label: "金額",
    modal_custom_amount_hint: "預設 100 元 (可調整)",
    modal_footer_thanks: "感謝您的溫度",
    modal_session_unit: "次"
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