
import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UNIT_PRICE = 320;

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { addCredits } = useUser();
  const [amount, setAmount] = useState<number>(320);

  if (!isOpen) return null;

  const estimatedCredits = Math.floor(amount / UNIT_PRICE);

  const handleManualConfirm = () => {
      if (window.confirm(`確認已完成 NT$ ${amount} 轉帳？\nCasper 會為您核發 ${estimatedCredits} 首製作點數。`)) {
          addCredits(estimatedCredits);
          onClose();
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" onClick={onClose}></div>
      
      <div className="relative z-10 bg-[#020617] border border-white/10 rounded-[40px] max-w-4xl w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col md:flex-row">
        
        {/* LINE PAY (PRIMARY) */}
        <div className="w-full md:w-1/2 p-10 flex flex-col border-b md:border-b-0 md:border-r border-white/10">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-500 text-white px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest">Recommended</div>
                <h3 className="text-2xl font-bold text-white">LINE Pay / 銀行轉帳</h3>
            </div>
            
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
                支持 Willwi 音樂創作。請手動輸入 <span className="text-white font-bold underline">NT$ ${amount}</span> 進行支持。<br/>
                每一首手工動態歌詞影片的製作成本為 320 元。
            </p>

            <div className="bg-white p-6 rounded-3xl shadow-inner mb-8 flex flex-col items-center">
                <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 relative">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/R/nv/payment/`}
                        className="w-full h-full object-contain p-4 grayscale opacity-20" 
                        alt="QR"
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                        <span className="text-slate-900 font-bold text-xs uppercase tracking-tighter">Scan to Pay (Manual)<br/>金額請輸入 ${amount}</span>
                    </div>
                </div>
                <p className="text-slate-900 font-black text-xs mt-4 tracking-widest uppercase">金額隨喜 / 320 NTD per song</p>
            </div>

            <button 
                onClick={handleManualConfirm}
                className="mt-auto w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-full shadow-lg transition-all uppercase tracking-widest text-sm"
            >
                我已完成轉帳 (Confirm)
            </button>
        </div>

        {/* PAYPAL (FALLBACK) */}
        <div className="w-full md:w-1/2 p-10 bg-slate-950/50 flex flex-col">
            <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-white">PayPal / 信用卡</h3>
                <button onClick={onClose} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 mb-8">
                <div className="flex gap-2">
                    {[1, 2, 5].map(count => (
                        <button 
                            key={count}
                            onClick={() => setAmount(UNIT_PRICE * count)}
                            className={`flex-1 py-3 rounded-2xl border font-bold text-xs transition-all ${amount === UNIT_PRICE * count ? 'bg-brand-accent text-slate-950 border-brand-accent' : 'border-white/10 text-slate-500 hover:border-white/30'}`}
                        >
                            {count} 首<br/>${UNIT_PRICE * count}
                        </button>
                    ))}
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex justify-between items-center">
                    <span className="text-slate-500 text-xs">Total Credits:</span>
                    <span className="text-brand-accent font-black text-xl">{estimatedCredits}</span>
                </div>
            </div>

            <button 
                onClick={() => window.open('https://www.paypal.com/ncp/payment/UZU4M39WRFN5N', '_blank')}
                className="w-full py-4 rounded-full bg-white hover:bg-slate-200 text-slate-950 font-black transition-all shadow-lg text-sm uppercase tracking-widest"
            >
                PayPal Checkout
            </button>
            
            <p className="text-[10px] text-slate-600 text-center mt-6 leading-relaxed">
                * 注意：PayPal 手續費較高，國內使用者建議優先選用 LINE Pay。<br/>
                金額請自行輸入。
            </p>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;
