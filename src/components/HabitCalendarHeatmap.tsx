import { memo, useMemo } from 'react';
import type { HabitStats } from '../types';
import { Entry } from '../types';
import {
  dayIndexFromDate,
  dayParts,
  formatLongDate,
  MONTH_SHORT,
  WEEKDAY_LETTER,
} from '../lib/dates';
import { entryAt } from '../lib/scoring';
import { withAlpha } from '../lib/colors';

interface Props {
  stats: HabitStats;
  today: number;
  color: string;
  onToggleDay: (day: number) => void;
}

interface MonthData {
  year: number;
  month: number;
  name: string;
  days: {
    dayIndex: number;
    date: number;
    isFuture: boolean;
    isToday: boolean;
  }[];
  startPadding: number; // 0..6 days before 1st of month
}

export const HabitCalendarHeatmap = memo(function HabitCalendarHeatmap({
  stats,
  today,
  color,
  onToggleDay,
}: Props) {
  // Generate the past 6 calendar months (including current month)
  const months = useMemo(() => {
    const list: MonthData[] = [];
    const todayP = dayParts(today);

    for (let offset = 0; offset < 6; offset++) {
      let targetMonth = todayP.month - offset;
      let targetYear = todayP.year;
      while (targetMonth < 0) {
        targetMonth += 12;
        targetYear -= 1;
      }

      // First day of target month
      const firstDate = new Date(Date.UTC(targetYear, targetMonth, 1));
      const startPadding = firstDate.getUTCDay(); // 0 is Sunday

      // Number of days in month
      const numDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();

      const days = [];
      for (let d = 1; d <= numDays; d++) {
        const dDate = new Date(Date.UTC(targetYear, targetMonth, d));
        const dayIdx = dayIndexFromDate(dDate);
        days.push({
          dayIndex: dayIdx,
          date: d,
          isFuture: dayIdx > today,
          isToday: dayIdx === today,
        });
      }

      list.push({
        year: targetYear,
        month: targetMonth,
        name: `${MONTH_SHORT[targetMonth]} ${targetYear}`,
        days,
        startPadding,
      });
    }

    return list;
  }, [today]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-ink">Completion Heatmap</h3>
        <span className="text-[11px] text-muted">Tap any day to toggle</span>
      </div>

      <div className="space-y-4">
        {months.map((m) => (
          <div key={`${m.year}-${m.month}`} className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-ink/90">{m.name}</span>
            </div>

            {/* Weekday headers: S M T W T F S */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-faint mb-1.5">
              {WEEKDAY_LETTER.map((letter, i) => (
                <div key={i}>{letter}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Padding for days before the 1st of month */}
              {Array.from({ length: m.startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}

              {/* Day cells */}
              {m.days.map((d) => {
                const entry = entryAt(stats, d.dayIndex);
                const isManual = entry === Entry.YES_MANUAL;
                const isAuto = entry === Entry.YES_AUTO;
                const isSkip = entry === Entry.SKIP;

                let cellStyle: React.CSSProperties = {};
                let cellClass = 'border hairline ';

                if (d.isFuture) {
                  cellClass += 'opacity-20 cursor-default bg-elevated/40 border-transparent';
                } else if (isManual) {
                  cellStyle = {
                    backgroundColor: color,
                    borderColor: color,
                    color: '#ffffff',
                    boxShadow: `0 2px 8px -2px ${withAlpha(color, 0.6)}`,
                  };
                } else if (isAuto) {
                  cellStyle = {
                    backgroundColor: withAlpha(color, 0.25),
                    borderColor: withAlpha(color, 0.6),
                    color: color,
                  };
                } else if (isSkip) {
                  cellClass += 'skip-hatch text-muted border-muted/30';
                } else {
                  cellClass += 'bg-elevated/60 text-muted/80 hover:bg-elevated hover:text-ink';
                }

                if (d.isToday) {
                  cellClass += ' ring-2 ring-accent ring-offset-1 ring-offset-surface';
                }

                return (
                  <button
                    key={d.dayIndex}
                    type="button"
                    disabled={d.isFuture}
                    onClick={() => onToggleDay(d.dayIndex)}
                    title={`${formatLongDate(d.dayIndex)}: ${
                      isManual ? 'Completed' : isAuto ? 'Covered' : isSkip ? 'Skipped' : 'None'
                    }`}
                    className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-medium transition active:scale-90 ${cellClass}`}
                    style={cellStyle}
                  >
                    {d.date}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1 text-[11px] text-muted">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded" style={{ backgroundColor: color }} />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="h-3 w-3 rounded border"
            style={{ backgroundColor: withAlpha(color, 0.25), borderColor: withAlpha(color, 0.6) }}
          />
          <span>Frequency Auto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border hairline skip-hatch" />
          <span>Skipped</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border bg-elevated/60 hairline" />
          <span>Missed</span>
        </div>
      </div>
    </div>
  );
});
