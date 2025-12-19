import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UNIT_PRICE = 320;

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { user, login, addCredits, recordDonation } = useUser();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [supportMode, setSupportMode] = useState<'production' | 'support'>('production');
  const [customAmount, setCustomAmount] = useState<number>(100);
  const [pointCount, setPointCount] = useState<number>(1);
  const [isInfoLocked, setIsInfoLocked] = useState(false);

  useEffect(() => {
    if (user?.name && user?.email) {
      setName(user.name);
      setEmail(user.email);
      setIsInfoLocked(true);
    }
  }, [user]);

  if (!isOpen) return null;

  const totalAmount = supportMode === 'production' ? pointCount * UNIT_PRICE : customAmount;
  const isFormValid = name.trim().length > 0 && email.includes('@') && totalAmount > 0;

  const handleManualConfirm = () => {
      if (!isFormValid) return alert("請填寫完整資訊與金額 (Please complete all fields).");
      
      login(name, email);
      
      const confirmMsg = supportMode === 'production' 
        ? `確認參與金額：NT$ ${totalAmount}\n系統將為 ${name} 開啟 ${pointCount} 次創作實驗場權限。`
        : `確認支持金額：NT$ ${totalAmount}\n感謝您對 Willwi 創作能量的支持。`;

      if (window.confirm(confirmMsg)) {
          if (supportMode === 'production') {
              addCredits(pointCount, true, totalAmount);
          } else {
              recordDonation(totalAmount);
          }
          alert("已收到您的支持資訊。系統將進行驗證。(Success)");
          onClose();
      }
  };

  const handleLinePay = () => {
    if (!isFormValid) return alert("請先填寫您的基本資訊 (Please complete identity).");
    login(name, email);
    window.open('https://line.me/R/ti/p/@willwi', '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={onClose}></div>
      
      <div className="relative z-10 bg-[#020617] border border-white/10 rounded-sm max-w-4xl w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col">
        
        <div className="p-10 bg-white/[0.02] border-b border-white/5">
            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-white uppercase tracking-[0.3em]">Participant Identity</h3>
                <button onClick={onClose} className="text-slate-600 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors">Close / 關閉</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Name / 參與者姓名</label>
                    <input 
                        className="w-full bg-transparent border-b border-white/10 px-0 py-4 text-white text-lg focus:border-brand-gold outline-none transition-all placeholder-slate-800" 
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isInfoLocked}
                    />
                </div>
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Email / 聯絡信箱</label>
                    <input 
                        className="w-full bg-transparent border-b border-white/10 px-0 py-4 text-white text-lg focus:border-brand-gold outline-none transition-all placeholder-slate-800" 
                        placeholder="contact@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isInfoLocked}
                    />
                </div>
            </div>
        </div>

        <div className={`px-10 py-8 bg-black flex gap-6 border-b border-white/5 transition-opacity duration-500 ${isFormValid ? 'opacity-100' : 'opacity-20'}`}>
            <button 
                onClick={() => setSupportMode('production')}
                className={`flex-1 py-5 px-6 border transition-all text-left group ${supportMode === 'production' ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5 hover:border-white/20'}`}
            >
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${supportMode === 'production' ? 'text-brand-gold' : 'text-slate-500'}`}>Experiment Field Access</div>
                <div className="text-white text-sm font-bold uppercase tracking-tight">進入創作實驗場</div>
                <div className="mt-4 text-[9px] text-slate-600 font-mono">TICKET: NT$ {UNIT_PRICE} / SESSION</div>
            </button>
            <button 
                onClick={() => setSupportMode('support')}
                className={`flex-1 py-5 px-6 border transition-all text-left group ${supportMode === 'support' ? 'border-orange-500 bg-orange-500/5' : 'border-white/5 hover:border-white/20'}`}
            >
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${supportMode === 'support' ? 'text-orange-500' : 'text-slate-500'}`}>Pure Support</div>
                <div className="text-white text-sm font-bold uppercase tracking-tight">單純支持創作</div>
                <div className="mt-4 text-[9px] text-slate-600 font-mono">FLEXIBLE AMOUNT</div>
            </button>
        </div>

        <div className={`flex flex-col md:flex-row transition-all duration-700 ${isFormValid ? 'opacity-100' : 'opacity-5 blur-sm pointer-events-none'}`}>
            <div className="flex-1 p-10 bg-slate-900/10">
                <div className="flex items-center justify-between mb-8">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Manual Method</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">LINE Pay / Bank</span>
                </div>

                <div className="space-y-8">
                    <div className="bg-white p-8 rounded-sm flex flex-col items-center shadow-inner">
                        <div className="w-48 h-48 bg-slate-100 p-4 border border-slate-200">
                             <img 
                                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/R/ti/p/@willwi" 
                                className="w-full h-full object-contain"
                                alt="LINE PAY QR"
                             />
                        </div>
                        <p className="mt-6 text-slate-950 font-black text-[10px] uppercase tracking-widest text-center leading-loose">
                            掃描 LINE Pay QR Code：<br/>
                            <span className="text-lg underline underline-offset-4">NT$ {totalAmount}</span>
                        </p>
                    </div>

                    <button 
                        onClick={handleManualConfirm}
                        className="w-full py-5 border border-white/10 text-slate-400 font-black text-[11px] uppercase tracking-[0.4em] transition-all hover:bg-white hover:text-black"
                    >
                        I Have Contributed (Manual Check)
                    </button>
                </div>
            </div>

            <div className="w-full md:w-80 bg-black/40 p-10 flex flex-col border-l border-white/5">
                <div className="mb-10">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Access Plan</h4>
                    {supportMode === 'production' ? (
                        <div className="flex flex-col gap-2">
                            {[1, 2, 5, 10].map(cnt => (
                                <button 
                                    key={cnt}
                                    onClick={() => setPointCount(cnt)}
                                    className={`py-3 px-4 border text-[10px] font-black transition-all ${pointCount === cnt ? 'border-brand-gold text-brand-gold bg-brand-gold/5' : 'border-white/5 text-slate-600 hover:text-white'}`}
                                >
                                    {cnt} SESSION{cnt > 1 ? 'S' : ''}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <input 
                                type="number" 
                                className="w-full bg-white/5 border border-white/10 p-4 text-white font-black text-lg outline-none focus:border-orange-500 transition-all" 
                                value={customAmount}
                                onChange={(e) => setCustomAmount(Math.max(0, Number(e.target.value)))}
                            />
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-10 border-t border-white/5">
                    <button 
                        onClick={handleLinePay}
                        className="w-full py-4 bg-[#06C755] text-white font-black text-[12px] uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(6,199,85,0.3)] hover:bg-[#05b34c] hover:shadow-[0_0_30px_rgba(6,199,85,0.5)] transition-all transform active:scale-95"
                    >
                        Open LINE Pay (Instant)
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;