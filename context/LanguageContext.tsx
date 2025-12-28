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

    // Guide Section (UPDATED FOR INTERACTIVE FLOW)
    guide_section_subtitle: "Operation Guide",
    guide_section_title: "How to Create",
    
    guide_step1_title: "SELECT TRACK & STYLE",
    guide_step1_desc: "Choose from the curated catalog.\nConfigure your visual and sync style.",
    
    guide_step2_title: "HAND-SYNC RECORDING",
    guide_step2_desc: "Tap screen to advance lyrics with rhythm.\nManually craft every sync and emotion.",
    
    guide_step3_title: "GET MOTION VIDEO",
    guide_step3_desc: "System integrates your performance.\nGenerate your exclusive creative record.",

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

    // Payment Modal
    modal_title: "Participant Identity",
    modal_close: "Close",
    modal_name: "Name",
    modal_email: "Email",
    modal_tab_interactive: "Interactive Entry",
    modal_tab_interactive_sub: "Interactive Session",
    modal_tab_interactive_note: "SUPPORT: NT$ 320 / SESSION",
    modal_tab_cinema: "Cloud Cinema",
    modal_tab_cinema_sub: "High-Fidelity Production",
    modal_tab_support: "Music Sustenance",
    modal_tab_support_sub: "Pure Support",
    modal_tab_support_note: "DEFAULT: NT$ 100",
    modal_payment_header: "Support Method",
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
    modal_manual_btn: "I Have Transferred (Start Session)",
    modal_manual_note: "* Please screenshot your transfer and send to LINE Official for confirmation later.",

    // PayPal
    modal_paypal_title: "PayPal Support",
    modal_paypal_desc: "International Transfer",
    modal_paypal_btn: "Proceed with PayPal",
    modal_paypal_note: "Contribution to support creativity",
    
    modal_confirm_btn: "Verify & Enter",
    modal_confirm_btn_invalid: "Fill Identity to Confirm",
    modal_contribution_title: "Your Contribution",
    modal_interactive_desc: "Select sessions. Each support keeps the lab running.",
    modal_cinema_desc: "Exclusive 4K Video Production Service. Includes official assets.",
    modal_support_desc: "This is sustenance. Keep Willwi fed and creating.",
    modal_custom_amount_label: "Custom Amount",
    modal_custom_amount_hint: "Default 100 (Adjustable)",
    modal_footer_thanks: "Thank you for your warmth",
    modal_session_unit: "SESSION",
    
    // Payment Modal Extras
    payment_gateway_selected: "Selected Method",
    payment_total: "Total Support",
    payment_scan_label: "Scan to Pay / Transfer",
    payment_open_link: "OPEN LINK (or Scan Above)",
    payment_confirm: "CONFIRM SUPPORT",
    payment_disclaimer: "* Funds are for creative support, not product sales.",
    payment_sessions: "Sessions",
    payment_support_unit: "Support / Unit",
    payment_service_fee: "Service Fee",
    payment_premium_tier: "PREMIUM TIER",

    // Interactive Mode
    interactive_menu_title: "Creative Field",
    interactive_menu_subtitle: "This is not a store, but a creative laboratory.\nChoose your way to participate.",
    interactive_opt_resonance: "Resonance Sync",
    interactive_opt_resonance_sub: "Handcrafted Lyrics",
    interactive_opt_support: "Pure Support",
    interactive_opt_support_sub: "Pure Support",
    interactive_opt_cinema: "Cloud Cinema",
    interactive_opt_cinema_sub: "High-Def Production",
    interactive_admin_lab: "[ADMIN] AI Video Lab",
    interactive_back_menu: "← Back to Menu",

    interactive_intro_method: "How to Participate",
    interactive_intro_title: "Not a purchase, not a license\nA record of creative presence",
    interactive_intro_desc: "Special Note: The content provided on this platform\nis not for purchasing songs, lyrics, or any digital goods,\nnor does it involve copyright licensing, transfer, or download.\n\nThe fees are used to support the creator's time,\nincluding handcrafted lyric alignment and participation guidance.\n\nTo simply listen to music,\nplease visit major streaming platforms.",
    interactive_btn_participate: "Participate (NT$ 320)",

    interactive_gate_ticket: "Access Ticket",
    interactive_gate_session: "Single Session",
    interactive_gate_fee: "Entry Fee",
    interactive_gate_pay_btn: "Pay via Bank / Credit",
    interactive_gate_pay_note: "After payment, click the button on the right to enter.\nNo need to wait for callback.",
    interactive_gate_ready: "Ready to Enter",
    interactive_gate_policy: "By clicking payment, you understand and agree:\n・This is not a product sale\n・No license or rights transfer involved\n・This is a one-time record of creative participation",
    interactive_gate_selected: "* Work selected. Start immediately after pass.",
    interactive_gate_enter_btn: "Paid & Start Creation (START)",
    interactive_gate_confirm: "* By clicking, you confirm the support.",

    interactive_welcome_title: "Lab Unlocked",
    interactive_welcome_desc: "Thank you for participating.\nNext, please personally complete a\nlyric synchronization video as a record of this session.",
    interactive_btn_select: "Select Work",

    interactive_select_title: "Select Material",
    interactive_select_empty: "No active lyric sessions available.",
    interactive_select_start: "START SESSION >",

    interactive_tool_prepare_title: "Ready to Create",
    interactive_tool_checklist_1: "✓ Audio Loaded",
    interactive_tool_checklist_2: "✓ Lyrics Loaded",
    interactive_tool_checklist_3: "✓ Interface Ready",
    interactive_tool_desc: "Next, please align every line of lyrics personally.\nThe system will record your operation synchronously.",
    interactive_tool_guide_title: "Instructions",
    interactive_tool_guide_1: "Music starts immediately after clicking Start.",
    interactive_tool_guide_2_mobile: "Tap screen when you feel the lyrics should appear.",
    interactive_tool_guide_2_desktop: "Tap screen or press Space/Enter when lyrics should appear.",
    interactive_tool_guide_3: "Until [ END ] appears. Video will be generated.",
    interactive_tool_tip: "No need for perfection,\nthis is a creative practice.",
    interactive_tool_mobile_hint: "⚠️ Landscape Recommended",
    interactive_btn_start_record: "Start Recording",

    interactive_recording_hint_mobile: "TAP SCREEN TO SYNC",
    interactive_recording_hint_desktop: "TAP or SPACEBAR to Sync",
    interactive_recording_live: "Recording Live",
    interactive_recording_turn_landscape: "Turn Landscape",

    interactive_finished_title: "Creation Complete",
    interactive_finished_subtitle: "Session Completed",
    interactive_finished_warning: "⚠️ Important: File generated client-side. Lost if you leave.",
    interactive_finished_desc: "This video is the creative record of this participation.\nPlease download your work and digital certificate immediately.",
    interactive_input_name: "Enter your name (For Certificate)",
    interactive_btn_save_video: "Save Video (MP4)",
    interactive_btn_get_cert: "Get Certificate",
    interactive_btn_return: "Return to Menu",

    // Database Extras
    catalog_subtitle: "WILLWI CATALOG",
    catalog_stats: "TOTAL TRACKS",
    catalog_view_grid: "Grid",
    catalog_view_list: "List",
    catalog_filter_all: "All Languages",
    catalog_col_asset: "Asset",
    catalog_col_metadata: "Metadata",
    catalog_col_release: "Release",
    catalog_col_action: "Action",
    catalog_btn_view: "VIEW",
    catalog_bar_selected_single: "Track Selected",
    catalog_bar_ready: "Ready to create",
    catalog_bar_selected_multi: "Tracks Selected",
    catalog_bar_admin_mode: "Admin Bulk Mode",
    catalog_bar_cancel: "Cancel",
    catalog_bar_start: "Start Interactive Session",

    // Song Detail Extras
    detail_back_link: "← Back to Catalog",
    detail_btn_immersive: "Immersive Lyrics",
    detail_btn_smartlink: "ALL PLATFORMS (HyperFollow)",
    detail_btn_start_session: "Enter Interactive Lab (Start Session)",
    detail_status_instrumental: "Instrumental (No Lyrics)",
    detail_status_closed: "Interactive Mode Closed",
    detail_section_context: "Context & Story",
    detail_section_lyrics: "Lyric Archive",
    detail_section_credits: "Credits",
    detail_empty_desc: "Historical data not available.",
    detail_empty_lyrics: "No transcripts found.",
    detail_empty_credits: "Production team undisclosed.",
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

    // Guide Section (UPDATED FOR INTERACTIVE FLOW)
    guide_section_subtitle: "Operation Guide",
    guide_section_title: "如何參與創作",
    
    guide_step1_title: "選擇曲目與風格",
    guide_step1_desc: "從精選作品中挑選\n配置您喜愛的視覺與對位樣式",
    
    guide_step2_title: "手工對時錄製",
    guide_step2_desc: "隨節奏點擊螢幕推進歌詞\n親手完成每一句同步與情感對位",
    
    guide_step3_title: "獲取動態影片",
    guide_step3_desc: "系統自動整合錄製成果與音訊\n產出專屬您的創作紀錄檔案",

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
    modal_tab_interactive: "互動創作",
    modal_tab_interactive_sub: "參與創作實驗",
    modal_tab_interactive_note: "支持：NT$ 320 / 次",
    modal_tab_cinema: "雲端影院",
    modal_tab_cinema_sub: "專屬動態影片創作",
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
    modal_manual_btn: "我已匯款，開始體驗 (Start)",
    modal_manual_note: "請務必截圖匯款畫面，稍後透過 LINE 官方帳號傳送給 Willwi 核對。",

    // PayPal
    modal_paypal_title: "PayPal 支持",
    modal_paypal_desc: "跨國安全匯款",
    modal_paypal_btn: "前往 PayPal 付款",
    modal_paypal_note: "此款項為支持創作之用途 非商品交易",
    
    modal_confirm_btn: "確認支持並進入",
    modal_confirm_btn_invalid: "請填寫身份以確認",
    modal_contribution_title: "您的貢獻",
    modal_interactive_desc: "選擇參與次數 您的每一份支持 都將讓實驗場持續運作",
    modal_cinema_desc: "專屬歌曲動態影片創作支持 (4K/無損音質)",
    modal_support_desc: "這是一份音樂食糧 讓 Willwi 能夠吃飽 繼續有力氣做音樂",
    modal_custom_amount_label: "金額",
    modal_custom_amount_hint: "預設 100 元 (可調整)",
    modal_footer_thanks: "感謝您的溫度",
    modal_session_unit: "次",

    // Payment Modal Extras
    payment_gateway_selected: "選擇的通路",
    payment_total: "支持總額",
    payment_scan_label: "掃碼支付 (Scan to Pay)",
    payment_open_link: "開啟連結 (或掃描上方)",
    payment_confirm: "確認支持 (CONFIRM)",
    payment_disclaimer: "* 此款項為支持創作之用途，非商品販售交易。",
    payment_sessions: "參與次數",
    payment_support_unit: "單次支持",
    payment_service_fee: "服務費用",
    payment_premium_tier: "典藏等級",

    // Interactive Mode
    interactive_menu_title: "Creative Field",
    interactive_menu_subtitle: "這裡不是商店，而是創作實驗場。\n選擇你的參與方式。",
    interactive_opt_resonance: "Resonance Sync",
    interactive_opt_resonance_sub: "手工歌詞製作",
    interactive_opt_support: "Pure Support",
    interactive_opt_support_sub: "單純支持",
    interactive_opt_cinema: "Cloud Cinema",
    interactive_opt_cinema_sub: "雲端高畫質製作",
    interactive_admin_lab: "[ADMIN] AI Video Lab",
    interactive_back_menu: "← 回選單",

    interactive_intro_method: "參與一首歌的方式",
    interactive_intro_title: "這不是購買，也不是授權\n是一次創作在場的紀錄",
    interactive_intro_desc: "特別強調 本平台所提供之內容\n並非購買歌曲、歌詞或任何數位商品\n亦不涉及著作權授權、轉讓或下載行為\n\n相關費用係用於支持創作者投入之人工時間\n包含手工歌詞對位與創作引導之參與過程\n\n如僅需聆聽音樂\n請至各大音樂平台收聽",
    interactive_btn_participate: "參與創作 (NT$ 320)",

    interactive_gate_ticket: "Access Ticket",
    interactive_gate_session: "Single Session",
    interactive_gate_fee: "Entry Fee",
    interactive_gate_pay_btn: "Pay via Bank / Credit",
    interactive_gate_pay_note: "付款完成後，請直接點擊右側按鈕進入。\n無需等待回傳。",
    interactive_gate_ready: "Ready to Enter",
    interactive_gate_policy: "點擊付款，即表示你理解並同意：\n・這不是商品販售\n・不包含任何授權或權利轉移\n・此為一次性的創作參與紀錄",
    interactive_gate_selected: "* 已選擇作品，通過後直接開始。",
    interactive_gate_enter_btn: "我已付款，進入創作 (START)",
    interactive_gate_confirm: "* By clicking, you confirm the support.",

    interactive_welcome_title: "實驗場已解鎖",
    interactive_welcome_desc: "謝謝你選擇參與。\n接下來，請您親手完成一支\n歌詞時間對齊影片，作為這次參與的紀錄。",
    interactive_btn_select: "前往選曲 (Select Work)",

    interactive_select_title: "Select Material",
    interactive_select_empty: "No active lyric sessions available.",
    interactive_select_start: "START SESSION >",

    interactive_tool_prepare_title: "準備開始創作",
    interactive_tool_checklist_1: "✓ 音檔素材載入",
    interactive_tool_checklist_2: "✓ 歌詞文本載入",
    interactive_tool_checklist_3: "✓ 手工介面就緒",
    interactive_tool_desc: "接下來，請您親自對齊每一句歌詞。\n系統將同步錄製您的操作畫面。",
    interactive_tool_guide_title: "操作指引",
    interactive_tool_guide_1: "點擊開始後，音樂將隨即播放。",
    interactive_tool_guide_2_mobile: "當您感覺歌詞該出現時，請點擊螢幕任意處。",
    interactive_tool_guide_2_desktop: "當您感覺歌詞該出現時，請點擊畫面或按空白鍵/Enter。",
    interactive_tool_guide_3: "直到 [ END ] 出現，影片將自動完成並提供下載。",
    interactive_tool_tip: "不需要追求完美，\n這是一段創作練習。",
    interactive_tool_mobile_hint: "⚠️ 建議橫屏操作 (Landscape Recommended)",
    interactive_btn_start_record: "開始錄製 (Start Recording)",

    interactive_recording_hint_mobile: "TAP SCREEN TO SYNC",
    interactive_recording_hint_desktop: "TAP or SPACEBAR to Sync",
    interactive_recording_live: "Recording Live",
    interactive_recording_turn_landscape: "Turn Landscape",

    interactive_finished_title: "創作完成",
    interactive_finished_subtitle: "Session Completed",
    interactive_finished_warning: "⚠️ 重要：檔案由瀏覽器即時生成，離開此頁面後將無法找回。",
    interactive_finished_desc: "這支影片，是為這次參與留下的創作紀錄。\n請立即下載您的作品與數位證書。",
    interactive_input_name: "輸入您的名字 (簽署證書用)",
    interactive_btn_save_video: "儲存影片 (Save MP4)",
    interactive_btn_get_cert: "領取證書 (Get Cert)",
    interactive_btn_return: "Return to Menu",

    // Database Extras
    catalog_subtitle: "WILLWI CATALOG",
    catalog_stats: "TOTAL TRACKS",
    catalog_view_grid: "Grid",
    catalog_view_list: "List",
    catalog_filter_all: "All Languages",
    catalog_col_asset: "Asset",
    catalog_col_metadata: "Metadata",
    catalog_col_release: "Release",
    catalog_col_action: "Action",
    catalog_btn_view: "VIEW",
    catalog_bar_selected_single: "Track Selected",
    catalog_bar_ready: "Ready to create",
    catalog_bar_selected_multi: "Tracks Selected",
    catalog_bar_admin_mode: "Admin Bulk Mode",
    catalog_bar_cancel: "Cancel",
    catalog_bar_start: "Start Interactive Session (前往創作)",

    // Song Detail Extras
    detail_back_link: "← Back to Catalog",
    detail_btn_immersive: "Immersive Lyrics / 歌詞模式",
    detail_btn_smartlink: "ALL PLATFORMS (HyperFollow)",
    detail_btn_start_session: "進入互動實驗室 (Start Session)",
    detail_status_instrumental: "純音樂・無歌詞互動 (Instrumental)",
    detail_status_closed: "互動製作尚未開放 (Closed)",
    detail_section_context: "Context & Story",
    detail_section_lyrics: "Lyric Archive",
    detail_section_credits: "Credits",
    detail_empty_desc: "Historical data not available.",
    detail_empty_lyrics: "No transcripts found.",
    detail_empty_credits: "Production team undisclosed.",
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