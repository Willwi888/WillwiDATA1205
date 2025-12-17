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
  const { isAdmin } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockCode, setUnlockCode] = useState('');
  const [showCodeError, setShowCodeError] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'WILLWI ARCHIVE 留言轉達系統：目前創作者正在錄音，您可以留下訊息，系統將於後台進行歸檔轉達。' }
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
      setMessages(prev => [...prev, { role: 'model', text: '系統傳輸錯誤，請稍後再試。' }]);
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
                borderRadius: '12px',
                background: 'rgba(2, 6, 23, 0.95)',
                backdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
        >
          <div className="px-6 py-4 flex justify-between items-center bg-white/5 border-b border-white/5">
             <div className="flex items-center gap-3">
                 <div className="w-6 h-6"><BrandIcon /></div>
                 <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase">Communication Terminal</span>
             </div>
             <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white text-xs">CLOSE</button>
          </div>

          {!isUnlocked && !isAdmin ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <h3 className="text-lg font-bold text-white mb-4 tracking-widest uppercase">Access Required</h3>
                <p className="text-slate-500 text-[10px] mb-8 leading-relaxed uppercase tracking-widest">
                    Enter session key to establish connection.
                </p>
                <form onSubmit={handleUnlock} className="w-full space-y-4">
                    <input 
                        type="password"
                        placeholder="KEY"
                        className="w-full bg-black/50 border border-white/10 rounded px-6 py-3 text-center text-sm text-white focus:border-brand-accent outline-none font-mono tracking-[0.5em]"
                        value={unlockCode}
                        onChange={(e) => setUnlockCode(e.target.value)}
                    />
                    {showCodeError && <p className="text-red-900 text-[10px] font-bold tracking-widest">INVALID KEY</p>}
                    <button type="submit" className="w-full py-3 bg-white/10 text-white font-bold border border-white/10 rounded text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                        Authenticate
                    </button>
                </form>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 space-y-6 custom-scrollbar py-6">
                 {messages.map((msg, idx) => (
                     <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade`}>
                         <div className={`max-w-[85%] px-5 py-3 text-xs leading-relaxed ${msg.role === 'user' ? 'bg-white text-black font-medium' : 'bg-white/5 text-slate-300 border border-white/5'}`}>
                             {msg.text}
                         </div>
                     </div>
                 ))}
                 {isLoading && <div className="text-[10px] text-slate-600 font-mono tracking-widest animate-pulse uppercase ml-4">Processing...</div>}
                 <div ref={messagesEndRef} />
              </div>

              <div className="p-6">
                  <div className="relative flex items-center bg-black/50 border border-white/10 rounded overflow-hidden focus-within:border-brand-accent transition-all">
                      <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type message..."
                        className="flex-grow bg-transparent px-4 py-4 text-[11px] text-white focus:outline-none placeholder-white/10"
                        disabled={isLoading}
                      />
                      <button onClick={handleSend} disabled={!input.trim() || isLoading} className="mr-3 text-[10px] font-black text-white/30 hover:text-white transition-all">
                          SEND
                      </button>
                  </div>
              </div>
            </>
          )}
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl bg-black border border-white/10 hover:border-brand-accent group"
      >
        <div className={`w-8 h-8 transition-all ${isOpen ? 'rotate-45' : 'rotate-0'}`}>
          <BrandIcon />
        </div>
      </button>

    </div>
  );
};

export default ChatWidget;
