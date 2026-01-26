
import React, { useState, useEffect, useMemo } from 'react';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../context/LanguageContext';
import { useData } from '../context/DataContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'production' | 'support' | 'cinema';
}

const UNIT_PRICE = 320;
const CINEMA_PRICE = 2800;

const BANK_INFO = {
    code: "822",
    name: "中國信託 (CTBC)",
    account: "4405-3186-4207"
};

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, initialMode = 'production' }) => {
  const { user, login, addCredits, recordDonation } = useUser();
  const { globalSettings } = useData();
  const { t } = useTranslation();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [supportMode, setSupportMode] = useState<'production' | 'support' | 'cinema'>(initialMode);
  const [customAmount, setCustomAmount] = useState<number>(100);
  const [pointCount, setPointCount] = useState<number>(1);
  
  const [step, setStep] = useState<'qr' | 'verify'>('qr');
  const [inputCode, setInputCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
      if (isOpen) {
          setName(user?.name || '');
          setEmail(user?.email || '');
          setSupportMode(initialMode);
          setStep('qr');
          setInputCode('');
          setErrorMsg('');
      }
  }, [isOpen, initialMode, user]);

  if (!isOpen) return null;

  const currentQr = useMemo(() => {
    let q = '';
    if (supportMode === 'production') q = globalSettings.qr_production;
    else if (supportMode === 'cinema') q = globalSettings.qr_cinema;
    else q = globalSettings.qr_support;
    
    return q || globalSettings.qr_global_payment || "https://placehold.co/300x300/020617/fbbf24?text=WILLWI+PAY";
  }, [supportMode, globalSettings]);

  const totalAmount = supportMode === 'production' ? pointCount * UNIT_PRICE : (supportMode === 'cinema' ? CINEMA_PRICE : customAmount);
  const isFormValid = name.trim().length > 0 && email.includes('@');

  const handleVerifyCode = async () => {
      setIsProcessing(true);
      setErrorMsg('');
      await new Promise(r => setTimeout(r, 1000));
      const correctCode = globalSettings.accessCode || '8888';
      if (inputCode === correctCode) {
          if (supportMode === 'production') addCredits(pointCount, true, totalAmount);
          else recordDonation(totalAmount);
          onClose();
          alert("解鎖成功！");
      } else {
          setErrorMsg("通行碼錯誤。");
          setIsProcessing(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95" onClick={onClose}></div>
      <div className="relative z-10 bg-black border border-white/10 max-w-5xl w-full overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] animate-fade-in flex flex-col max-h-[90vh] font-thin">
        
        <div className="p-10 border-b border-white/5">
            <div className="flex justify-between items-start mb-12">
                <div>
                    <h3 className="text-3xl font-thin text-white uppercase tracking-[0.5em]">{t('modal_title')}</h3>
                    <p className="text-[10px] text-brand-accent font-thin uppercase tracking-widest mt-4 opacity-40">{supportMode} ACCESS CENTER</p>
                </div>
                <button onClick={onClose} className="text-white/20 hover:text-white text-[10px] uppercase tracking-widest transition-all">{t('modal_close')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <input className="bg-transparent border-b border-white/10 px-0 py-4 text-white text-base outline-none focus:border-brand-accent transition-all uppercase tracking-widest placeholder:text-white/5" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="bg-transparent border-b border-white/10 px-0 py-4 text-white text-base outline-none focus:border-brand-accent transition-all uppercase tracking-widest placeholder:text-white/5" placeholder="Your Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
        </div>

        <div className="flex flex-col lg:flex-row overflow-y-auto custom-scrollbar flex-grow p-10 gap-16">
            <div className="flex-1 bg-white p-12 text-slate-900">
                {step === 'qr' ? (
                    <div className="space-y-12">
                        <div className="flex justify-between items-end border-b border-slate-100 pb-10">
                            <div>
                                <span className="block text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest">Amount Due</span>
                                <span className="text-5xl font-thin tracking-tighter">NT$ {totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-100 p-8 flex flex-col items-center justify-center">
                            <img src={currentQr} alt="QR" className="w-48 h-48 object-contain mix-blend-multiply" />
                            <p className="text-[10px] text-slate-400 font-black uppercase mt-6 tracking-[0.4em]">SCAN TO COMPLETE</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-400">
                                <span>Bank Account</span>
                                <button onClick={() => { navigator.clipboard.writeText(BANK_INFO.account); alert("Copied!"); }} className="text-slate-900 border-b border-slate-200">Copy</button>
                            </div>
                            <p className="text-xl font-mono text-slate-900 text-center py-4 border border-slate-100">{BANK_INFO.account}</p>
                        </div>

                        <button onClick={() => { if (isFormValid) { login(name, email); setStep('verify'); } }} disabled={!isFormValid} className="w-full py-6 bg-slate-900 text-white font-black uppercase text-[11px] tracking-[0.5em] hover:bg-black transition-all">
                            Verify Transaction
                        </button>
                    </div>
                ) : (
                    <div className="py-24 text-center space-y-12 animate-fade-in">
                        <h4 className="text-[11px] font-black uppercase tracking-[1em] text-slate-400">Access Authentication</h4>
                        <input type="text" placeholder="CODE" className="w-full text-center text-5xl font-mono border-b border-slate-200 outline-none py-6 text-slate-900 tracking-[1em] placeholder:opacity-10" value={inputCode} onChange={(e) => setInputCode(e.target.value)} autoFocus />
                        {errorMsg && <p className="text-rose-600 text-[10px] font-black uppercase">{errorMsg}</p>}
                        <div className="flex gap-10">
                            <button onClick={() => setStep('qr')} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Back</button>
                            <button onClick={handleVerifyCode} disabled={!inputCode || isProcessing} className="flex-1 py-4 bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest">Unlock</button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="w-full lg:w-80 space-y-12">
                <div className="p-10 border border-white/5">
                    <h4 className="text-[10px] text-white/20 uppercase tracking-[1em] mb-10">Order</h4>
                    {supportMode === 'production' && (
                        <div className="space-y-8">
                            <div className="flex justify-between items-center text-xs text-white/60 tracking-widest uppercase">
                                <span>Credits</span>
                                <div className="flex items-center gap-6">
                                    <button onClick={() => setPointCount(Math.max(1, pointCount - 1))} className="text-brand-accent">-</button>
                                    <span className="font-mono">{pointCount}</span>
                                    <button onClick={() => setPointCount(pointCount + 1)} className="text-brand-accent">+</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}; export default PaymentModal;
