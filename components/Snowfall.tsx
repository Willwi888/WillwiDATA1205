
import React, { useMemo } from 'react';

const CosmosParticles: React.FC = () => {
  const stars = useMemo(() => {
    return Array.from({ length: 320 }).map((_, i) => ({
      id: i,
      size: Math.random() * 2 + 0.4, 
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      twinkleDuration: `${Math.random() * 4 + 3}s`,
      twinkleDelay: `${Math.random() * 15}s`,
      driftDuration: `${Math.random() * 150 + 100}s`,
      opacity: Math.random() * 0.5 + 0.1,
      isGold: Math.random() > 0.92,
    }));
  }, []);

  const shootingStars = useMemo(() => {
    // 只有 3 條流星軌道，且延遲非常長
    return Array.from({ length: 3 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 40 + 5}%`,
      left: `${Math.random() * 10 - 5}%`,
      delay: `${Math.random() * 50 + 5}s`, // 5 到 55 秒之間才出現一次
      duration: `${Math.random() * 0.3 + 0.5}s` // 0.5s - 0.8s 瞬逝感
    }));
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: -1, backgroundColor: '#000' }}>
      {/* 沉浸式宇宙深層背景 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, #020617 0%, #000 100%)' }}></div>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.08, background: 'radial-gradient(ellipse at top right, #312e81 0%, transparent 70%)' }}></div>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.05, background: 'radial-gradient(ellipse at bottom left, #1e1b4b 0%, transparent 60%)' }}></div>

      {/* 靜謐繁星 */}
      {stars.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            borderRadius: '50%',
            width: `${s.size}px`,
            height: `${s.size}px`,
            left: s.left,
            top: s.top,
            backgroundColor: s.isGold ? '#fbbf24' : '#ffffff',
            boxShadow: s.isGold ? '0 0 8px #fbbf24' : '0 0 4px rgba(255,255,255,0.3)',
            animation: `twinkle ${s.twinkleDuration} ease-in-out ${s.twinkleDelay} infinite, floatSlow ${s.driftDuration} linear infinite`,
            opacity: s.opacity,
          }}
        />
      ))}

      {/* 優雅流星 */}
      {shootingStars.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            height: '1px',
            width: '80px', // 極細、極短
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.6), transparent)',
            top: s.top,
            left: s.left,
            animation: `shootingStar ${s.duration} linear ${s.delay} infinite`,
            filter: 'blur(0.2px)',
            opacity: 0,
            transformOrigin: 'left center'
          }}
        />
      ))}
      
      {/* 柔邊遮罩 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 100%)' }}></div>
    </div>
  );
};

export default CosmosParticles;
