import React, { useMemo } from 'react';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  animationDuration: number;
  animationDelay: number;
}

export const StarsBackground: React.FC = () => {
  // Generate a deterministic or randomized starry field
  const stars: Star[] = useMemo(() => {
    const list: Star[] = [];
    const count = 48; // Subtle and smooth without performance cost
    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() < 0.25 ? 2.5 : Math.random() < 0.65 ? 1.8 : 1.2,
        opacity: 0.2 + Math.random() * 0.45,
        animationDuration: 3 + Math.random() * 4,
        animationDelay: Math.random() * 5
      });
    }
    return list;
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      {/* Subtle cosmic gradient overlay */}
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/25" />

      {/* Stars layer */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-zinc-100"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animation: `twinkle ${star.animationDuration}s ease-in-out infinite alternate`,
            animationDelay: `${star.animationDelay}s`,
            boxShadow: star.size > 2 ? '0 0 4px rgba(255, 255, 255, 0.4)' : 'none'
          }}
        />
      ))}

      {/* A couple of gentle floating particles */}
      <div
        className="absolute top-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-indigo-300/30 blur-[1px]"
        style={{ animation: 'floatSlow 18s ease-in-out infinite alternate' }}
      />
      <div
        className="absolute top-2/3 right-1/4 w-2 h-2 rounded-full bg-purple-300/25 blur-[1.5px]"
        style={{ animation: 'floatSlow 24s ease-in-out infinite alternate-reverse' }}
      />
    </div>
  );
};
