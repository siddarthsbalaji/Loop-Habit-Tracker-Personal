import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Flame, GripVertical } from 'lucide-react';
import { ScoreRing } from './ScoreRing';
import { CheckButton } from './CheckButton';
import { useLongPress } from '../hooks/useLongPress';
import { useIsDark } from '../hooks/useSettings';
import { displayColor, withAlpha } from '../lib/colors';
import { entryAt } from '../lib/scoring';
import type { Habit, HabitStats } from '../types';

interface Props {
  habit: Habit;
  stats: HabitStats;
  days: number[]; // Array of day indices to show (e.g. T-4, T-3, T-2, Yesterday, Today)
  onToggleDay: (habitId: string, day: number) => void;
  onOpenDetail: (habit: Habit) => void;
  isReorderMode?: boolean;
}

export const HabitRow = memo(function HabitRow({
  habit,
  stats,
  days,
  onToggleDay,
  onOpenDetail,
  isReorderMode = false,
}: Props) {
  const dark = useIsDark();
  const accent = displayColor(habit.color, dark);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: habit.id,
    disabled: !isReorderMode,
  });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : undefined,
  };

  const titleLongPress = useLongPress({
    onLongPress: () => onOpenDetail(habit),
    onClick: () => onOpenDetail(habit),
    delay: 400,
  });

  const scorePct = Math.round(stats.score * 100);

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className={`card group relative flex items-center gap-3 overflow-hidden px-3.5 py-3 transition-colors ${
        habit.archived ? 'opacity-60 bg-surface/50' : ''
      }`}
    >
      {/* Accent strip on the left */}
      <div
        className="absolute bottom-0 left-0 top-0 w-1 rounded-r transition-all group-hover:w-1.5"
        style={{ backgroundColor: accent }}
      />

      {/* Drag handle if in reorder mode */}
      {isReorderMode && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none p-1 text-muted hover:text-ink active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical size={18} />
        </button>
      )}

      {/* Left section: Score ring, Habit name, Streak badge, frequency info */}
      <div
        {...titleLongPress}
        role="button"
        tabIndex={0}
        className="flex min-w-0 flex-1 cursor-pointer select-none flex-col justify-center gap-0.5 pl-1.5 focus:outline-none"
        aria-label={`Open details for ${habit.name}`}
      >
        <div className="flex items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-ink leading-tight">
            {habit.name}
          </span>
          {habit.archived && (
            <span className="rounded-full bg-elevated px-2 py-0.5 text-[10px] font-medium text-muted">
              Archived
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-[12px] text-muted">
          {/* Habit Score Percentage with mini ring */}
          <div className="flex items-center gap-1">
            <ScoreRing value={stats.score} color={accent} size={15} stroke={2.5} />
            <span className="font-semibold tabular-nums text-ink/80">{scorePct}%</span>
          </div>

          {/* Current streak badge */}
          {stats.currentStreak > 0 ? (
            <div
              className="flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium tabular-nums"
              style={{
                backgroundColor: withAlpha(accent, 0.14),
                color: accent,
              }}
            >
              <Flame size={12} className="fill-current" />
              <span>{stats.currentStreak}d</span>
            </div>
          ) : (
            <span className="text-[11px] text-faint">0d</span>
          )}

          {/* Frequency summary tag */}
          <span className="truncate text-[11px] text-faint">
            {habit.frequencyType === 'every_day'
              ? 'Daily'
              : `${habit.targetCount}x/${habit.targetDays === 7 ? 'wk' : `${habit.targetDays}d`}`}
          </span>
        </div>
      </div>

      {/* Right section: Day circles (last 5 days) */}
      <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
        {days.map((day) => {
          const entry = entryAt(stats, day);
          return (
            <CheckButton
              key={day}
              day={day}
              entry={entry}
              color={accent}
              habitName={habit.name}
              onToggle={(d) => onToggleDay(habit.id, d)}
              size={36}
            />
          );
        })}
      </div>
    </div>
  );
});
