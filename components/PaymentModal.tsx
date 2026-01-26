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
      const correctCode = globalSettings.accessCode || '8520';
      if (inputCode === correctCode) {
          if (supportMode === 'production') addCredits(pointCount, true, totalAmount);
          else recordDonation(totalAmount);
          onClose();
          alert("ACCESS GRANTED");
      } else {
          setErrorMsg("INVALID_CODE");
          setIsProcessing(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 md:p-12">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-3xl animate-fade-in" onClick={onClose}></div>
      
      <div className="relative z-10 w-full max-w-4xl bg-[#050505] border border-white/5 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col max-h-full overflow-hidden animate-fade-in-up">
        
        {/* Header - Unified Horizontal */}
        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-8">
                <span className="text-[10px] font-thin uppercase tracking-[0.8em] text-brand-gold">Transaction</span>
                <div className="h-4 w-[0.5px] bg-white/20"></div>
                <span className="text-[10px] font-thin uppercase tracking-[0.4em] text-white/40">{supportMode} ACCESS</span>
            </div>
            <button onClick={onClose} className="text-[9px] uppercase tracking-widest text-slate-700 hover:text-white transition-all">TERMINATE</button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left: Configuration & Details */}
            <div className="w-full md:w-[350px] border-r border-white/5 p-10 flex flex-col gap-12 bg-white/[0.01]">
                <div className="space-y-6">
                    <span className="text-[9px] uppercase tracking-widest text-slate-700">Identity Details</span>
                    <input className="w-full bg-transparent border-b border-white/10 py-3 text-xs uppercase tracking-widest outline-none focus:border-brand-gold" placeholder="FULL NAME" value={name} onChange={e => setName(e.target.value)} />
                    <input className="w-full bg-transparent border-b border-white/10 py-3 text-xs tracking-widest outline-none focus:border-brand-gold" placeholder="EMAIL ADDRESS" value={email} onChange={e => setEmail(e.target.value)} />
                </div>

                <div className="space-y-6">
                    <span className="text-[9px] uppercase tracking-widest text-slate-700">Access Mode</span>
                    <div className="flex flex-col gap-2">
                        {(['production', 'support', 'cinema'] as const).map(m => (
                            <button 
                                key={m} 
                                onClick={() => setSupportMode(m)}
                                className={`text-left px-4 py-3 text-[10px] uppercase tracking-widest border transition-all ${supportMode === m ? 'border-brand-gold text-brand-gold bg-brand-gold/5' : 'border-white/5 text-slate-600 hover:text-white hover:border-white/20'}`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>
                </div>

                {supportMode === 'production' && (
                    <div className="space-y-6">
                        <span className="text-[9px] uppercase tracking-widest text-slate-700">Access Volume</span>
                        <div className="flex items-center justify-between border border-white/10 p-4">
                            <button onClick={() => setPointCount(Math.max(1, pointCount-1))} className="w-8 h-8 text-slate-500 hover:text-white">-</button>
                            <span className="text-xl font-mono text-white">{pointCount}</span>
                            <button onClick={() => setPointCount(pointCount+1)} className="w-8 h-8 text-slate-500 hover:text-white">+</button>
                        </div>
                    </div>
                )}

                <div className="mt-auto pt-8 border-t border-white/5">
                    <span className="text-[9px] uppercase tracking-widest text-slate-700 block mb-2">Total Amount</span>
                    <div className="text-4xl font-thin text-white tracking-tighter">NT$ {totalAmount.toLocaleString()}</div>
                </div>
            </div>

            {/* Right: Payment Flow */}
            <div className="flex-1 p-10 flex flex-col items-center justify-center bg-black">
                {step === 'qr' ? (
                    <div className="w-full max-w-sm space-y-12 text-center animate-fade-in">
                        <div className="space-y-4">
                            <span className="text-[9px] uppercase tracking-[0.5em] text-brand-gold block mb-2">Manual Transfer Required</span>
                            <div className="aspect-square w-full border border-white/10 p-8 relative group bg-white">
                                <img src={currentQr} className="w-full h-full object-contain mix-blend-multiply" alt="QR" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-col items-center">
                                <span className="text-[8px] uppercase tracking-widest text-slate-700 mb-2">Account Number</span>
                                <div className="text-2xl font-mono text-emerald-500 tracking-wider flex items-center gap-4">
                                    {BANK_INFO.account}
                                    <button onClick={() => { navigator.clipboard.writeText(BANK_INFO.account); alert("COPIED"); }} className="text-[9px] uppercase tracking-widest text-slate-700 hover:text-white border border-white/10 px-3 py-1">Copy</button>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => { if(isFormValid) { login(name, email); setStep('verify'); } else alert("IDENTITY REQUIRED"); }} 
                            className="w-full py-6 border border-brand-gold/30 text-brand-gold text-[10px] uppercase tracking-[0.8em] hover:bg-brand-gold hover:text-black transition-all"
                        >
                            Confirm Transfer
                        </button>
                    </div>
                ) : (
                    <div className="w-full max-w-sm space-y-16 text-center animate-fade-in">
                        <div className="space-y-4">
                            <span className="text-[9px] uppercase tracking-[1em] text-brand-gold block">Verification</span>
                            <p className="text-[10px] text-slate-600 uppercase tracking-widest leading-loose">Enter the system access code provided after payment to unlock resources.</p>
                        </div>
                        
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="----" 
                                className="w-full bg-transparent border-b-2 border-white/5 py-6 text-center text-6xl font-mono text-white outline-none focus:border-brand-gold transition-all tracking-[0.5em] placeholder:text-white/5" 
                                value={inputCode} 
                                onChange={e => setInputCode(e.target.value)} 
                                autoFocus 
                            />
                            {errorMsg && <p className="absolute -bottom-8 left-0 w-full text-rose-500 text-[9px] uppercase tracking-widest">{errorMsg}</p>}
                        </div>

                        <div className="flex flex-col gap-4">
                            <button 
                                onClick={handleVerifyCode} 
                                disabled={!inputCode || isProcessing}
                                className="w-full py-6 bg-white text-black text-[10px] uppercase tracking-[0.8em] hover:bg-brand-gold transition-all disabled:opacity-20"
                            >
                                {isProcessing ? 'PROCESSING...' : 'Unlock System'}
                            </button>
                            <button onClick={() => setStep('qr')} className="text-[9px] uppercase tracking-widest text-slate-700 hover:text-white transition-all">Review Transfer Details</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}; export default PaymentModal;
