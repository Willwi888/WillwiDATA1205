import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../context/LanguageContext';
import { submitECPayForm } from '../services/ecpayService';
import { submitNewebPayForm } from '../services/newebPayService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UNIT_PRICE = 320;

// PayPal Support Link (Fixed)
const PAYPAL_LINK = "https://www.paypal.com/ncp/payment/PNLV2V3PP47ZN";

type GatewayType = 'ecpay' | 'newebpay' | 'paypal' | 'linepay' | 'bank';

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { user, login } = useUser();
  const { t } = useTranslation();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [supportMode, setSupportMode] = useState<'production' | 'support'>('production');
  const [customAmount, setCustomAmount] = useState<number>(100);
  const [pointCount, setPointCount] = useState<number>(1);
  const [gateway, setGateway] = useState<GatewayType>('ecpay');
  const [isInfoLocked, setIsInfoLocked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const handlePayment = async () => {
    if (!isFormValid) return alert(t('modal_confirm_btn_invalid'));
    
    // Update user info in context
    login(name, email);
    
    setIsProcessing(true);
    
    const itemName = supportMode === 'production' 
        ? `Willwi Interactive Session x ${pointCount}` 
        : `Willwi Music Support`;
    
    // Prepare data to be recovered after redirect
    const extraData = {
        type: supportMode,
        amount: totalAmount,
        points: pointCount,
        name,
        email,
        timestamp: Date.now(),
        gateway: gateway
    };

    try {
        if (gateway === 'ecpay') {
            // ECPay (綠界)
            await submitECPayForm(totalAmount, itemName, "Willwi Creative Support", extraData);
        } else if (gateway === 'newebpay') {
            // NewebPay (藍新)
            await submitNewebPayForm(totalAmount, itemName, email, extraData);
        } else if (gateway === 'paypal') {
            // PayPal (Redirect)
            // Store intent just in case, though PayPal return is harder to track without backend
            localStorage.setItem('willwi_pending_tx', JSON.stringify({
                tradeNo: `PP-${Date.now()}`,
                ...extraData
            }));
            window.location.href = PAYPAL_LINK;
        } else {
            alert("此付款方式尚未開放 (Coming Soon)");
            setIsProcessing(false);
        }
    } catch (e) {
        console.error("Payment Error", e);
        setIsProcessing(false);
        alert("金流串接發生錯誤，請稍後再試。");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={onClose}></div>
      
      <div className="relative z-10 bg-[#020617] border border-white/10 rounded-sm max-w-5xl w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* TOP IDENTITY SECTION */}
        <div className="p-8 bg-white/[0.02] border-b border-white/5">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-white uppercase tracking-[0.3em]">{t('modal_title')}</h3>
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
                        disabled={isInfoLocked}
                    />
                </div>
                <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('modal_email')}</label>
                    <input 
                        className="w-full bg-transparent border-b border-white/10 px-0 py-2 text-white text-base focus:border-brand-gold outline-none transition-all placeholder-slate-800" 
                        placeholder="contact@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isInfoLocked}
                    />
                </div>
            </div>
        </div>

        {/* MODE TABS */}
        <div className={`px-8 py-6 bg-black flex gap-4 border-b border-white/5 overflow-x-auto`}>
            <button 
                onClick={() => setSupportMode('production')}
                className={`flex-1 min-w-[200px] py-4 px-6 border transition-all text-left group relative ${supportMode === 'production' ? 'border-brand-gold bg-brand-gold/5' : 'border-white/5 hover:border-white/20'}`}
            >
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${supportMode === 'production' ? 'text-brand-gold' : 'text-slate-500'}`}>{t('modal_tab_interactive')}</div>
                <div className="text-white text-sm font-bold uppercase tracking-tight">{t('modal_tab_interactive_sub')}</div>
                {supportMode === 'production' && <div className="absolute top-2 right-2 w-2 h-2 bg-brand-gold rounded-full shadow-[0_0_10px_#fbbf24]"></div>}
            </button>
            <button 
                onClick={() => setSupportMode('support')}
                className={`flex-1 min-w-[200px] py-4 px-6 border transition-all text-left group relative ${supportMode === 'support' ? 'border-orange-500 bg-orange-500/5' : 'border-white/5 hover:border-white/20'}`}
            >
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${supportMode === 'support' ? 'text-orange-500' : 'text-slate-500'}`}>{t('modal_tab_support')}</div>
                <div className="text-white text-sm font-bold uppercase tracking-tight">{t('modal_tab_support_sub')}</div>
                {supportMode === 'support' && <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full shadow-[0_0_10px_orange]"></div>}
            </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex flex-col lg:flex-row opacity-100 flex-grow">
            
            {/* LEFT: PAYMENT GATEWAY SELECTION */}
            <div className="flex-1 p-8 bg-slate-900/10">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{t('modal_payment_header')}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">SECURE SSL</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    {/* ECPay Option */}
                    <button 
                        onClick={() => setGateway('ecpay')}
                        className={`p-4 border text-left transition-all relative overflow-hidden ${gateway === 'ecpay' ? 'bg-green-600/10 border-green-500' : 'bg-slate-900 border-white/10 hover:border-white/30'}`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${gateway === 'ecpay' ? 'border-green-500' : 'border-slate-600'}`}>
                                {gateway === 'ecpay' && <div className="w-2 h-2 bg-green-500 rounded-full"></div>}
                            </div>
                            <span className={`text-xs font-black uppercase tracking-widest ${gateway === 'ecpay' ? 'text-white' : 'text-slate-400'}`}>ECPay 綠界</span>
                        </div>
                        <div className="flex gap-2 opacity-50">
                            <div className="h-4 w-7 bg-slate-700 rounded"></div>
                            <div className="h-4 w-7 bg-slate-700 rounded"></div>
                        </div>
                    </button>

                    {/* NewebPay Option */}
                    <button 
                        onClick={() => setGateway('newebpay')}
                        className={`p-4 border text-left transition-all relative overflow-hidden ${gateway === 'newebpay' ? 'bg-blue-600/10 border-blue-500' : 'bg-slate-900 border-white/10 hover:border-white/30'}`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${gateway === 'newebpay' ? 'border-blue-500' : 'border-slate-600'}`}>
                                {gateway === 'newebpay' && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                            </div>
                            <span className={`text-xs font-black uppercase tracking-widest ${gateway === 'newebpay' ? 'text-white' : 'text-slate-400'}`}>NewebPay 藍新</span>
                        </div>
                        <div className="flex gap-2 opacity-50">
                            <div className="h-4 w-7 bg-slate-700 rounded"></div>
                            <div className="h-4 w-7 bg-slate-700 rounded"></div>
                        </div>
                    </button>

                    {/* PayPal Option (Fixed) */}
                    <button 
                        onClick={() => setGateway('paypal')}
                        className={`p-4 border text-left transition-all relative overflow-hidden ${gateway === 'paypal' ? 'bg-[#003087]/20 border-[#003087]' : 'bg-slate-900 border-white/10 hover:border-white/30'}`}
                    >
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${gateway === 'paypal' ? 'border-[#003087]' : 'border-slate-600'}`}>
                                {gateway === 'paypal' && <div className="w-2 h-2 bg-[#003087] rounded-full"></div>}
                            </div>
                            <span className={`text-xs font-black uppercase tracking-widest ${gateway === 'paypal' ? 'text-white' : 'text-slate-400'}`}>PayPal</span>
                        </div>
                        <div className="flex gap-2 opacity-50">
                            <div className="h-4 w-7 bg-slate-700 rounded"></div>
                            <div className="h-4 w-7 bg-slate-700 rounded"></div>
                        </div>
                    </button>

                    {/* Line Pay (Future) */}
                    <button disabled className="p-4 border border-white/5 bg-slate-900/50 text-left opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-4 h-4 rounded-full border border-slate-700"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Line Pay</span>
                        </div>
                        <span className="text-[9px] text-slate-600 bg-black px-2 py-0.5 rounded">COMING SOON</span>
                    </button>

                    {/* Bank Transfer (Future) */}
                    <button disabled className="p-4 border border-white/5 bg-slate-900/50 text-left opacity-50 cursor-not-allowed hidden md:block">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-4 h-4 rounded-full border border-slate-700"></div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Bank / 匯款</span>
                        </div>
                        <span className="text-[9px] text-slate-600 bg-black px-2 py-0.5 rounded">COMING SOON</span>
                    </button>
                </div>

                {/* Checkout Action */}
                <div className="bg-white p-6 rounded-sm shadow-xl">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1">Selected Gateway</span>
                            <span className={`text-sm font-black uppercase tracking-widest ${
                                gateway === 'ecpay' ? 'text-green-600' : 
                                gateway === 'newebpay' ? 'text-blue-600' :
                                gateway === 'paypal' ? 'text-[#003087]' : 'text-slate-600'
                            }`}>
                                {gateway === 'ecpay' ? 'ECPay (綠界科技)' : 
                                 gateway === 'newebpay' ? 'NewebPay (藍新金流)' : 
                                 gateway === 'paypal' ? 'PayPal (International)' : 'Unknown'}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="block text-[10px] text-slate-400 uppercase tracking-widest mb-1">Amount</span>
                            <span className="text-2xl font-black text-slate-900">NT$ {totalAmount.toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handlePayment}
                        disabled={!isFormValid || isProcessing}
                        className={`w-full py-4 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg flex justify-center items-center gap-2
                            ${!isFormValid || isProcessing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 
                              gateway === 'ecpay' ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-900/20' : 
                              gateway === 'newebpay' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-900/20' :
                              'bg-[#003087] text-white hover:bg-[#00256b] shadow-blue-900/20'
                            }`}
                    >
                        {isProcessing ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Redirecting...</span>
                            </>
                        ) : (
                            <span>PAY NOW 結帳</span>
                        )}
                    </button>
                    <p className="text-[9px] text-slate-400 text-center mt-3">
                        Secure connection encrypted. You will be redirected to complete payment.
                    </p>
                </div>
            </div>

            {/* RIGHT: ORDER SUMMARY */}
            <div className="w-full lg:w-80 bg-black/40 border-t lg:border-t-0 lg:border-l border-white/5 p-8 flex flex-col justify-between">
                <div>
                    <span className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">{t('modal_contribution_title')}</span>
                    
                    {supportMode === 'production' ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest">Sessions</span>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setPointCount(Math.max(1, pointCount - 1))} className="text-white hover:text-brand-gold text-lg">-</button>
                                    <span className="text-xl font-mono text-brand-gold">{pointCount}</span>
                                    <button onClick={() => setPointCount(pointCount + 1)} className="text-white hover:text-brand-gold text-lg">+</button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>Unit Price</span>
                                    <span>NT$ {UNIT_PRICE}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500">
                                    <span>Subtotal</span>
                                    <span>NT$ {(pointCount * UNIT_PRICE).toLocaleString()}</span>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-loose border-t border-white/5 pt-4">
                                {t('modal_interactive_desc')}
                            </p>
                        </div>
                    ) : (
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