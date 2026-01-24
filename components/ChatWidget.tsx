import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '../services/geminiService';
import { useUser } from '../context/UserContext';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const BrandIcon = () => (
  <div className="w-full h-full bg-slate-800 rounded-full flex items-center justify-center text-white border border-white/20">
    <span className="text-[10px] font-black tracking-tighter">W</span>
  </div>
);

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser(); // Get user context for personalization if needed

  // Initial greeting
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '哎呀，你是新來的朋友嗎？我是威威的代班阿嬤。\n威威現在在錄音室忙，有什麼不懂的可以問阿嬤，或是單純陪阿嬤聊聊天也可以喔。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Limits
  const MAX_MESSAGES = 10;
  const [msgCount, setMsgCount] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || msgCount >= MAX_MESSAGES) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);
    
    const newCount = msgCount + 1;
    setMsgCount(newCount);

    try {
      const responseText = await getChatResponse(userMessage, newCount);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: '阿嬤的老花眼鏡找不到了... (連線錯誤，請稍後再試)' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const remainingEnergy = MAX_MESSAGES - msgCount;

  return (
    // Moved from bottom-8 to bottom-24 to avoid blocking footer elements
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end">
      
      {isOpen && (
        <div 
            className="mb-6 w-[350px] max-w-[90vw] h-[500px] max-h-[75vh] flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right shadow-2xl"
            style={{ 
                borderRadius: '12px',
                background: 'rgba(2, 6, 23, 0.95)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
        >
          {/* Header */}
          <div className="px-6 py-4 flex justify-between items-center bg-white/5 border-b border-white/5">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-brand-gold/10 rounded-full flex items-center justify-center border border-brand-gold/50 shadow-lg overflow-hidden p-1">
                    <BrandIcon />
                 </div>
                 <div>
                     <span className="block text-[10px] font-bold text-white tracking-widest uppercase">Platform Guide</span>
                     <span className="block text-[9px] text-brand-gold">平台引導 (Support)</span>
                 </div>
             </div>
             <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white text-xs">✕</button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 space-y-4 custom-scrollbar py-4 bg-slate-950/50">
             {messages.map((msg, idx) => (
                 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade`}>
                     <div className={`max-w-[85%] px-4 py-3 text-xs leading-relaxed rounded-xl ${msg.role === 'user' ? 'bg-white text-slate-900 font-medium rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-white/10 rounded-tl-none'}`}>
                         {msg.text.split('\n').map((line, i) => <React.Fragment key={i}>{line}<br/></React.Fragment>)}
                     </div>
                 </div>
             ))}
             {isLoading && (
                 <div className="flex justify-start animate-fade">
                     <div className="bg-slate-800 text-slate-400 px-4 py-2 rounded-xl rounded-tl-none text-[10px] border border-white/5 flex gap-1 items-center">
                        <span>輸入中</span>
                        <span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
                     </div>
                 </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-900 border-t border-white/10">
              {remainingEnergy > 0 ? (
                  <>
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Energy Limit</span>
                        <div className="flex gap-1">
                            {Array.from({ length: MAX_MESSAGES }).map((_, i) => (
                                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < remainingEnergy ? 'bg-brand-gold' : 'bg-slate-800'}`}></div>
                            ))}
                        </div>
                    </div>
                    <div className="relative flex items-center bg-black border border-white/10 rounded overflow-hidden focus-within:border-brand-gold transition-all">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="問阿嬤問題..."
                            className="flex-grow bg-transparent px-4 py-3 text-xs text-white focus:outline-none placeholder-slate-600"
                            disabled={isLoading}
                            autoFocus
                        />
                        <button onClick={handleSend} disabled={!input.trim() || isLoading} className="px-4 text-[10px] font-black text-brand-gold hover:text-white transition-all disabled:opacity-50">
                            SEND
                        </button>
                    </div>
                  </>
              ) : (
                  <div className="text-center py-2">
                      <p className="text-[10px] text-slate-500 mb-2">阿嬤累了，去休息了。</p>
                      <a href="https://www.paypal.com/ncp/payment/PNLV2V3PP47ZN" target="_blank" rel="noopener noreferrer" className="block w-full py-2 bg-slate-800 text-slate-300 text-[9px] font-bold uppercase tracking-widest hover:bg-brand-gold hover:text-black transition-all rounded">
                          請阿嬤喝杯茶 (Support)
                      </a>
                  </div>
              )}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-[0_0_30px_rgba(251,191,36,0.2)] bg-slate-900 border border-brand-gold/50 hover:border-brand-gold group hover:scale-110"
      >
        <div className={`w-8 h-8 transition-all absolute`}>
          <BrandIcon />
        </div>
        
        {/* Notification Badge if closed */}
        {!isOpen && msgCount === 0 && (
            <span className="absolute top-0 right-0 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-gold opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-gold"></span>
            </span>
        )}
      </button>

    </div>
  );
};

export default ChatWidget;