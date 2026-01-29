
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
    // 只有 2 條流星軌道，出現頻率極低，確保「優雅且稀有」
    return Array.from({ length: 2 }).map((_, i) => ({
      id: i,
      top: `${Math.random() * 40 - 10}%`, // 從上方甚至螢幕外開始
      left: `${Math.random() * 40 + 60}%`, // 偏右側出發，向左下劃
      delay: `${Math.random() * 80 + 20}s`, // 20s 到 100s 才出現一次
      duration: `${Math.random() * 1 + 1.5}s` // 慢速滑行感: 1.5s - 2.5s
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

      {/* 真正優雅的流星 */}
      {shootingStars.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            height: '1px',
            width: '300px', // 很長、很細的絲線
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.7), transparent)',
            top: s.top,
            left: s.left,
            animation: `shootingStar ${s.duration} linear ${s.delay} infinite`,
            filter: 'blur(1px)',
            opacity: 0,
            transformOrigin: 'right center'
          }}
        />
      ))}
      
      {/* 柔邊遮罩 */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.4) 100%)' }}></div>
    </div>
  );
};

export default CosmosParticles;
