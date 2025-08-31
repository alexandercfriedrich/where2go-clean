'use client';
import React, { useMemo } from 'react';

export default function AnimatedBackground() {
  // Generate dots with deterministic values to avoid hydration issues
  const dots = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      size: 4 + (i % 8) + 1, // 4-12px based on index
      radius: 100 + (i * 10) % 300, // 100-400px from center
      speed: 10 + (i % 20) + 1, // 10-30s rotation duration
      delay: -(i * 0.7) % 20, // Deterministic start delay
      opacity: 0.4 + (i % 6) * 0.1, // 0.4-1.0 opacity
    }));
  }, []);

  return (
    <div className="animated-background">
      {dots.map((dot) => (
        <div
          key={dot.id}
          className="floating-dot"
          style={{
            width: `${dot.size}px`,
            height: `${dot.size}px`,
            animationDuration: `${dot.speed}s`,
            animationDelay: `${dot.delay}s`,
            opacity: dot.opacity,
            '--radius': `${dot.radius}px`,
          } as React.CSSProperties & { '--radius': string }}
        />
      ))}
    </div>
  );
}