import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { addCredits, user } = useUser();
  const [amount, setAmount] = useState<number>(80);

  if (!isOpen) return null;

  const handlePaymentClick = (url: string) => {
    // Open PayPal in new tab
    window.open(url, '_blank');
    
    // In a real app, we would wait for a webhook. 
    // Here we simulate success after a delay/confirmation for the demo.
    // Logic: 1 Credit per 80 NTD approx (simplified)
    const creditsToAdd = Math.floor(amount / 80) || 1;

    if (window.confirm("模擬環境提示：\n您是否已完成付款？\n(點擊「確定」將模擬系統收到款項並發放額度)")) {
        addCredits(creditsToAdd);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose}></div>
      
      <div className="relative z-10 bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col md:flex-row">
        
        {/* OPTION 1: DONATION (Instant Noodles) - LEFT SIDE */}
        <div className="w-full md:w-1/2 p-8 border-b md:border-b-0 md:border-r border-slate-700 flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-4">方案一：愛心熱泡麵</h3>
            <span className="inline-block px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-bold mb-6 w-fit">創作支持（樂捐）</span>
            
            <p className="text-slate-300 text-sm leading-relaxed mb-6 whitespace-pre-line">
                如果你想單純支持我的創作，
                可以請我一碗愛心熱泡麵。

                此為<span className="text-white font-bold">非商品、非交易之支持行為</span>，金額不對應任何服務或成果。

                感謝你願意用一點溫度，陪我繼續創作。
            </p>

            <div className="mt-auto flex flex-col items-center justify-center p-6 bg-white rounded-xl shadow-inner">
                {/* QR CODE DISPLAY */}
                <div className="w-48 h-48 bg-white flex items-center justify-center mb-4 relative overflow-hidden group rounded-lg shadow-sm border border-slate-200">
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://willwi-music-467949320732.us-west1.run.app/`}
                        className="w-full h-full object-contain p-2" 
                        alt="Line Pay QR Code"
                    />
                </div>
                <p className="text-slate-900 font-bold text-sm">LINE Pay 轉帳</p>
                <p className="text-slate-500 text-xs mt-1">（創作支持／非商品）</p>
            </div>
        </div>

        {/* OPTION 2: SERVICE (Lyric Video) - RIGHT SIDE */}
        <div className="w-full md:w-1/2 p-8 bg-slate-950 flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-white">方案二：手工動態歌詞</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold mb-6 w-fit">系統參與費</span>

            <div className="text-slate-300 text-sm leading-relaxed mb-6">
                <ul className="space-y-3 mb-6">
                    <li className="flex items-center gap-2">
                        <span className="text-brand-accent">▸</span> 第一次體驗：<span className="text-white font-bold">免費</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="text-brand-accent">▸</span> 第二次起：每首 <span className="text-white font-bold">NT$ 80</span>
                    </li>
                </ul>
                <p className="text-xs text-slate-500 border-t border-slate-800 pt-4 whitespace-pre-line">
                    此費用為「參與系統與創作支持」，
                    非商品販售、非代工服務。
                    您將獲得親手製作的動態歌詞影片下載權限。
                </p>
                
                <div className="bg-slate-900 p-4 rounded border border-slate-800 mt-4">
                    <label className="text-xs text-brand-gold font-bold block mb-2 text-center">
                        ⚠️ 請自行輸入金額 (NT$)
                    </label>
                    <div className="relative max-w-[150px] mx-auto">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                        <input 
                            type="number" 
                            min="80"
                            value={amount}
                            onChange={(e) => setAmount(Number(e.target.value))}
                            className="w-full bg-slate-950 border border-brand-accent rounded-lg py-2 pl-8 pr-2 text-center text-white font-bold text-lg focus:outline-none focus:ring-2 focus:ring-brand-accent"
                        />
                    </div>
                     <p className="text-[10px] text-slate-500 text-center mt-2">
                        基本金額 80 元 (如要多給支持，金額不限)
                    </p>
                </div>
            </div>

            <div className="mt-auto">
                <div className="text-center mb-4">
                    <p className="text-slate-400 text-xs mb-1">您的目前額度</p>
                    <p className="text-3xl font-black text-white">{user?.credits || 0} <span className="text-sm font-normal text-slate-500">首</span></p>
                </div>
                
                <button 
                    onClick={() => handlePaymentClick('https://www.paypal.com/ncp/payment/JRSNPRY9FFYZE')}
                    className="w-full py-4 rounded-xl bg-brand-accent hover:bg-white text-slate-900 font-bold transition-all shadow-lg hover:shadow-brand-accent/20 flex items-center justify-center gap-2"
                >
                    <span>前往付款 (金額請填 {amount})</span>
                </button>
                <p className="text-[10px] text-slate-600 text-center mt-3">
                    透過 PayPal 安全支付
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;