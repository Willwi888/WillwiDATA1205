import React, { useState, useEffect } from 'react';
import { useUser } from '../context/UserContext';
import { useTranslation } from '../context/LanguageContext';
import { submitNewebPayForm } from '../services/newebPayService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UNIT_PRICE = 320;

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { user, login } = useUser();
  const { t } = useTranslation();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [supportMode, setSupportMode] = useState<'production' | 'support'>('production');
  const [customAmount, setCustomAmount] = useState<number>(100);
  const [pointCount, setPointCount] = useState<number>(1);
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
    
    const itemDesc = supportMode === 'production' 
        ? `Willwi Interactive Session x ${pointCount}` 
        : `Willwi Music Support`;
    
    // Prepare data to be recovered after redirect
    const extraData = {
        type: supportMode,
        amount: totalAmount,
        points: pointCount,
        name,
        email,
        timestamp: Date.now()
    };

    // Call NewebPay Service
    await submitNewebPayForm(totalAmount, itemDesc, email, extraData);
    
    // Note: The page will redirect
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/98 backdrop-blur-3xl" onClick={onClose}></div>
      
      <div className="relative z-10 bg-[#020617] border border-white/10 rounded-sm max-w-4xl w-full overflow-hidden shadow-2xl animate-fade-in flex flex-col max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        <div className="p-10 bg-white/[0.02] border-b border-white/5">
            <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black text-white uppercase tracking-[0.3em]">{t('modal_title')}</h3>
                <button onClick={onClose} className="text-slate-600 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors">{t('modal_close')}</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('modal_name')}</label>
                    <input 
                        className="w-full bg-transparent border-b border-white/10 px-0 py-4 text-white text-lg focus:border-brand-gold outline-none transition-all placeholder-slate-800" 
                        placeholder={t('modal_name')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isInfoLocked}
                    />
                </div>
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('modal_email')}</label>
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
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${supportMode === 'production' ? 'text-brand-gold' : 'text-slate-500'}`}>{t('modal_tab_interactive')}</div>
                <div className="text-white text-sm font-bold uppercase tracking-tight">{t('modal_tab_interactive_sub')}</div>
                <div className="mt-4 text-[9px] text-slate-600 font-mono">{t('modal_tab_interactive_note')}</div>
            </button>
            <button 
                onClick={() => setSupportMode('support')}
                className={`flex-1 py-5 px-6 border transition-all text-left group ${supportMode === 'support' ? 'border-orange-500 bg-orange-500/5' : 'border-white/5 hover:border-white/20'}`}
            >
                <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${supportMode === 'support' ? 'text-orange-500' : 'text-slate-500'}`}>{t('modal_tab_support')}</div>
                <div className="text-white text-sm font-bold uppercase tracking-tight">{t('modal_tab_support_sub')}</div>
                <div className="mt-4 text-[9px] text-slate-600 font-mono">{t('modal_tab_support_note')}</div>
            </button>
        </div>

        {/* Payment Area */}
        <div className="flex flex-col md:flex-row opacity-100">
            <div className="flex-1 p-10 bg-slate-900/10">
                <div className="flex items-center justify-between mb-8">
                    <span className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{t('modal_payment_header')}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">NewebPay (藍新金流)</span>
                </div>

                <div className="space-y-8">
                    {/* NEWEBPAY SECTION */}
                    <div className="bg-white p-8 rounded-sm flex flex-col items-center shadow-xl">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-6 border border-blue-100">
                             {/* NewebPay Blue Icon Style */}
                            <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                        </div>
                        <h4 className="text-slate-900 font-black uppercase tracking-widest text-sm mb-2">Secure Checkout</h4>
                        <p className="text-[10px] text-slate-500 text-center mb-6">
                            信用卡 / ATM / 超商代碼<br/>
                            藍新金流 安全支付
                        </p>
                        <button 
                            onClick={handlePayment}
                            disabled={!isFormValid || isProcessing}
                            className={`w-full py-4 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg ${isFormValid && !isProcessing ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-900/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            {isProcessing ? 'Redirecting...' : `Pay NT$ ${totalAmount.toLocaleString()}`}
                        </button>
                    </div>
                    
                    <div className="flex justify-center gap-4 opacity-50">
                        <div className="h-6 w-10 bg-slate-800 rounded flex items-center justify-center text-[8px] font-bold text-white">VISA</div>
                        <div className="h-6 w-10 bg-slate-800 rounded flex items-center justify-center text-[8px] font-bold text-white">MC</div>
                        <div className="h-6 w-10 bg-slate-800 rounded flex items-center justify-center text-[8px] font-bold text-white">JCB</div>
                    </div>
                </div>
            </div>

            <div className="w-full md:w-80 bg-black/40 border-l border-white/5 p-10 flex flex-col justify-between">
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
                            <p className="text-[10px] text-slate-500 leading-loose">
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
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Total</span>
                        <span className="text-2xl font-black text-white">NT$ {totalAmount.toLocaleString()}</span>
                    </div>
                    <p className="text-[9px] text-slate-600 text-right">{t('modal_footer_thanks')}</p>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;