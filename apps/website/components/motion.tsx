'use client';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';

const MotionContext = createContext({
  paused: false,
  ready: false,
  reduced: true,
  toggle: () => {},
});
export function MotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    try {
      setPaused(localStorage.getItem('dotquilt:pause') === 'true');
    } catch {
      /* Storage is optional. */
    }
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener('change', update);
    setReady(true);
    return () => media.removeEventListener('change', update);
  }, []);
  function toggle() {
    setPaused((previous) => {
      const next = !previous;
      try {
        localStorage.setItem('dotquilt:pause', String(next));
      } catch {
        /* Keep session-local authority. */
      }
      return next;
    });
  }
  return (
    <MotionContext.Provider value={{ paused, ready, reduced, toggle }}>
      {children}
    </MotionContext.Provider>
  );
}
export function MotionButton({ withIcon = false }: { withIcon?: boolean }) {
  const { paused, toggle } = useContext(MotionContext);
  return (
    <button
      className="motion-button"
      type="button"
      aria-pressed={paused}
      onClick={toggle}
    >
      {withIcon && (
        <svg viewBox="0 0 28 28" aria-hidden="true">
          <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" />
          <path
            d={paused ? 'm11 8 9 6-9 6Z' : 'M11 9v10M17 9v10'}
            fill={paused ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      )}
      {paused ? 'Motion paused' : 'Pause motion'}
    </button>
  );
}
export function useMotion() {
  return useContext(MotionContext);
}
