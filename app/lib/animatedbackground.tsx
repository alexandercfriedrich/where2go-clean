'use client';

import React, { useMemo } from 'react';

type Props = {
  points?: number;        // Anzahl der Punkte
  minRadius?: number;     // minimaler Orbit-Radius in px
  maxRadius?: number;     // maximaler Orbit-Radius in px
  minSize?: number;       // minimale Punktgröße in px
  maxSize?: number;       // maximale Punktgröße in px
  minDuration?: number;   // minimale Umdrehungsdauer in s
  maxDuration?: number;   // maximale Umdrehungsdauer in s
  opacity?: number;       // Grund-Opacity (0..1)
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function AnimatedBackground({
  points = 120,
  minRadius = 80,
  maxRadius = 480,
  minSize = 2,
  maxSize = 6,
  minDuration = 14,
  maxDuration = 46,
  opacity = 0.9
}: Props) {
  const dots = useMemo(() => {
    return new Array(points).fill(0).map((_, i) => {
      const radius = rand(minRadius, maxRadius);
      const size = rand(minSize, maxSize);
      const duration = rand(minDuration, maxDuration);
      const delay = -rand(0, duration);
      const hue = 45 + rand(-6, 6); // Gold-Varianz
      const angle = rand(0, 360);
      const blur = Math.random() < 0.25 ? rand(0.5, 2.5) : 0;

      return { id: i, radius, size, duration, delay, hue, angle, blur };
    });
  }, [points, minRadius, maxRadius, minSize, maxSize, minDuration, maxDuration, opacity]);

  return (
    <div className="w2g-orbit-bg" aria-hidden>
      <div className="w2g-orbit-center">
        {dots.map(({ id, radius, size, duration, delay, hue, angle, blur }) => (
          <span
            key={id}
            className="w2g-orbit-dot"
            style={
              {
                '--radius': `${radius}px`,
                '--size': `${size}px`,
                '--duration': `${duration}s`,
                '--delay': `${delay}s`,
                '--angle': `${angle}deg`,
                '--colorA': `hsla(${hue}, 85%, 62%, ${opacity})`,
                '--colorB': `hsla(${hue}, 75%, 48%, ${opacity})`,
                '--blur': `${blur}px`
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
