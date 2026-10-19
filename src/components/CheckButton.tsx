import { memo, useEffect, useRef, useState } from 'react';
import { Entry, type EntryValue } from '../types';
import { formatLongDate } from '../lib/dates';
import { withAlpha } from '../lib/colors';

interface Props {
  day: number;
  entry: EntryValue;
  color: string;
  habitName: string;
  onToggle: (day: number) => void;
  size?: number;
}

const STATE_LABEL: Record<number, string> = {
  [Entry.YES_MANUAL]: 'completed',
  [Entry.YES_AUTO]: 'covered by frequency',
  [Entry.SKIP]: 'skipped',
};

/**
 * Day toggle: None (grey outline) → Completed (filled + check) → Skipped (slash) → None.
 * Days that are satisfied automatically by a non-daily frequency get a soft tint.
 */
export const CheckButton = memo(function CheckButton({ day, entry, color, habitName, onToggle, size = 36 }: Props) {
  const [pop, setPop] = useState(false);
  const prev = useRef(entry);

  useEffect(() => {
    if (prev.current !== entry && entry === Entry.YES_MANUAL) {
      setPop(true);
      const t = window.setTimeout(() => setPop(false), 340);
      prev.current = entry;
      return () => window.clearTimeout(t);
    }
    prev.current = entry;
  }, [entry]);

  const done = entry === Entry.YES_MANUAL;
  const auto = entry === Entry.YES_AUTO;
  const skip = entry === Entry.SKIP;

  const style: React.CSSProperties = done
    ? { background: color, borderColor: color, boxShadow: `0 4px 14px -4px ${withAlpha(color, 0.7)}` }
    : auto
      ? { background: withAlpha(color, 0.14), borderColor: withAlpha(color, 0.55) }
      : {};

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.vibrate?.(8);
        onToggle(day);
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label={`${habitName}, ${formatLongDate(day)}: ${STATE_LABEL[entry] ?? 'not done'}`}
      className="grid shrink-0 place-items-center"
      style={{ width: size + 4, height: size + 8 }}
    >
      <span
        className={`grid place-items-center rounded-full border-2 transition-[background,border-color,transform] duration-200 active:scale-90 ${
          done || auto ? '' : 'border-ink/15'
        } ${skip ? 'bg-elevated' : ''} ${pop ? 'animate-pop' : ''}`}
        style={{ width: size, height: size, ...style }}
      >
        {done && (
          <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
        {auto && (
          <svg viewBox="0 0 24 24" width={size * 0.45} height={size * 0.45} fill="none" stroke={color} strokeOpacity={0.85} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
        {skip && (
          <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill="none" className="stroke-muted" strokeWidth={2.6} strokeLinecap="round">
            <path d="M17 5L7 19" />
          </svg>
        )}
      </span>
    </button>
  );
});
