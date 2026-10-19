import { useId, useState } from 'react';
import type { HabitStats } from '../types';
import { dayParts, formatShortDate } from '../lib/dates';
import { scoreAt } from '../lib/scoring';

interface Props {
  stats: HabitStats;
  today: number;
  color: string;
}

export function HabitScoreChart({ stats, today, color }: Props) {
  const [rangeDays, setRangeDays] = useState<30 | 90>(30);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();

  const startDay = today - (rangeDays - 1);
  const dataPoints: { day: number; score: number; label: string }[] = [];

  for (let d = startDay; d <= today; d++) {
    dataPoints.push({
      day: d,
      score: scoreAt(stats, d),
      label: formatShortDate(d),
    });
  }

  const width = 340;
  const height = 150;
  const paddingT = 16;
  const paddingB = 26;
  const paddingX = 14;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingT - paddingB;

  const getX = (i: number) => paddingX + (i / (dataPoints.length - 1)) * chartW;
  const getY = (val: number) => paddingT + (1 - Math.max(0, Math.min(1, val))) * chartH;

  const pointsString = dataPoints.map((pt, i) => `${getX(i).toFixed(1)},${getY(pt.score).toFixed(1)}`).join(' ');

  const areaPath = `M ${getX(0).toFixed(1)},${(paddingT + chartH).toFixed(1)} L ${pointsString} L ${getX(
    dataPoints.length - 1,
  ).toFixed(1)},${(paddingT + chartH).toFixed(1)} Z`;

  const activePoint = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < dataPoints.length ? dataPoints[hoverIndex] : null;

  // Key day marks for X-axis
  const labelIndices =
    rangeDays === 30
      ? [0, 7, 14, 21, 29]
      : [0, 22, 45, 67, 89];

  return (
    <div className="card overflow-hidden p-4">
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-ink">Score History</span>
          {activePoint ? (
            <span className="text-[12px] font-medium text-accent">
              {activePoint.label}: {Math.round(activePoint.score * 100)}%
            </span>
          ) : (
            <span className="text-[12px] text-muted">Past {rangeDays} days</span>
          )}
        </div>
        <div className="segmented grid-cols-2 text-xs">
          <button
            type="button"
            aria-pressed={rangeDays === 30}
            onClick={() => {
              setRangeDays(30);
              setHoverIndex(null);
            }}
            className="px-2 py-0.5 text-[11px]"
          >
            30d
          </button>
          <button
            type="button"
            aria-pressed={rangeDays === 90}
            onClick={() => {
              setRangeDays(90);
              setHoverIndex(null);
            }}
            className="px-2 py-0.5 text-[11px]"
          >
            90d
          </button>
        </div>
      </div>

      <div className="relative touch-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = (e.clientX - rect.left) / rect.width;
            const idx = Math.round(relX * (dataPoints.length - 1));
            if (idx >= 0 && idx < dataPoints.length) setHoverIndex(idx);
          }}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines at 25%, 50%, 75%, 100% */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((level) => {
            const y = getY(level);
            return (
              <g key={level}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity={level === 0 ? 0.12 : 0.06}
                  strokeDasharray={level > 0 && level < 1 ? '3 3' : undefined}
                />
                <text
                  x={width - paddingX + 2}
                  y={y + 3}
                  fontSize="8"
                  fill="currentColor"
                  opacity="0.35"
                  textAnchor="start"
                >
                  {Math.round(level * 100)}%
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill={`url(#${gradientId})`} />

          {/* Line stroke */}
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={pointsString}
          />

          {/* X axis labels */}
          {labelIndices.map((idx) => {
            const pt = dataPoints[idx];
            if (!pt) return null;
            return (
              <text
                key={idx}
                x={getX(idx)}
                y={height - 6}
                fontSize="9"
                fill="currentColor"
                opacity="0.45"
                textAnchor="middle"
              >
                {dayParts(pt.day).date}
              </text>
            );
          })}

          {/* Active pointer circle */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={paddingT}
                x2={getX(hoverIndex)}
                y2={paddingT + chartH}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(dataPoints[hoverIndex].score)}
                r="4"
                fill="#ffffff"
                stroke={color}
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>30d ago: {Math.round(stats.scoreMonthAgo * 100)}%</span>
        <span>
          Net trend:{' '}
          <strong
            className={
              stats.score >= stats.scoreMonthAgo ? 'text-emerald-500 font-semibold' : 'text-rose-500 font-semibold'
            }
          >
            {stats.score >= stats.scoreMonthAgo ? '+' : ''}
            {Math.round((stats.score - stats.scoreMonthAgo) * 100)}%
          </strong>
        </span>
      </div>
    </div>
  );
}
