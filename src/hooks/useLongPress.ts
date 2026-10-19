import { useCallback, useRef } from 'react';

interface Options {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
  /** Cancel if the finger moves further than this (px) — i.e. the user is scrolling. */
  moveTolerance?: number;
}

/**
 * Pointer-based long-press that plays nicely with iOS scrolling.
 * Returns handlers to spread onto an element.
 */
export function useLongPress({ onLongPress, onClick, delay = 450, moveTolerance = 10 }: Options) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      fired.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clear();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        navigator.vibrate?.(12);
        onLongPress();
      }, delay);
    },
    [clear, delay, onLongPress],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!start.current) return;
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > moveTolerance) {
        clear();
        start.current = null;
      }
    },
    [clear, moveTolerance],
  );

  const onPointerUp = useCallback(() => {
    const wasTap = timer.current !== undefined && !fired.current;
    clear();
    start.current = null;
    if (wasTap) onClick?.();
  }, [clear, onClick]);

  const onPointerCancel = useCallback(() => {
    clear();
    start.current = null;
  }, [clear]);

  const onContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave: onPointerCancel, onContextMenu };
}
