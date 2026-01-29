
import React, { useMemo } from 'react';
import { useData, resolveDirectLink } from '../context/DataContext';

const CosmosParticles: React.FC = () => {
  const { globalSettings } = useData();
  
  const videoUrl = useMemo(() => {
    return resolveDirectLink(globalSettings.backgroundVideoUrl || '');
  }, [globalSettings.backgroundVideoUrl]);

  const stars = useMemo(() => {
    return Array.from({ length: 400 }).map((_, i) => ({
      id: i,
      size: Math.random() * 1.5 + 0.2, 
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      twinkleDuration: `${Math.random() * 8 + 4}s`,
      twinkleDelay: `${Math.random() * 15}s`,
      driftDuration: `${Math.random() * 250 + 150}s`,
      opacity: Math.random() * 0.4 + 0.1,
      isGold: Math.random() > 0.98,
    }));
  }, []);

  const shootingStars = useMemo(() => {
    return Array.from({ length: 1 }).map((_, i) => ({
      id: i,
      // Start from Bottom-Right area
      top: `${Math.random() * 30 + 70}%`, 
      left: `${Math.random() * 30 + 70}%`, 
      delay: `${Math.random() * 25 + 5}s`,
      duration: `3s`
    }));
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: -1, backgroundColor: '#000' }}>
      
      {/* 1. Base Layer: Custom MP4 Video or Cinematic Gradient */}
      {videoUrl ? (
        <video 
          key={videoUrl}
          autoPlay 
          loop 
          muted 
          playsInline 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            opacity: 0.7
          }}
        >
          <source src={videoUrl} type="video/mp4" />
        </video>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 70% 30%, #080c1d 0%, #000 100%)' }}></div>
      )}
      
      {/* 2. Horizon Glow overlay */}
      <div style={{ 
        position: 'absolute', 
        bottom: '-20%', 
        right: '-10%', 
        width: '100vw', 
        height: '80vh', 
        background: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.08) 0%, transparent 70%)',
        filter: 'blur(100px)',
        zIndex: 1
      }}></div>

      {/* 3. Static/Twinkling Stars */}
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
            boxShadow: s.isGold ? '0 0 4px #fbbf24' : 'none',
            animation: `twinkle ${s.twinkleDuration} ease-in-out ${s.twinkleDelay} infinite, floatSlow ${s.driftDuration} linear infinite`,
            opacity: s.opacity,
            zIndex: 2
          }}
        />
      ))}

      {/* 4. Lucky Upward Shooting Star (Correct Physics) */}
      {shootingStars.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            height: '2px',
            width: '600px', 
            // Gradient is opaque at the LEFT (Head) and fades to the RIGHT (Tail)
            // Combined with rotate(-45deg), the Left side becomes the leading Top-Left edge
            background: 'linear-gradient(to right, #fff 0%, rgba(255,255,255,0.4) 10%, rgba(56, 189, 248, 0.1) 40%, transparent 100%)',
            top: s.top,
            left: s.left,
            animation: `luckyUpwardMeteor ${s.duration} cubic-bezier(0.1, 0.5, 0.2, 1) ${s.delay} infinite`,
            filter: 'blur(0.5px)',
            opacity: 0,
            transformOrigin: 'left center',
            zIndex: 3
          }}
        >
          {/* Leading Sparkle (Head) */}
          <div style={{
            position: 'absolute',
            left: '-2px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '4px',
            height: '4px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            boxShadow: '0 0 20px 4px #fff, 0 0 40px 10px rgba(56, 189, 248, 0.4)'
          }} />
        </div>
      ))}
      
      {/* 5. Depth Vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.5) 100%)', zIndex: 4 }}></div>
    </div>
  );
};

export default CosmosParticles;
