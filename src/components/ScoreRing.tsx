interface Props {
  /** 0..1 */
  value: number;
  color: string;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
  className?: string;
}

/** Loop-style circular score indicator. */
export function ScoreRing({ value, color, size = 28, stroke, showLabel = false, className }: Props) {
  const sw = stroke ?? Math.max(3, size * 0.14);
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const pct = Math.round(v * 100);

  return (
    <div
      className={`relative shrink-0 ${className ?? ''}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Habit score ${pct}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.16} strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold leading-none tabular-nums" style={{ fontSize: size * 0.26 }}>
            {pct}
            <span className="text-muted" style={{ fontSize: size * 0.14 }}>
              %
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
