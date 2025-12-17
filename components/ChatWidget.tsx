import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '../services/geminiService';
import { useUser } from '../context/UserContext';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const GrandmaIcon = () => (
  <div className="w-full h-full bg-pink-100 rounded-full flex items-center justify-center text-slate-700">
    <svg viewBox="0 0 24 24" className="w-2/3 h-2/3" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
    </svg>
  </div>
);

const ChatWidget: React.FC = () => {
  const { isAdmin } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');
  const [showCodeError, setShowCodeError] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '你好呀，我是威威的代班阿嬤。威威正在錄音室忙著寫歌，有什麼話跟阿嬤說，等一下阿嬤再轉告他喔！' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen, isUnlocked]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

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
      setMessages(prev => [...prev, { role: 'model', text: '哎呀，阿嬤耳朵不好，剛才那句沒聽清，再說一次好嗎？' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
      e.preventDefault();
      if (unlockCode === 'willwi777') {
          setIsUnlocked(true);
          setShowCodeError(false);
      } else {
          setShowCodeError(true);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end">
      
      {isOpen && (
        <div 
            className="mb-6 w-[380px] max-w-[90vw] h-[600px] max-h-[75vh] flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right shadow-2xl"
            style={{ 
                borderRadius: '40px',
                background: 'rgba(2, 6, 23, 0.9)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
          <div className="px-6 py-4 flex justify-between items-center bg-white/5 border-b border-white/5">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8"><GrandmaIcon /></div>
                 <span className="text-[10px] font-bold text-white tracking-[0.2em] uppercase">代班阿嬤 (轉達訊息中)</span>
             </div>
             <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white">✕</button>
          </div>

          {!isUnlocked && !isAdmin ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-24 h-24 mb-6"><GrandmaIcon /></div>
                <h3 className="text-xl font-bold text-white mb-2">阿嬤代班中</h3>
                <p className="text-slate-500 text-xs mb-8 leading-relaxed">
                    阿嬤在幫威威擋騷擾電話啦。<br/>
                    說個悄悄話口令才給進喔。
                </p>
                <form onSubmit={handleUnlock} className="w-full space-y-3">
                    <input 
                        type="password"
                        placeholder="通關口令..."
                        className="w-full bg-black/50 border border-white/10 rounded-full px-6 py-3 text-center text-sm text-white focus:border-brand-accent outline-none font-mono"
                        value={unlockCode}
                        onChange={(e) => setUnlockCode(e.target.value)}
                    />
                    {showCodeError && <p className="text-red-400 text-[10px] font-bold">哎呀，口令不對耶，乖孫再試試？</p>}
                    <button type="submit" className="w-full py-3 bg-white text-slate-950 font-black rounded-full text-xs uppercase tracking-widest hover:bg-brand-accent transition-colors">
                        進去找阿嬤
                    </button>
                </form>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 space-y-6 custom-scrollbar py-6">
                 {messages.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                         <div className={`max-w-[85%] px-5 py-3 text-sm rounded-[24px] ${msg.role === 'user' ? 'bg-brand-accent text-slate-950 rounded-tr-sm' : 'bg-white/10 text-slate-100 rounded-tl-sm border border-white/5'}`}>
                             {msg.text}
                         </div>
                     </div>
                 ))}
                 {isLoading && <div className="text-[10px] text-slate-600 italic ml-4">阿嬤正在打字... (或者在找眼鏡)</div>}
                 <div ref={messagesEndRef} />
              </div>

              <div className="p-6 pt-2">
                  <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full overflow-hidden focus-within:border-brand-accent transition-all">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="留個言給威威吧..."
                        className="flex-grow bg-transparent px-6 py-4 text-xs text-white focus:outline-none placeholder-white/20"
                        disabled={isLoading}
                      />
                      <button onClick={handleSend} disabled={!input.trim() || isLoading} className="mr-3 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:bg-brand-accent hover:text-slate-950 transition-all disabled:opacity-0">
                          ➤
                      </button>
                  </div>
              </div>
            </>
          )}
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl bg-white border-4 border-slate-900 group hover:scale-105 overflow-hidden"
      >
        <div className={`w-full h-full transition-all ${isOpen ? 'rotate-90 opacity-20' : 'rotate-0'}`}>
          <GrandmaIcon />
        </div>
        {isOpen && <span className="absolute text-slate-900 font-black text-xl">✕</span>}
      </button>

    </div>
  );
};

export default ChatWidget;
