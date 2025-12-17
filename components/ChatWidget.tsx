import React, { useState, useRef, useEffect } from 'react';
import { getChatResponse } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '唉唷，來啦？隨便坐。我是泡麵阿嬤。肚子餓不餓？還是心裡有點擠？都可以跟阿嬤說，阿嬤都在。' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const responseText = await getChatResponse(userMessage);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: '唉唷，阿嬤這邊網路怪怪的，你等我一下喔。' }]);
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

  // Cinematic Noise Texture (Data URI) - Subtle Grain
  const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E")`;

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end font-sans">
      
      {/* Chat Window - Cinematic Frosted Glass */}
      {isOpen && (
        <div 
            className="mb-6 w-[380px] max-w-[90vw] h-[600px] max-h-[75vh] flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right relative transition-all duration-500 ease-out"
            style={{ 
                borderRadius: '40px', // Elliptical/Super rounded feel
                background: 'rgba(5, 5, 5, 0.4)', // Darker, more transparent
                backdropFilter: 'blur(30px)',
                WebkitBackdropFilter: 'blur(30px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                boxShadow: '0 40px 80px -12px rgba(0, 0, 0, 0.8)' 
            }}
        >
          {/* Noise Overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-50 mix-blend-overlay" style={{ backgroundImage: noiseTexture }}></div>
          
          {/* Header - Minimal & Textless */}
          <div className="relative z-10 px-6 py-4 flex justify-end items-center">
             <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors">
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>

          {/* Messages Area - Clean & Spatial */}
          <div className="relative z-10 flex-1 overflow-y-auto px-6 space-y-6 custom-scrollbar">
             {messages.map((msg, idx) => (
                 <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                     <div 
                        className={`max-w-[85%] px-5 py-3 text-sm leading-relaxed tracking-wide font-light
                            ${msg.role === 'user' 
                            ? 'bg-white/90 text-black rounded-[20px] rounded-tr-sm shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                            : 'text-slate-200 bg-white/5 border border-white/5 rounded-[20px] rounded-tl-sm backdrop-blur-sm'
                        }`}
                     >
                         {msg.text}
                     </div>
                 </div>
             ))}
             {isLoading && (
                 <div className="flex justify-start">
                     <div className="flex items-center gap-1 px-4 py-2 opacity-50">
                         <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0s'}}></span>
                         <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                         <span className="w-1 h-1 bg-white rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                     </div>
                 </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Integrated & Sleek */}
          <div className="relative z-10 p-6 pt-2">
              <div className="relative flex items-center bg-white/5 border border-white/10 rounded-full overflow-hidden transition-all hover:bg-white/10 hover:border-white/20">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message..."
                    className="flex-grow bg-transparent px-6 py-4 text-xs text-white focus:outline-none placeholder-white/20 tracking-wider font-mono"
                    disabled={isLoading}
                  />
                  <button 
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="mr-2 w-10 h-10 rounded-full flex items-center justify-center text-white/50 hover:bg-white hover:text-black transition-all disabled:opacity-0 disabled:scale-75"
                  >
                      <svg className="w-4 h-4 transform -rotate-45 relative left-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
              </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button - Minimal Ellipse */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 relative overflow-hidden group shadow-[0_0_30px_rgba(0,0,0,0.5)]
            ${isOpen 
                ? 'bg-transparent border border-white/10 rotate-90 scale-90 opacity-50' 
                : 'bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10 hover:border-white/30 hover:scale-105'
            }`}
      >
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none" style={{ backgroundImage: noiseTexture }}></div>
        
        <div className="relative z-10">
             {isOpen ? (
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
                // Super Minimal Bubble
                <svg className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
            )}
        </div>
      </button>

    </div>
  );
};

export default ChatWidget;