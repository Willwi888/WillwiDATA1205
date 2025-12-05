import React from 'react';
import { useUser } from '../context/UserContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { addCredits, user } = useUser();

  if (!isOpen) return null;

  const handlePaymentClick = (url: string, simulatedCredits: number) => {
    // Open PayPal in new tab
    window.open(url, '_blank');
    
    // In a real app, we would wait for a webhook. 
    // Here we simulate success after a delay/confirmation for the demo.
    // We add a small delay to simulate the user going to pay.
    if (window.confirm("模擬環境提示：\n您是否已完成付款？\n(點擊「確定」將模擬系統收到款項並發放額度)")) {
        addCredits(simulatedCredits);
        onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative z-10 bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl animate-fade-in">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                💎 儲值額度
            </h3>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        
        <div className="p-8">
            <div className="text-center mb-8">
                <p className="text-slate-300 mb-2">您的目前額度：<span className="text-brand-accent font-bold text-xl">{user?.credits || 0}</span> 首</p>
                <p className="text-sm text-slate-500">製作並下載一支歌詞影片需消耗 1 點額度。</p>
            </div>

            {/* Plan A: Single Purchase Only */}
            <div className="border border-slate-700 rounded-xl p-6 bg-slate-800 hover:border-brand-accent transition-colors relative overflow-hidden group max-w-sm mx-auto">
                <div className="absolute top-0 right-0 bg-slate-700 text-xs px-2 py-1 rounded-bl text-slate-300">彈性選擇</div>
                <h4 className="text-xl font-bold text-white mb-2">單次加購</h4>
                <div className="text-3xl font-black text-brand-gold mb-4">NT$ 80 <span className="text-sm text-slate-400 font-normal">/ 首</span></div>
                <ul className="text-sm text-slate-400 space-y-2 mb-6">
                    <li className="flex gap-2">✓ 增加 1 首製作額度</li>
                    <li className="flex gap-2">✓ 永久有效，隨用隨扣</li>
                    <li className="flex gap-2">✓ 支持原創音樂人</li>
                </ul>
                <button 
                    onClick={() => handlePaymentClick('https://www.paypal.com/ncp/payment/JRSNPRY9FFYZE', 1)}
                    className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all border border-slate-600 group-hover:bg-brand-accent group-hover:text-brand-darker group-hover:border-brand-accent"
                >
                    立即購買
                </button>
            </div>
            
            <div className="mt-8 text-center">
                 <p className="text-xs text-slate-500">
                    點擊購買將開啟 PayPal 付款頁面。付款完成後系統將自動為您儲值。
                    <br/>如有問題請聯繫客服。
                 </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;