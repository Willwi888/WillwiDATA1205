import React, { createContext, useContext, useState, ReactNode } from 'react';

type Lang = 'en' | 'zh';

const TRANSLATIONS = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_interactive: "Interactive Lab", 
    nav_catalog: "Catalog",
    nav_add: "Add",
    footer_rights: "Willwi Music. All rights reserved.",
    
    // Hero Generic
    hero_title: "WILLWI",
    hero_subtitle: "OFFICIAL CREATIVE TOOL",
    hero_desc: "Support the Musician • Lyric Video Creation Tool",
    common_verified: "Official Verified",

    // Home Column 1: Dynamic Lyric Video
    home_col_resonance_title: "Dynamic Lyric Video",
    home_col_resonance_desc: "Handcrafted Lyric Creation",
    home_col_resonance_price: "NT$ 320",
    home_col_resonance_li1: "✦ Create 1 Lyric Video",
    home_col_resonance_li2: "✦ Support the Artist",
    home_col_resonance_li3: "✦ Digital Certificate",
    home_btn_enter: "CREATE NOW",

    // Home Column 2: Cloud Cinema
    home_tag_premium: "Premium",
    home_col_cinema_title: "Cloud Cinema + Sign",
    home_col_cinema_desc: "High-Def with Digital Autograph",
    home_col_cinema_price: "NT$ 2,800",
    home_col_cinema_li1: "✦ 4K High Definition",
    home_col_cinema_li2: "✦ Artist Digital Signature",
    home_col_cinema_li3: "✦ Embedded in Video",
    home_btn_details: "ORDER",

    // Home Column 3: Pure Support
    home_col_support_title: "Music Sustenance",
    home_col_support_desc: "Pure Support",
    home_col_support_price: "NT$ 100",
    home_col_support_li1: "✦ Buy Willwi a Meal",
    home_col_support_li2: "✦ Keep Creation Alive",
    home_col_support_li3: "✦ Direct Contribution",
    home_btn_support: "SUPPORT",

    // Guide Section
    guide_section_subtitle: "Workflow",
    guide_section_title: "How to Create",
    
    guide_step1_title: "SELECT & EXPLORE",
    guide_step1_desc: "Browse the catalog.\nChoose a song that belongs to you at this moment.",
    
    guide_step2_title: "HANDCRAFT SYNC",
    guide_step2_desc: "Enter the Interactive Lab.\nSync lyrics with your own hands.",
    
    guide_step3_title: "SUPPORT & KEEP",
    guide_step3_desc: "Support creation & Keep the memory.\nReceive your unique video.",

    // Database / Other
    db_title: "Music Catalog",
    db_search_placeholder: "Search title...",
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

    // Payment Modal
    modal_title: "Participant Identity",
    modal_close: "Close",
    modal_name: "Name",
    modal_email: "Email",
    modal_tab_interactive: "Lyric Video",
    modal_tab_interactive_sub: "Create Dynamic Video",
    modal_tab_interactive_note: "PRICE: NT$ 320 / Track",
    modal_tab_cinema: "Premium Cinema",
    modal_tab_cinema_sub: "High-Def + Signature",
    modal_tab_support: "Music Sustenance",
    modal_tab_support_sub: "Pure Support",
    modal_tab_support_note: "DEFAULT: NT$ 100",
    modal_payment_header: "Payment Method",
    modal_payment_sub: "Secure Payment",
    
    // Bank / Manual
    modal_manual_title: "Bank Transfer / LINE",
    modal_manual_desc: "Direct Transfer & Verification",
    modal_bank_info: "Bank Transfer Info",
    modal_bank_code: "Bank Code",
    modal_bank_account: "Account",
    modal_bank_copy: "COPY",
    modal_line_title: "LINE Official",
    modal_line_desc: "Scan to add friend for verification",
    modal_manual_btn: "I Have Transferred (Start)",
    modal_manual_note: "* Please screenshot transfer and send to LINE for access code.",

    // PayPal
    modal_paypal_title: "PayPal Support",
    modal_paypal_desc: "International Transfer",
    modal_paypal_btn: "Proceed with PayPal",
    modal_paypal_note: "Contribution to support creativity",
    
    modal_confirm_btn: "Verify & Enter",
    modal_confirm_btn_invalid: "Fill Identity to Confirm",
    modal_contribution_title: "Order Summary",
    modal_interactive_desc: "Supports the artist and grants access to the creation tool.",
    modal_cinema_desc: "Includes 4K rendering and a digital signature embedded in the video.",
    modal_support_desc: "Direct support for the artist's living expenses.",
    modal_custom_amount_label: "Custom Amount",
    modal_custom_amount_hint: "Default 100",
    modal_footer_thanks: "Thank you for your support",
    modal_session_unit: "UNIT",
    
    // Payment Modal Extras
    payment_gateway_selected: "Method",
    payment_total: "Total",
    payment_scan_label: "Scan to Pay",
    payment_open_link: "OPEN LINK",
    payment_confirm: "CONFIRM",
    payment_disclaimer: "* Support funds for creativity.",
    payment_sessions: "Quantity",
    payment_support_unit: "Unit Price",
    payment_service_fee: "Service Fee",
    payment_premium_tier: "PREMIUM TIER",

    // Interactive Mode
    interactive_menu_title: "Creative Studio",
    interactive_menu_subtitle: "Support Willwi • Create Your Lyric Video",
    interactive_opt_resonance: "Dynamic Video",
    interactive_opt_resonance_sub: "NT$ 320",
    interactive_opt_support: "Support",
    interactive_opt_support_sub: "NT$ 100",
    interactive_opt_cinema: "Cinema + Sign",
    interactive_opt_cinema_sub: "NT$ 2,800",
    interactive_admin_lab: "[ADMIN] Lab",
    interactive_back_menu: "← Back",

    interactive_intro_method: "Disclaimer",
    interactive_intro_title: "Important Notice",
    interactive_intro_desc: "The content provided on this platform does not involve the sale of songs, lyrics, or any digital goods, nor does it involve copyright licensing, transfer, or downloading.\n\nThe related fees are used to support the time and labor invested by the creator, including the manual lyric synchronization and the guided creative participation process.\n\nIf you only wish to listen to music, please visit major music streaming platforms.\nYour support allows the creator to continue investing time in crafting these experiences.",
    interactive_btn_participate: "I Understand & Select Track",

    interactive_gate_ticket: "Access Ticket",
    interactive_gate_session: "Single Session",
    interactive_gate_fee: "Fee",
    interactive_gate_pay_btn: "Support & Unlock",
    interactive_gate_pay_note: "Payment confirms your support for the artist's labor.",
    interactive_gate_ready: "Selected",
    interactive_gate_policy: "By paying, you support the artist.",
    interactive_gate_selected: "* Track Selected.",
    interactive_gate_enter_btn: "Enter Studio",
    interactive_gate_confirm: "* Confirm Support",

    interactive_welcome_title: "Studio Unlocked",
    interactive_welcome_desc: "Thank you for your support.\nLet's create your video.",
    interactive_btn_select: "Select Track",

    interactive_select_title: "Selection",
    interactive_select_subtitle: "Pick a song that resonates with you.",
    interactive_select_empty: "No tracks available.",
    interactive_select_start: "Start >",

    interactive_tool_prepare_title: "Studio Ready",
    interactive_tool_checklist_1: "✓ Audio",
    interactive_tool_checklist_2: "✓ Lyrics",
    interactive_tool_checklist_3: "✓ Engine",
    interactive_tool_desc: "Tap the screen to sync lyrics with the music.",
    interactive_tool_guide_title: "Guide",
    interactive_tool_guide_1: "Music starts when you click Start.",
    interactive_tool_guide_2_mobile: "Tap to advance lyrics.",
    interactive_tool_guide_2_desktop: "Press Space or Click to advance.",
    interactive_tool_guide_3: "Video generates automatically at the end.",
    interactive_tool_tip: "Relax and feel the rhythm.",
    interactive_tool_mobile_hint: "⚠️ Landscape Mode Recommended",
    interactive_btn_start_record: "START RECORDING",

    interactive_recording_hint_mobile: "TAP TO SYNC",
    interactive_recording_hint_desktop: "PRESS SPACE TO SYNC",
    interactive_recording_live: "REC",
    interactive_recording_turn_landscape: "Landscape",

    interactive_finished_title: "Creation Complete",
    interactive_finished_subtitle: "Success",
    interactive_finished_warning: "⚠️ Download your video now.",
    interactive_finished_desc: "Here is your dynamic lyric video.",
    interactive_input_name: "Your Name (For Certificate)",
    interactive_btn_save_video: "Download Video",
    interactive_btn_get_cert: "Get Certificate",
    interactive_btn_return: "Back to Menu",

    // Database Extras
    catalog_subtitle: "CATALOG",
    catalog_stats: "TRACKS",
    catalog_view_grid: "Grid",
    catalog_view_list: "List",
    catalog_filter_all: "All",
    catalog_col_asset: "Cover",
    catalog_col_metadata: "Data",
    catalog_col_release: "Release",
    catalog_col_action: "Action",
    catalog_btn_view: "VIEW",
    catalog_bar_selected_single: "Selected",
    catalog_bar_ready: "Ready",
    catalog_bar_selected_multi: "Selected",
    catalog_bar_admin_mode: "Admin",
    catalog_bar_cancel: "Cancel",
    catalog_bar_start: "Start",

    // Song Detail Extras
    detail_back_link: "← Catalog",
    detail_btn_immersive: "Lyrics Mode",
    detail_btn_smartlink: "Listen / Buy",
    detail_btn_start_session: "Create Lyric Video (NT$ 320)",
    detail_status_instrumental: "Instrumental",
    detail_status_closed: "Not Available",
    detail_section_context: "Story",
    detail_section_lyrics: "Lyrics",
    detail_section_credits: "Credits",
    detail_empty_desc: "No description.",
    detail_empty_lyrics: "No lyrics.",
    detail_empty_credits: "No credits.",
  },
  zh: {
    // Navigation
    nav_home: "首頁",
    nav_interactive: "互動創作",
    nav_catalog: "作品庫",
    nav_add: "登錄",
    footer_rights: "Willwi Music. 版權所有",

    // Hero Generic
    hero_title: "WILLWI",
    hero_subtitle: "支持音樂人 歌詞影片創作工具",
    hero_desc: "這不是串流平台  這是支持 Willwi 創作的互動基地",
    common_verified: "官方認證",

    // Home Column 1: Resonance Sync
    home_col_resonance_title: "動態歌詞影片",
    home_col_resonance_desc: "手工對時創作體驗",
    home_col_resonance_price: "NT$ 320",
    home_col_resonance_li1: "✦ 製作一首專屬動態影片",
    home_col_resonance_li2: "✦ 支持音樂人創作",
    home_col_resonance_li3: "✦ 獲得數位參與證書",
    home_btn_enter: "開始製作",

    // Home Column 2: Cloud Cinema
    home_tag_premium: "典藏",
    home_col_cinema_title: "高畫質+歌手簽名",
    home_col_cinema_desc: "專屬簽名嵌入影片",
    home_col_cinema_price: "NT$ 2,800",
    home_col_cinema_li1: "✦ 4K 高畫質重製",
    home_col_cinema_li2: "✦ 歌手親筆數位簽名嵌入",
    home_col_cinema_li3: "✦ 獨一無二的收藏",
    home_btn_details: "訂製",

    // Home Column 3: Pure Support -> Music Sustenance
    home_col_support_title: "音樂食糧",
    home_col_support_desc: "純粹支持",
    home_col_support_price: "NT$ 100",
    home_col_support_li1: "✦ 贊助一頓飯錢",
    home_col_support_li2: "✦ 延續創作能量",
    home_col_support_li3: "✦ 直接挹注貢獻",
    home_btn_support: "投食",

    // Guide Section (UPDATED FOR INTERACTIVE FLOW)
    guide_section_subtitle: "Workflow",
    guide_section_title: "如何參與創作",
    
    guide_step1_title: "SELECT & EXPLORE",
    guide_step1_desc: "走進作品資料庫\n慢慢選一首此刻屬於你的歌",
    
    guide_step2_title: "HANDCRAFT SYNC",
    guide_step2_desc: "進入互動實驗室\n用雙手完成歌詞與音樂的對齊",
    
    guide_step3_title: "SUPPORT & KEEP",
    guide_step3_desc: "支持創作並獲得\n留下你參與過的那一刻",

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

    // Payment Modal
    modal_title: "參與者身份",
    modal_close: "關閉",
    modal_name: "姓名",
    modal_email: "信箱",
    modal_tab_interactive: "動態歌詞影片",
    modal_tab_interactive_sub: "製作專屬影片",
    modal_tab_interactive_note: "支持：NT$ 320 / 首",
    modal_tab_cinema: "高畫質+簽名",
    modal_tab_cinema_sub: "專屬收藏",
    modal_tab_support: "音樂食糧",
    modal_tab_support_sub: "純粹支持",
    modal_tab_support_note: "預設：NT$ 100",
    modal_payment_header: "支持方式",
    modal_payment_sub: "匯款 / PayPal",
    
    // Bank / Manual
    modal_manual_title: "銀行匯款 / LINE",
    modal_manual_desc: "直接匯款與官方驗證",
    modal_bank_info: "匯款資訊",
    modal_bank_code: "銀行代碼",
    modal_bank_account: "匯款帳號",
    modal_bank_copy: "複製",
    modal_line_title: "LINE 官方帳號",
    modal_line_desc: "加入好友進行確認或直接支持",
    modal_manual_btn: "我已匯款，開始製作 (Start)",
    modal_manual_note: "請務必截圖匯款畫面，稍後透過 LINE 官方帳號傳送給 Willwi 核對以取得通行碼。",

    // PayPal
    modal_paypal_title: "PayPal 支持",
    modal_paypal_desc: "跨國安全匯款",
    modal_paypal_btn: "前往 PayPal 付款",
    modal_paypal_note: "此款項為支持創作之用途 非商品交易",
    
    modal_confirm_btn: "確認支持並進入",
    modal_confirm_btn_invalid: "請填寫身份以確認",
    modal_contribution_title: "您的貢獻",
    modal_interactive_desc: "選擇製作數量，您的每一份支持，都將讓音樂創作持續下去。",
    modal_cinema_desc: "高規格 4K 影片渲染，並將歌手親筆簽名嵌入影片畫面中，極具收藏價值。",
    modal_support_desc: "這是一份音樂食糧，讓 Willwi 能夠吃飽，繼續有力氣做音樂。",
    modal_custom_amount_label: "金額",
    modal_custom_amount_hint: "預設 100 元 (可調整)",
    modal_footer_thanks: "感謝您的溫度",
    modal_session_unit: "首",

    // Payment Modal Extras
    payment_gateway_selected: "選擇的通路",
    payment_total: "支持總額",
    payment_scan_label: "掃碼支付 (Scan to Pay)",
    payment_open_link: "開啟連結 (或掃描上方)",
    payment_confirm: "確認支持 (CONFIRM)",
    payment_disclaimer: "* 此款項為支持創作之用途，非商品販售交易。",
    payment_sessions: "製作數量",
    payment_support_unit: "單價",
    payment_service_fee: "服務費用",
    payment_premium_tier: "典藏等級",

    // Interactive Mode
    interactive_menu_title: "創作實驗室",
    interactive_menu_subtitle: "支持 Willwi • 製作您的歌詞影片",
    interactive_opt_resonance: "動態歌詞影片",
    interactive_opt_resonance_sub: "NT$ 320",
    interactive_opt_support: "純粹支持",
    interactive_opt_support_sub: "NT$ 100",
    interactive_opt_cinema: "高畫質+簽名",
    interactive_opt_cinema_sub: "NT$ 2,800",
    interactive_admin_lab: "[管理] 實驗室",
    interactive_back_menu: "← 回選單",

    interactive_intro_method: "重要聲明",
    interactive_intro_title: "本平台非販售商品",
    interactive_intro_desc: "本平台所提供之內容\n並非購買歌曲、歌詞或任何數位商品\n亦不涉及著作權授權、轉讓或下載行為\n\n相關費用係用於支持創作者投入之人工時間\n包含手工歌詞對位與創作引導之參與過程\n\n如僅需聆聽音樂，請至各大音樂平台收聽\n這裡不是購買歌曲，而是邀請您支持創作",
    interactive_btn_participate: "我了解 • 選擇曲目",

    interactive_gate_ticket: "通行證",
    interactive_gate_session: "單次製作",
    interactive_gate_fee: "費用",
    interactive_gate_pay_btn: "支持並解鎖",
    interactive_gate_pay_note: "付款完成後，請輸入通行碼。",
    interactive_gate_ready: "準備就緒",
    interactive_gate_policy: "點擊付款，即表示您願意支持創作者。",
    interactive_gate_selected: "* 作品已選定。",
    interactive_gate_enter_btn: "進入製作室",
    interactive_gate_confirm: "* 確認支持",

    interactive_welcome_title: "製作室已開啟",
    interactive_welcome_desc: "謝謝您的支持。\n現在，請開始製作您的影片。",
    interactive_btn_select: "選擇曲目",

    interactive_select_title: "曲目票選",
    interactive_select_subtitle: "請選擇 1 首您最喜愛的歌曲，開始創作。",
    interactive_select_empty: "目前無可用曲目。",
    interactive_select_start: "開始製作 >",

    interactive_tool_prepare_title: "準備開始",
    interactive_tool_checklist_1: "✓ 音訊載入",
    interactive_tool_checklist_2: "✓ 歌詞載入",
    interactive_tool_checklist_3: "✓ 引擎就緒",
    interactive_tool_desc: "請隨音樂節奏點擊螢幕，以同步歌詞。",
    interactive_tool_guide_title: "操作說明",
    interactive_tool_guide_1: "點擊「開始錄製」後音樂即刻播放。",
    interactive_tool_guide_2_mobile: "在歌詞該出現時，點擊螢幕任意處。",
    interactive_tool_guide_2_desktop: "在歌詞該出現時，按空白鍵或點擊畫面。",
    interactive_tool_guide_3: "直到音樂結束，系統將自動產出影片。",
    interactive_tool_tip: "放輕鬆，感受節奏。",
    interactive_tool_mobile_hint: "⚠️ 建議使用橫向螢幕",
    interactive_btn_start_record: "開始錄製 (Start Recording)",

    interactive_recording_hint_mobile: "點擊螢幕同步歌詞",
    interactive_recording_hint_desktop: "按空白鍵同步歌詞",
    interactive_recording_live: "錄製中",
    interactive_recording_turn_landscape: "請轉橫屏",

    interactive_finished_title: "製作完成",
    interactive_finished_subtitle: "成功",
    interactive_finished_warning: "⚠️ 請立即下載您的影片。",
    interactive_finished_desc: "這是專屬於您的動態歌詞影片。",
    interactive_input_name: "輸入您的名字 (製作證書用)",
    interactive_btn_save_video: "下載影片 (MP4)",
    interactive_btn_get_cert: "領取證書",
    interactive_btn_return: "回選單",

    // Database Extras
    catalog_subtitle: "作品列表",
    catalog_stats: "首作品",
    catalog_view_grid: "網格",
    catalog_view_list: "列表",
    catalog_filter_all: "全部",
    catalog_col_asset: "封面",
    catalog_col_metadata: "資訊",
    catalog_col_release: "發行",
    catalog_col_action: "操作",
    catalog_btn_view: "查看",
    catalog_bar_selected_single: "已選擇",
    catalog_bar_ready: "準備就緒",
    catalog_bar_selected_multi: "已選擇",
    catalog_bar_admin_mode: "管理模式",
    catalog_bar_cancel: "取消",
    catalog_bar_start: "開始",

    // Song Detail Extras
    detail_back_link: "← 回作品庫",
    detail_btn_immersive: "歌詞模式",
    detail_btn_smartlink: "收聽 / 購買",
    detail_btn_start_session: "製作歌詞影片 (NT$ 320)",
    detail_status_instrumental: "純音樂 (無歌詞)",
    detail_status_closed: "尚未開放",
    detail_section_context: "創作故事",
    detail_section_lyrics: "歌詞",
    detail_section_credits: "製作名單",
    detail_empty_desc: "暫無描述。",
    detail_empty_lyrics: "暫無歌詞。",
    detail_empty_credits: "暫無名單。",
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