import React, { useMemo } from 'react';

interface SnowflakeProps {
  color: string;
  size: number;
  left: string;
  duration: string;
  delay: string;
  sway: string;
}

const Snowflake: React.FC<SnowflakeProps> = ({ color, size, left, duration, delay, sway }) => (
  <div
    className="fixed top-[-10px] pointer-events-none rounded-full z-[40]"
    style={{
      backgroundColor: color,
      width: `${size}px`,
      height: `${size}px`,
      left: left,
      opacity: Math.random() * 0.7 + 0.3,
      filter: color === '#fbbf24' ? 'blur(1px) drop-shadow(0 0 5px rgba(251, 191, 36, 0.5))' : 'blur(0.5px)',
      animation: `fall ${duration} linear ${delay} infinite, sway ${sway} ease-in-out infinite alternate`,
    }}
  />
);

const Snowfall: React.FC = () => {
  const snowflakes = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => {
      const isGold = Math.random() > 0.8;
      return {
        id: i,
        color: isGold ? '#fbbf24' : 'white',
        size: isGold ? Math.random() * 3 + 2 : Math.random() * 4 + 2,
        left: `${Math.random() * 100}%`,
        duration: `${Math.random() * 10 + 10}s`,
        delay: `${Math.random() * 10}s`,
        sway: `${Math.random() * 3 + 2}s`,
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
            0% { margin-left: 0; }
            100% { margin-left: 50px; }
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