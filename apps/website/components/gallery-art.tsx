import dots from '../lib/gallery-dots.json';

export function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="m6 3 7 5-7 5Z" fill="currentColor" />
    </svg>
  );
}

export function DotWord() {
  return (
    <svg className="gallery-dot-word" viewBox="0 0 1280 390" aria-hidden="true">
      {dots.map(([x = 0, y = 0], i) => (
        <circle
          key={`${x}-${y}`}
          cx={x * 1280 + Math.sin(i * 5.3) * (1 - x) * 18}
          cy={y * 390 + Math.cos(i * 3.1) * (1 - x) * 12}
          r={5.4}
          opacity={0.14 + x * 0.86}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}
