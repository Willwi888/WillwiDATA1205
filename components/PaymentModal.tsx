
import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../context/LanguageContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'production' | 'support' | 'cinema';
}

const UNIT_PRICE = 320;
const CINEMA_PRICE = 2800;

// Bank Info
const BANK_INFO = {
    code: "822",
    name: "中國信託 (CTBC)",
    account: "4405-3186-4207"
};

// Paypal Link (From ChatWidget config)
const PAYPAL_LINK = "https://www.paypal.com/ncp/payment/PNLV2V3PP47ZN";

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, initialMode = 'production' }) => {
  const { user, login, addCredits, recordDonation } = useUser();
  const { t } = useTranslation();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [supportMode, setSupportMode] = useState<'production' | 'support' | 'cinema'>(initialMode);
  const [customAmount, setCustomAmount] = useState<number>(100);
  const [pointCount, setPointCount] = useState<number>(1);
  const [isInfoLocked, setIsInfoLocked] = useState(false);
  
  // Payment Step: 'qr' -> 'verify'
  const [step, setStep] = useState<'qr' | 'verify'>('qr');
  const [inputCode, setInputCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Loaded Images
  const [qrImages, setQrImages] = useState({ global_payment: '', production: '', cinema: '', support: '', line: '' });

  useEffect(() => {
    if (user?.name && user?.email) {
      setName(user.name);
      setEmail(user.email);
      setIsInfoLocked(true);
    }
    // Load images from localstorage (uploaded via admin)
    setQrImages({
        global_payment: localStorage.getItem('qr_global_payment') || '',
        production: localStorage.getItem('qr_production') || '',
        cinema: localStorage.getItem('qr_cinema') || '',
        support: localStorage.getItem('qr_support') || '',
        line: localStorage.getItem('qr_line') || ''
    });
  }, [user, isOpen]);

  useEffect(() => {
      if (isOpen) {
          setSupportMode(initialMode);
          setStep('qr');
          setInputCode('');
          setErrorMsg('');
      }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  let totalAmount = 0;
  let currentQr = '';
  
  if (supportMode === 'production') {
      totalAmount = pointCount * UNIT_PRICE;
      currentQr = qrImages.production; 
  } else if (supportMode === 'cinema') {
      totalAmount = CINEMA_PRICE;
      currentQr = qrImages.cinema;
  } else {
      totalAmount = customAmount;
      currentQr = qrImages.support;
  }

  // FALLBACK: Use Universal/Global QR if specific one is missing
  if (!currentQr && qrImages.global_payment) {
      currentQr = qrImages.global_payment;
  }

  // Fallback for missing images entirely
  if (!currentQr) currentQr = "https://placehold.co/300x300/06c755/FFFFFF?text=LINE+PAY+QR";
  
  const isFormValid = name.trim().length > 0 && email.includes('@') && totalAmount > 0;

  const handleTransferred = () => {
      if (!isFormValid) { alert(t('modal_confirm_btn_invalid')); return; }
      login(name, email);
      setStep('verify');
  };

  const handleVerifyCode = async () => {
      setIsProcessing(true);
      setErrorMsg('');
      
      // Simulate network check
      await new Promise(r => setTimeout(r, 1000));

      const correctCode = localStorage.getItem('willwi_access_code') || '8888';
      
      if (inputCode === correctCode) {
          // Success
          if (supportMode === 'production') {
              addCredits(pointCount, true, totalAmount);
          } else {
              recordDonation(totalAmount);
          }
          
          const currentUrl = window.location.href.split('#')[0];
          window.location.href = `${currentUrl}#/interactive?payment=success&source=manual_code`;
          onClose();
      } else {
          setErrorMsg("通行碼錯誤 (Invalid Code)。請聯繫 LINE 客服確認。");
          setIsProcessing(false);
      }
  };

  const copyBankInfo = () => {
      navigator.clipboard.writeText(BANK_INFO.account);
      alert("帳號已複製 (Account Copied)");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={onClose}></div>
      
      <div className="relative z-10 bg-[#020617] border border-white/10 rounded-sm max-w-5xl w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* TOP IDENTITY SECTION */}
        <div className="p-8 bg-white/[0.02] border-b border-white/5">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-[0.3em]">{t('modal_title')}</h3>
                    <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mt-2">
                        {supportMode === 'production' && t('modal_tab_interactive_sub')}
                        {supportMode === 'cinema' && t('modal_tab_cinema_sub')}
                        {supportMode === 'support' && t('modal_tab_support_sub')}
                    </p>
                </div>
                <button onClick={onClose} className="text-slate-600 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors">{t('modal_close')}</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('modal_name')}</label>
                    <input 
                        className="w-full bg-transparent border-b border-white/10 px-0 py-2 text-white text-base focus:border-brand-gold outline-none transition-all placeholder-slate-800" 
                        placeholder={t('modal_name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isInfoLocked || step === 'verify'}
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('modal_email')}</label>
                    <input 
                        className="w-full bg-transparent border-b border-white/10 px-0 py-2 text-white text-base focus:border-brand-gold outline-none transition-all placeholder-slate-800" 
                        placeholder="contact@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isInfoLocked || step === 'verify'}
                    />
                </div>
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex flex-col lg:flex-row opacity-100 flex-grow">
            
            {/* LEFT: PAYMENT DETAILS */}
            <div className="flex-1 p-8 bg-slate-900/10 relative">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{t('modal_payment_header')}</span>
                    <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">SECURE CHECKOUT</span>
                </div>

                <div className="bg-white p-6 rounded-sm shadow-xl relative overflow-hidden min-h-[400px]">
                    <div className="flex justify-between items-end mb-6 border-b border-slate-100 pb-4">
                        <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1">{t('payment_total')}</span>
                            <span className="text-3xl font-black text-slate-900">NT$ {totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                                {supportMode === 'production' ? 'Interactive Ticket' : (supportMode === 'cinema' ? 'Cinema Access' : 'Donation')}
                            </span>
                        </div>
                    </div>
                    
                    {step === 'qr' ? (
                        <div className="animate-fade-in space-y-6 flex flex-col items-center">
                            
                            {/* OPTION 1: BANK TRANSFER */}
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-sm w-full">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-left">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{t('modal_bank_info')}</p>
                                        <p className="text-sm font-bold text-slate-800">{BANK_INFO.code} {BANK_INFO.name}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{t('modal_bank_account')}</p>
                                        <div className="flex items-center gap-2 justify-end">
                                            <p className="text-xl font-mono font-black text-emerald-600">{BANK_INFO.account}</p>
                                            <button onClick={copyBankInfo} className="text-[10px] bg-slate-200 px-2 py-1 rounded text-slate-600 hover:bg-slate-300 transition-colors uppercase font-bold">{t('modal_bank_copy')}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                {/* OPTION 2: LINE PAY QR */}
                                <div className="bg-[#06c755]/10 border border-[#06c755]/30 p-3 flex flex-col items-center justify-center text-center rounded-sm relative group">
                                    <div className="absolute top-2 right-2 bg-[#06c755] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Line Pay</div>
                                    <img 
                                        src={currentQr} 
                                        alt="Line Pay QR" 
                                        className="w-24 h-24 object-contain mix-blend-multiply my-2" 
                                    />
                                    <p className="text-[9px] text-[#06c755] font-bold uppercase tracking-widest">Scan with Line</p>
                                </div>

                                {/* OPTION 3: PAYPAL */}
                                <a 
                                    href={PAYPAL_LINK} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-[#003087]/10 border border-[#003087]/30 p-3 flex flex-col items-center justify-center text-center rounded-sm hover:bg-[#003087]/20 transition-all cursor-pointer group"
                                >
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm">
                                        <span className="text-[#003087] font-black text-lg italic">P</span>
                                    </div>
                                    <p className="text-[9px] text-[#003087] font-bold uppercase tracking-widest group-hover:underline">PayPal / Credit Card</p>
                                    <span className="text-[8px] text-slate-500 mt-1">International Support</span>
                                </a>
                            </div>

                            <button 
                                onClick={handleTransferred}
                                disabled={!isFormValid}
                                className={`w-full py-4 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg flex justify-center items-center gap-2 mt-2
                                    ${!isFormValid ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black'}`}
                            >
                                {t('modal_manual_btn')}
                            </button>
                            
                            <p className="text-[9px] text-slate-400 text-center">
                                {t('modal_manual_note')}
                            </p>

                            <button 
                                onClick={() => setStep('verify')}
                                className="mt-2 text-[10px] text-slate-500 font-bold underline hover:text-slate-800 transition-colors uppercase tracking-widest"
                            >
                                {t('modal_already_have_code')}
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fade-in flex flex-col justify-center h-full py-10">
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-brand-gold/20 text-brand-gold rounded-full flex items-center justify-center mx-auto border-2 border-brand-gold">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-lg font-black uppercase text-slate-800 tracking-widest">Verify Access</h4>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                        請將匯款/付款截圖傳送至 LINE 官方帳號。<br/>
                                        Willwi 確認後將提供您一組 <span className="font-bold text-slate-900">通行碼 (Access Code)</span>。
                                    </p>
                                </div>
                                <div className="max-w-xs mx-auto">
                                    <input 
                                        type="text" 
                                        placeholder="Enter Code (e.g. 8888)" 
                                        className="w-full text-center text-2xl font-mono border-b-2 border-slate-300 focus:border-brand-gold outline-none py-2 text-slate-900 placeholder-slate-300 tracking-[0.5em]"
                                        value={inputCode}
                                        onChange={(e) => setInputCode(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                {errorMsg && <p className="text-red-500 text-xs font-bold animate-pulse">{errorMsg}</p>}
                                
                                <div className="flex gap-4">
                                    <button onClick={() => setStep('qr')} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600">Back</button>
                                    <button 
                                        onClick={handleVerifyCode} 
                                        disabled={!inputCode || isProcessing}
                                        className={`flex-1 py-3 bg-brand-gold text-slate-900 font-black text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-lg ${isProcessing ? 'opacity-50' : ''}`}
                                    >
                                        {isProcessing ? 'Verifying...' : 'Unlock'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: ORDER SUMMARY */}
            <div className="w-full lg:w-80 bg-black/40 border-t lg:border-t-0 lg:border-l border-white/5 p-8 flex flex-col justify-between">
                <div>
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">{t('modal_contribution_title')}</span>
                    
                    {supportMode === 'production' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">{t('payment_sessions')}</span>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setPointCount(Math.max(1, pointCount - 1))} className="text-white hover:text-brand-gold text-lg">-</button>
                                    <span className="text-xl font-mono text-brand-gold">{pointCount}</span>
                                    <button onClick={() => setPointCount(pointCount + 1)} className="text-white hover:text-brand-gold text-lg">+</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>{t('payment_support_unit')}</span>
                                    <span>NT$ {UNIT_PRICE}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>{t('payment_total')}</span>
                                    <span>NT$ {totalAmount.toLocaleString()}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-loose border-t border-white/5 pt-4">
                                {t('modal_interactive_desc')}
                            </p>
                        </div>
                    )}

                    {supportMode === 'cinema' && (
                        <div className="space-y-6">
                            <div className="border border-brand-accent/30 bg-brand-accent/5 p-4 text-center">
                                <span className="text-brand-accent text-xs font-black uppercase tracking-widest">{t('payment_premium_tier')}</span>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>{t('payment_service_fee')}</span>
                                    <span>NT$ {CINEMA_PRICE.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>{t('payment_total')}</span>
                                    <span className="text-brand-accent">NT$ {CINEMA_PRICE.toLocaleString()}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-loose border-t border-white/5 pt-4">
                                {t('modal_cinema_desc')}
                            </p>
                        </div>
                    )}

                    {supportMode === 'support' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] text-slate-400 uppercase tracking-widest">{t('modal_custom_amount_label')}</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-slate-500 text-xs">NT$</span>
                                    <input 
                                        type="number" 
                                        className="w-full bg-slate-900 border border-white/10 pl-10 pr-4 py-3 text-white text-sm font-mono focus:border-orange-500 outline-none"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(Number(e.target.value))}
                                        min={10}
                                    />
                                </div>
                                <p className="text-[9px] text-slate-600">{t('modal_custom_amount_hint')}</p>
                            </div>
                            
                            <div className="py-4 border-t border-white/5 border-b border-white/5 my-4">
                               <ul className="space-y-3">
                                   <li className="flex items-center gap-3 text-[10px] text-slate-400">
                                       <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                                       {t('home_col_support_li1')}
                                   </li>
                                   <li className="flex items-center gap-3 text-[10px] text-slate-400">
                                       <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                                       {t('home_col_support_li2')}
                                   </li>
                                   <li className="flex items-center gap-3 text-[10px] text-slate-400">
                                       <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
                                       {t('home_col_support_li3')}
                                   </li>
                               </ul>
                           </div>

                            <p className="text-[10px] text-slate-500 leading-loose">
                                {t('modal_support_desc')}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-10 pt-6 border-t border-white/5">
                    <p className="text-[9px] text-slate-600 text-right">{t('modal_footer_thanks')}</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;
