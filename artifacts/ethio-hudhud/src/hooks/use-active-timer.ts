import { useCallback, useEffect, useState } from 'react';

// Counts only focused, visible, recently-interacted seconds.
export function useActiveTimer(running: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let last = Date.now();
    const bump = () => { last = Date.now(); };
    const evs = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const;
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const id = window.setInterval(() => {
      if (!running) return;
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      if (Date.now() - last > 30000) return;
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, bump));
      window.clearInterval(id);
    };
  }, [running]);

  const reset = useCallback(() => setSeconds(0), []);
  return { seconds, reset };
}
