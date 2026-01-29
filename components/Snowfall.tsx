
import React, { useMemo } from 'react';

const CosmosParticles: React.FC = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 280 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2.8 + 0.3,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      twinkleDuration: `${Math.random() * 3 + 1.2}s`,
      twinkleDelay: `${Math.random() * 10}s`,
      driftDuration: `${Math.random() * 60 + 30}s`,
      opacity: Math.random() * 0.9 + 0.1,
      isGold: Math.random() > 0.85,
    }));
  }, []);

  const shootingStars = useMemo(() => {
    // 增加流星數量與出現頻率
    return Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 60}%`,
      left: `${Math.random() * 70}%`,
      delay: `${Math.random() * 15}s`,
      duration: `${Math.random() * 1.5 + 0.8}s`
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[-1] bg-black">
      {/* 深空星雲漸層 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#050812_0%,_#000000_100%)]"></div>
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_#1e1b4b_0%,_transparent_60%)]"></div>
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(ellipse_at_bottom_left,_#312e81_0%,_transparent_60%)]"></div>

      {/* 繁星點點 */}
      {stars.map(s => (
        <div
          key={s.id}
          className="absolute rounded-full transition-opacity duration-1000"
          style={{
            width: `${s.size}px`,
            height: `${s.size}px`,
            left: s.left,
            top: s.top,
            backgroundColor: s.isGold ? '#fbbf24' : '#ffffff',
            boxShadow: s.isGold ? '0 0 15px #fbbf24' : '0 0 10px rgba(255,255,255,0.4)',
            animation: `twinkle ${s.twinkleDuration} ease-in-out ${s.twinkleDelay} infinite, float-slow ${s.driftDuration} linear infinite`,
            opacity: s.opacity,
          }}
        />
      ))}

      {/* 強化流星 */}
      {shootingStars.map(s => (
        <div
          key={s.id}
          className="absolute h-[1px] w-[500px] bg-gradient-to-r from-transparent via-white to-transparent opacity-0"
          style={{
            top: s.top,
            left: s.left,
            animation: `shooting-star ${s.duration} linear ${s.delay} infinite`,
            filter: 'blur(0.5px) drop-shadow(0 0 15px rgba(255,255,255,0.9))',
          }}
        />
      ))}
      
      {/* 視窗周圍暗角，增加中心深邃感 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_40%,_rgba(0,0,0,0.9)_100%)]"></div>
    </div>
  );
};

export default CosmosParticles;
