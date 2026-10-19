import { useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CalendarCheck,
  Flame,
  Pencil,
  Target,
  Trash2,
  Trophy,
} from 'lucide-react';
import { Sheet } from './Sheet';
import { ScoreRing } from './ScoreRing';
import { HabitScoreChart } from './HabitScoreChart';
import { HabitCalendarHeatmap } from './HabitCalendarHeatmap';
import { ConfirmDialog } from './ConfirmDialog';
import { displayColor } from '../lib/colors';
import { useIsDark } from '../hooks/useSettings';
import type { Habit, HabitStats } from '../types';

interface Props {
  open: boolean;
  habit: Habit | null;
  stats: HabitStats | null;
  today: number;
  onClose: () => void;
  onEdit: (habit: Habit) => void;
  onToggleArchive: (habitId: string, archive: boolean) => Promise<void>;
  onDelete: (habitId: string) => Promise<void>;
  onToggleDay: (habitId: string, day: number) => void;
}

export function HabitDetailModal({
  open,
  habit,
  stats,
  today,
  onClose,
  onEdit,
  onToggleArchive,
  onDelete,
  onToggleDay,
}: Props) {
  const dark = useIsDark();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!habit || !stats) return null;

  const accent = displayColor(habit.color, dark);
  const completionRatePct = Math.round(stats.completionRate * 100);

  const freqText =
    habit.frequencyType === 'every_day'
      ? 'Every day'
      : habit.frequencyType === 'x_days_per_week'
        ? `${habit.targetCount} time${habit.targetCount > 1 ? 's' : ''} a week`
        : habit.frequencyType === 'x_days_per_month'
          ? `${habit.targetCount} time${habit.targetCount > 1 ? 's' : ''} a month`
          : `${habit.targetCount} time${habit.targetCount > 1 ? 's' : ''} every ${habit.targetDays} days`;

  const handleDelete = async () => {
    setConfirmDelete(false);
    await onDelete(habit.id);
    onClose();
  };

  const handleArchive = async () => {
    await onToggleArchive(habit.id, !habit.archived);
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title={habit.name}>
        <div className="space-y-6 pb-6">
          {/* Header Card: Score Ring + Title + Frequency Info */}
          <div className="card relative overflow-hidden p-5">
            <div
              className="absolute left-0 top-0 bottom-0 w-1.5"
              style={{ backgroundColor: accent }}
            />
            <div className="flex items-center gap-4">
              <ScoreRing value={stats.score} color={accent} size={64} stroke={6} showLabel />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-xl font-bold text-ink">{habit.name}</h2>
                  {habit.archived && (
                    <span className="rounded-full bg-elevated px-2 py-0.5 text-xs font-semibold text-muted">
                      Archived
                    </span>
                  )}
                </div>
                {habit.description && (
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-muted">{habit.description}</p>
                )}
                <div className="mt-1 flex items-center gap-2 text-[12px] font-medium text-faint">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  <span>{freqText}</span>
                </div>
              </div>
            </div>

            {/* Action Bar (Edit, Archive, Delete) */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3 hairline">
              <button
                type="button"
                className="btn-secondary h-9 px-3 text-xs"
                onClick={() => onEdit(habit)}
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                type="button"
                className="btn-secondary h-9 px-3 text-xs"
                onClick={handleArchive}
              >
                {habit.archived ? (
                  <>
                    <ArchiveRestore size={14} />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive size={14} />
                    Archive
                  </>
                )}
              </button>
              <button
                type="button"
                className="btn-danger h-9 px-3 text-xs"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-3.5">
              <div className="flex items-center gap-1.5 text-muted">
                <Flame size={16} className="text-amber-500" />
                <span className="text-[12px] font-semibold uppercase tracking-wider">Current</span>
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">
                {stats.currentStreak}
                <span className="ml-1 text-xs font-normal text-muted">days</span>
              </div>
            </div>

            <div className="card p-3.5">
              <div className="flex items-center gap-1.5 text-muted">
                <Trophy size={16} className="text-yellow-500" />
                <span className="text-[12px] font-semibold uppercase tracking-wider">Best</span>
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">
                {stats.bestStreak}
                <span className="ml-1 text-xs font-normal text-muted">days</span>
              </div>
            </div>

            <div className="card p-3.5">
              <div className="flex items-center gap-1.5 text-muted">
                <CalendarCheck size={16} className="text-teal-500" />
                <span className="text-[12px] font-semibold uppercase tracking-wider">Total</span>
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">
                {stats.totalCompleted}
                <span className="ml-1 text-xs font-normal text-muted">checks</span>
              </div>
            </div>

            <div className="card p-3.5">
              <div className="flex items-center gap-1.5 text-muted">
                <Target size={16} className="text-sky-500" />
                <span className="text-[12px] font-semibold uppercase tracking-wider">Rate</span>
              </div>
              <div className="mt-1 text-2xl font-bold tabular-nums text-ink">
                {completionRatePct}
                <span className="ml-0.5 text-xs font-normal text-muted">%</span>
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <HabitScoreChart stats={stats} today={today} color={accent} />

          {/* Calendar Heatmap */}
          <HabitCalendarHeatmap
            stats={stats}
            today={today}
            color={accent}
            onToggleDay={(day) => onToggleDay(habit.id, day)}
          />
        </div>
      </Sheet>

      {/* Delete Confirmation Alert */}
      <ConfirmDialog
        open={confirmDelete}
        title="Delete Habit?"
        message={`Are you sure you want to delete "${habit.name}"? All its logged repetitions and score history will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
