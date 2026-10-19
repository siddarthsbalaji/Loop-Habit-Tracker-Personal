import { useEffect, useState } from 'react';
import { todayIndex } from '../lib/dates';

/**
 * Current local day index. Rolls over at midnight and re-checks whenever the
 * app returns to the foreground (iOS freezes timers for backgrounded PWAs).
 */
export function useToday(): number {
  const [today, setToday] = useState(todayIndex);

  useEffect(() => {
    let timer: number | undefined;
    const sync = () => setToday(todayIndex());
    const schedule = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = window.setTimeout(() => {
        sync();
        schedule();
      }, next.getTime() - now.getTime());
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') sync();
    };
    schedule();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, []);

  return today;
}
