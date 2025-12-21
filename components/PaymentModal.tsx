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
      if (!isFormValid) return alert("請填寫完整資訊 (Please complete name & email) 以便系統歸檔。");
      
      login(name, email);
      
      const confirmMsg = supportMode === 'production' 
        ? `【確認支持與參與】\n支持金額：NT$ ${totalAmount}\n\n這份支持將化為創作養分，並同時為 ${name} 開啟 ${pointCount} 次實驗場權限。\n\n(並非購買商品，而是對創作過程的投入)`
        : `【確認暖心支持】\n支持金額：NT$ ${totalAmount}\n\n感謝您成為 Willwi 創作路上的溫度。這份心意將直接用於延續音樂生命。`;

      if (window.confirm(confirmMsg)) {
          if (supportMode === 'production') {
              addCredits(pointCount, true, totalAmount);
          } else {
              recordDonation(totalAmount);
          }
          alert("已收到您的支持確認。歡迎進入！ (Access Granted)");
          onClose();
      }
  };

  const handlePayPal = () => {
    if (!isFormValid) return alert("請先填寫您的基本資訊 (Please complete identity).");
    login(name, email);
    // Updated link for Pure Support based on user request (PNLV2V3PP47ZN)
    // Production link remains CBZDTGT76KQY2
    window.open(supportMode === 'production' ? 'https://www.paypal.com/ncp/payment/CBZDTGT76KQY2' : 'https://www.paypal.com/ncp/payment/PNLV2V3PP47ZN', '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={onClose}></div>
      
      <div className="relative z-10 bg-[#020617] border border-white/10 rounded-sm max-w-4xl w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        
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

        <div className={`px-10 py-8 bg-black flex gap-6 border-b border-white/5`}>
            <button 
                onClick={() => setSupportMode('production')}
                className={`flex-1 py-5 px-6 border transition-all text-left group ${supportMode === 'production' ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5 hover:border-white/20'}`}
            >
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${supportMode === 'production' ? 'text-brand-gold' : 'text-slate-500'}`}>Interactive Entry</div>
                <div className="text-white text-sm font-bold uppercase tracking-tight">參與創作實驗</div>
                <div className="mt-4 text-[9px] text-slate-600 font-mono">SUPPORT: NT$ {UNIT_PRICE} / SESSION</div>
            </button>
            <button 
                onClick={() => setSupportMode('support')}
                className={`flex-1 py-5 px-6 border transition-all text-left group ${supportMode === 'support' ? 'border-orange-500 bg-orange-500/5' : 'border-white/5 hover:border-white/20'}`}
            >
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${supportMode === 'support' ? 'text-orange-500' : 'text-slate-500'}`}>Thermal Support</div>
                <div className="text-white text-sm font-bold uppercase tracking-tight">暖心支持 (純贊助)</div>
                <div className="mt-4 text-[9px] text-slate-600 font-mono">FLEXIBLE CONTRIBUTION</div>
            </button>
        </div>

        {/* Payment Area - Always Visible */}
        <div className="flex flex-col md:flex-row opacity-100">
            <div className="flex-1 p-10 bg-slate-900/10">
                <div className="flex items-center justify-between mb-8">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Support Method</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">PayPal ONLY</span>
                </div>

                <div className="space-y-8">
                    {/* PAYPAL ONLY INSTRUCTION */}
                    <div className="bg-white p-8 rounded-sm flex flex-col items-center shadow-inner">
                        <div className="w-full text-center py-6">
                            <h4 className="text-slate-900 font-black text-lg uppercase tracking-tight mb-2">PayPal Support</h4>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-6">Secure International Transfer</p>
                            <span className="text-3xl font-black text-slate-900 block mb-6">NT$ {totalAmount}</span>
                            
                            <button 
                                onClick={handlePayPal}
                                className="w-full py-4 bg-[#003087] text-white font-black text-[12px] uppercase tracking-[0.2em] shadow-lg hover:bg-[#00256b] transition-all transform active:scale-95 mb-4"
                            >
                                Proceed with PayPal
                            </button>
                            
                            <p className="text-[9px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                                * 此款項為支持 Willwi 音樂創作之用途，非商品交易。<br/>
                                (Contribution to support creativity.)
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={handleManualConfirm}
                        className={`w-full py-5 border text-[11px] font-black uppercase tracking-[0.4em] transition-all ${isFormValid ? 'border-white/10 text-slate-400 hover:bg-white hover:text-black' : 'border-red-900/30 text-red-800 cursor-not-allowed'}`}
                    >
                        {isFormValid ? "我已完成支持，確認進入 (Verify & Enter)" : "Fill Identity to Confirm"}
                    </button>
                </div>
            </div>

            <div className="w-full md:w-80 bg-black/40 p-10 flex flex-col border-l border-white/5">
                <div className="mb-10">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Your Contribution</h4>
                    {supportMode === 'production' ? (
                        <div className="flex flex-col gap-2">
                             <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                                 選擇參與次數。您的每一份支持，都將讓實驗場持續運作。
                             </p>
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
                            <p className="text-[10px] text-orange-400 mb-4 leading-relaxed">
                                 輸入您想支持的金額。這是一份純粹的心意，不求回報，但意義重大。
                             </p>
                            <input 
                                type="number" 
                                className="w-full bg-white/5 border border-white/10 p-4 text-white font-black text-lg outline-none focus:border-orange-500 transition-all" 
                                value={customAmount}
                                onChange={(e) => setCustomAmount(Math.max(0, Number(e.target.value)))}
                            />
                        </div>
                    )}
                </div>

                <div className="mt-auto pt-10 border-t border-white/5 space-y-4 text-center">
                    <p className="text-[9px] text-slate-600 leading-loose">
                        感謝您的溫度<br/>Thank you for your warmth.
                    </p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;