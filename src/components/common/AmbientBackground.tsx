'use client';

import React from 'react';

const PARTICLES = Array.from({ length: 24 }, (_, index) => {
  const x = (index * 23 + 11) % 100;
  const y = (index * 37 + 7) % 100;
  const size = 2 + (index % 4);
  const dx = ((index % 7) - 3) * 10;
  const dy = ((index % 5) - 2) * 12;
  const duration = 10 + (index % 9);
  const delay = -1 * (index % 8);
  const opacity = 0.18 + (index % 5) * 0.08;

  return {
    id: index,
    style: {
      '--x': `${x}%`,
      '--y': `${y}%`,
      '--size': `${size}px`,
      '--dx': `${dx}px`,
      '--dy': `${dy}px`,
      '--duration': `${duration}s`,
      '--delay': `${delay}s`,
      '--opacity': opacity.toString(),
    } as React.CSSProperties,
  };
});

export const AmbientBackground: React.FC = () => {
  return (
    <div className="ambient-particles" aria-hidden="true">
      {PARTICLES.map(particle => (
        <span key={particle.id} className="particle" style={particle.style} />
      ))}
    </div>
  );
};
