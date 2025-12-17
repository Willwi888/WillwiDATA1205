import React, { useState } from 'react';
import { useUser } from '../context/UserContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 設定單價: 320 TWD (符合人工創作行情)
const UNIT_PRICE = 320;

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { addCredits, user } = useUser();
  const [amount, setAmount] = useState<number>(320);

  if (!isOpen) return null;

  // 計算可獲得的額度
  const estimatedCredits = Math.floor(amount / UNIT_PRICE);

  const handlePaymentClick = (url: string) => {
    // Open PayPal in new tab
    window.open(url, '_blank');
    
    if (window.confirm(`模擬環境提示：\n您是否已完成付款 NT$ ${amount}？\n系統將發放 ${estimatedCredits} 點額度。`)) {
        addCredits(estimatedCredits > 0 ? estimatedCredits : 1);
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
            <span className="inline-block px-3 py-1 rounded-full bg-brand-accent/20 text-brand-accent text-xs font-bold mb-4 w-fit">參與式創作 (Participatory Art)</span>

            <div className="text-slate-300 text-xs leading-relaxed mb-4 space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2 border-b border-slate-800 pb-4">
                <div>
                    <p className="font-bold text-white mb-1">手工對歌詞是一種參與式創作行為。</p>
                    <p>你不是購買一首歌，而是參與一段創作的時間。</p>
                    <p className="mt-2 opacity-80">此費用僅作為支持創作者投入人工對歌詞與引導的時間成本。不提供歌詞所有權、不涉及授權、不屬於數位商品交易。</p>
                    <p className="mt-2 text-brand-accent">若你只是想聽歌，請至各大音樂平台。這裡留下的，是你與一首歌共同完成的痕跡。</p>
                </div>
                
                <div className="pt-3 border-t border-slate-800 opacity-60 hover:opacity-100 transition-opacity">
                    <p className="font-bold text-white mb-1">English</p>
                    <p>This is a participation-based creative session.</p>
                    <p>You are not purchasing a song or lyrics, but participating in a manual, artist-guided creative process.</p>
                    <p className="mt-2">The support amount reflects time and creative involvement only. No lyrics ownership, licensing, or digital goods are provided.</p>
                    <p className="mt-2">For music listening, please refer to official streaming platforms. What remains here is your participation within the creative process itself.</p>
                </div>
            </div>
            
            {/* PRICING CALCULATOR */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mt-2">
                <label className="text-xs text-brand-gold font-bold block mb-2 text-center uppercase tracking-widest">
                    👇 選擇方案 (Select Plan)
                </label>
                
                {/* Presets */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <button 
                        onClick={() => setAmount(UNIT_PRICE * 1)}
                        className={`py-2 rounded border text-xs font-bold transition-all ${amount === UNIT_PRICE ? 'bg-brand-accent text-slate-900 border-brand-accent' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                        1 首<br/>${UNIT_PRICE}
                    </button>
                    <button 
                        onClick={() => setAmount(UNIT_PRICE * 2)}
                        className={`py-2 rounded border text-xs font-bold transition-all ${amount === UNIT_PRICE * 2 ? 'bg-brand-accent text-slate-900 border-brand-accent' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                        2 首<br/>${UNIT_PRICE * 2}
                    </button>
                    <button 
                        onClick={() => setAmount(UNIT_PRICE * 5)}
                        className={`py-2 rounded border text-xs font-bold transition-all ${amount === UNIT_PRICE * 5 ? 'bg-brand-accent text-slate-900 border-brand-accent' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
                    >
                        5 首<br/>${UNIT_PRICE * 5}
                    </button>
                </div>

                {/* Result Display */}
                <div className="text-center flex items-center justify-between px-2">
                    <div className="text-left">
                         <span className="text-xs text-slate-500">Total:</span>
                         <div className="text-white font-bold text-lg">NT$ {amount}</div>
                    </div>
                    <div className="text-green-400 font-bold text-xs bg-green-900/20 py-1 px-3 rounded-full border border-green-900/50">
                        {estimatedCredits} Credits
                    </div>
                </div>
            </div>

            <div className="mt-auto pt-4">
                <button 
                    onClick={() => handlePaymentClick('https://www.paypal.com/ncp/payment/UZU4M39WRFN5N')}
                    className="w-full py-4 rounded-xl bg-brand-accent hover:bg-white text-slate-900 font-bold transition-all shadow-lg hover:shadow-brand-accent/20 flex items-center justify-center gap-2 group"
                >
                    <span>前往付款 (Proceed)</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
                <p className="text-[10px] text-slate-600 text-center mt-3">
                    透過 PayPal 安全支付 • 系統自動儲值
                </p>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;