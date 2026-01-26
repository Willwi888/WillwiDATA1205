
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
      <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" onClick={onClose}></div>
      <div className="relative z-10 bg-[#020617] border border-white/10 rounded-sm max-w-5xl w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
        
        <div className="p-8 bg-white/[0.02] border-b border-white/5">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-[0.3em]">{t('modal_title')}</h3>
                    <p className="text-[10px] text-brand-gold font-bold uppercase tracking-widest mt-2">{supportMode} ACCESS</p>
                </div>
                <button onClick={onClose} className="text-slate-600 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors">{t('modal_close')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <input className="bg-black/40 border border-white/10 px-4 py-3 text-white text-sm outline-none" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <input className="bg-black/40 border border-white/10 px-4 py-3 text-white text-sm outline-none" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
        </div>

        <div className="flex flex-col lg:flex-row overflow-y-auto custom-scrollbar flex-grow p-8 gap-8">
            <div className="flex-1 bg-white rounded-sm p-8 text-slate-900">
                {step === 'qr' ? (
                    <div className="space-y-8">
                        <div className="flex justify-between items-end border-b border-slate-100 pb-6">
                            <div>
                                <span className="block text-[9px] text-slate-400 font-black uppercase mb-1">Total Amount</span>
                                <span className="text-4xl font-black tracking-tighter">NT$ {totalAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-200 p-6 flex justify-between items-center">
                            <div className="space-y-1">
                                <p className="text-[9px] text-slate-400 font-black uppercase">Bank Account</p>
                                <p className="text-lg font-mono font-black text-emerald-600">{BANK_INFO.account}</p>
                            </div>
                            <button onClick={() => { navigator.clipboard.writeText(BANK_INFO.account); alert("Copied!"); }} className="text-[9px] border px-4 py-2 uppercase font-black">Copy</button>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 p-6 flex flex-col items-center justify-center">
                            <img src={currentQr} alt="QR" className="w-40 h-40 object-contain mix-blend-multiply" />
                            <p className="text-[9px] text-emerald-600 font-black uppercase mt-4">SCAN TO PAY</p>
                        </div>
                        <button onClick={() => { if (isFormValid) { login(name, email); setStep('verify'); } }} disabled={!isFormValid} className="w-full py-6 bg-slate-900 text-white font-black uppercase text-xs tracking-widest hover:bg-brand-gold hover:text-black">
                            I HAVE TRANSFERRED
                        </button>
                    </div>
                ) : (
                    <div className="py-20 text-center space-y-10">
                        <h4 className="text-2xl font-black uppercase tracking-widest text-slate-800">Verification</h4>
                        <input type="text" placeholder="ACCESS CODE" className="w-full text-center text-4xl font-mono border-b-2 border-slate-200 outline-none py-4 text-slate-900 tracking-[0.4em]" value={inputCode} onChange={(e) => setInputCode(e.target.value)} autoFocus />
                        {errorMsg && <p className="text-rose-600 text-[10px] font-black">{errorMsg}</p>}
                        <div className="flex gap-4">
                            <button onClick={() => setStep('qr')} className="flex-1 py-4 text-slate-400 font-black text-[10px] uppercase">Back</button>
                            <button onClick={handleVerifyCode} disabled={!inputCode || isProcessing} className="flex-1 py-4 bg-brand-gold text-black font-black text-[10px] uppercase shadow-xl">Unlock Now</button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="w-full lg:w-80 space-y-8">
                <div className="p-6 bg-white/5 border border-white/10">
                    <h4 className="text-[10px] text-slate-500 font-black uppercase mb-6">Order Summary</h4>
                    {supportMode === 'production' && (
                        <div className="flex justify-between items-center bg-black/40 p-4">
                            <span className="text-xs text-white">Tickets</span>
                            <div className="flex items-center gap-4">
                                <button onClick={() => setPointCount(Math.max(1, pointCount - 1))} className="text-brand-gold">-</button>
                                <span className="font-mono text-white">{pointCount}</span>
                                <button onClick={() => setPointCount(pointCount + 1)} className="text-brand-gold">+</button>
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
