import React, { useMemo } from 'react';

interface SnowflakeProps {
  id: number;
  color: string;
  size: number;
  left: string;
  duration: string;
  delay: string;
  sway: string;
  char: string;
  spinDuration: string;
}

const Snowflake: React.FC<SnowflakeProps> = ({ color, size, left, duration, delay, sway, char, spinDuration }) => (
  <div
    className="fixed top-[-50px] pointer-events-none z-[40]"
    style={{
      left: left,
      color: color,
      fontSize: `${size}px`,
      opacity: Math.random() * 0.6 + 0.4,
      textShadow: color === '#fbbf24' 
        ? '0 0 8px rgba(251, 191, 36, 0.8)' 
        : '0 0 5px rgba(255, 255, 255, 0.8)',
      animation: `fall ${duration} linear ${delay} infinite, sway ${sway} ease-in-out infinite alternate`,
      // Ensure the font doesn't look like an emoji on some systems, force monochromatic
      fontFamily: 'Arial, sans-serif',
      lineHeight: 1,
    }}
  >
    <div style={{ animation: `spin ${spinDuration} linear infinite` }}>
      {char}
    </div>
  </div>
);

const Snowfall: React.FC = () => {
  const snowflakes = useMemo(() => {
    // Unicode snowflakes and dots for depth
    const chars = ['❄', '❅', '❆', '•', '·']; 
    
    return Array.from({ length: 50 }).map((_, i) => {
      const isGold = Math.random() > 0.95; // Rare gold flakes
      const charIndex = Math.floor(Math.random() * chars.length);
      const selectedChar = chars[charIndex];
      
      // Determine size based on character type (dots should be smaller)
      const baseSize = selectedChar === '•' || selectedChar === '·' 
        ? Math.random() * 5 + 5 
        : Math.random() * 12 + 10;

      return {
        id: i,
        char: selectedChar,
        color: isGold ? '#fbbf24' : '#e2e8f0',
        size: isGold ? baseSize * 1.2 : baseSize,
        left: `${Math.random() * 100}%`,
        duration: `${Math.random() * 15 + 10}s`, // 10-25s fall time
        delay: `-${Math.random() * 20}s`, // Start at random positions
        sway: `${Math.random() * 4 + 3}s`,
        spinDuration: `${Math.random() * 10 + 5}s`,
      };
    });
  }, []);

  return (
    <>
      <style>
        {`
          @keyframes fall {
            0% { transform: translateY(-10vh); }
            100% { transform: translateY(110vh); }
          }
          @keyframes sway {
            0% { margin-left: -20px; }
            100% { margin-left: 20px; }
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-[40]">
        {snowflakes.map(s => (
          <Snowflake key={s.id} {...s} />
        ))}
      </div>
    </>
  );
};

export default Snowfall;