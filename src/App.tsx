import { useMemo, useState } from 'react';
import {
  ArrowDown10,
  ArrowDownAZ,
  ArrowUp01,
  ArrowUpDown,
  Check,
  Plus,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { useToday } from './hooks/useToday';
import { useHabitsData } from './hooks/useHabitsData';
import { useSettings, updateSettings } from './hooks/useSettings';
import { HabitRow } from './components/HabitRow';
import { HabitDetailModal } from './components/HabitDetailModal';
import { HabitFormModal } from './components/HabitFormModal';
import { SettingsModal } from './components/SettingsModal';
import { SortModal } from './components/SortModal';
import { IosInstallBanner } from './components/IosInstallBanner';
import { PwaUpdateListener } from './components/PwaUpdateToast';
import { useToast } from './components/Toast';

import {
  createHabit,
  cycleRepetition,
  deleteHabit,
  reorderHabits,
  setArchived,
  updateHabit,
  type HabitDraft,
} from './db/actions';
import { dayParts, dayToIso, WEEKDAY_LETTER } from './lib/dates';
import type { Habit, HabitFilter } from './types';

export function App() {
  const today = useToday();
  const { habits, statsByHabit, loading } = useHabitsData(today);
  const { reverseDays, sortBy } = useSettings();
  const toast = useToast();

  const [filter, setFilter] = useState<HabitFilter>('active');
  const [detailHabit, setDetailHabit] = useState<Habit | null>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sortModalOpen, setSortModalOpen] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);

  // 5 days shown in the row slider: T-4, T-3, T-2, Yesterday, Today
  const displayedDays = useMemo(() => {
    const list: number[] = [];
    for (let i = 4; i >= 0; i--) {
      list.push(today - i);
    }
    return reverseDays ? [...list].reverse() : list;
  }, [today, reverseDays]);

  // Sort habits according to user selection
  const sortedHabits = useMemo(() => {
    const list = [...habits];
    if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    } else if (sortBy === 'score_desc') {
      list.sort((a, b) => {
        const sa = statsByHabit.get(a.id)?.score ?? 0;
        const sb = statsByHabit.get(b.id)?.score ?? 0;
        return sb - sa || a.name.localeCompare(b.name);
      });
    } else if (sortBy === 'score_asc') {
      list.sort((a, b) => {
        const sa = statsByHabit.get(a.id)?.score ?? 0;
        const sb = statsByHabit.get(b.id)?.score ?? 0;
        return sa - sb || a.name.localeCompare(b.name);
      });
    } else {
      list.sort((a, b) => a.order - b.order);
    }
    return list;
  }, [habits, statsByHabit, sortBy]);

  // Filtered habits
  const filteredHabits = useMemo(() => {
    return sortedHabits.filter((h) => {
      if (filter === 'active') return !h.archived;
      if (filter === 'archived') return h.archived;
      return true; // 'all'
    });
  }, [sortedHabits, filter]);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = habits.findIndex((h) => h.id === active.id);
    const newIndex = habits.findIndex((h) => h.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(habits, oldIndex, newIndex);
      await reorderHabits(reordered.map((h) => h.id));
    }
  };

  const handleToggleDay = async (habitId: string, day: number) => {
    const iso = dayToIso(day);
    await cycleRepetition(habitId, iso);
  };

  const handleSaveHabit = async (draft: HabitDraft) => {
    if (editingHabit) {
      await updateHabit(editingHabit.id, draft);
      toast({ message: `Updated "${draft.name}"`, tone: 'success' });
    } else {
      await createHabit(draft);
      toast({ message: `Created "${draft.name}"`, tone: 'success' });
    }
  };

  const activeCount = habits.filter((h) => !h.archived).length;
  const archivedCount = habits.filter((h) => h.archived).length;

  const sortIcon =
    sortBy === 'name' ? (
      <ArrowDownAZ size={18} />
    ) : sortBy === 'score_desc' ? (
      <ArrowDown10 size={18} />
    ) : sortBy === 'score_asc' ? (
      <ArrowUp01 size={18} />
    ) : (
      <ArrowUpDown size={18} />
    );

  const sortLabel =
    sortBy === 'name'
      ? 'Title (A → Z)'
      : sortBy === 'score_desc'
        ? 'Highest Score'
        : sortBy === 'score_asc'
          ? 'Lowest Score'
          : 'Manual';

  const canReorder = sortBy === 'manual';

  return (
    <div className="flex h-full w-full flex-col bg-bg text-ink overflow-hidden">
      <PwaUpdateListener />

      {/* Top App Header with iPhone safe-area padding */}
      <header className="glass sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] hairline">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          {/* Logo & App Title */}
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-teal-600 via-teal-500 to-sky-500 text-white shadow-md">
              <Check size={20} strokeWidth={3} />
            </div>
            <div>
              <h1 className="text-[17px] font-bold tracking-tight leading-tight">Loop Habits</h1>
              <span className="text-[11px] font-medium text-muted">Offline Habit Tracker</span>
            </div>
          </div>

          {/* Action buttons: Sort button, Settings, Add Habit */}
          <div className="flex items-center gap-1.5">
            {habits.length > 1 && (
              <button
                type="button"
                className={`icon-btn ${
                  sortBy !== 'manual' || isReorderMode ? 'bg-accent/15 text-accent font-bold ring-1 ring-accent/30' : ''
                }`}
                onClick={() => setSortModalOpen(true)}
                aria-label={`Sort habits (Current: ${sortLabel})`}
                title={`Sort habits: ${sortLabel}`}
              >
                {sortIcon}
              </button>
            )}

            <button
              type="button"
              className="icon-btn"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings and CSV Backup"
              title="Settings & Backup"
            >
              <SettingsIcon size={18} />
            </button>

            <button
              type="button"
              className="btn-primary h-9 px-3.5 text-xs font-semibold"
              onClick={() => {
                setEditingHabit(null);
                setFormOpen(true);
              }}
              aria-label="Add habit"
            >
              <Plus size={16} strokeWidth={2.6} />
              <span>Add Habit</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs: Active, All, Archived */}
        <div className="mx-auto max-w-2xl px-4 pb-2.5">
          <div className="segmented grid-cols-3 text-xs">
            <button
              type="button"
              aria-pressed={filter === 'active'}
              onClick={() => setFilter('active')}
              className="flex items-center justify-center gap-1.5"
            >
              <span>Active</span>
              <span className="rounded-full bg-ink/10 px-1.5 py-0.2 text-[10px] font-bold tabular-nums">
                {activeCount}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
              className="flex items-center justify-center gap-1.5"
            >
              <span>All</span>
              <span className="rounded-full bg-ink/10 px-1.5 py-0.2 text-[10px] font-bold tabular-nums">
                {habits.length}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={filter === 'archived'}
              onClick={() => setFilter('archived')}
              className="flex items-center justify-center gap-1.5"
            >
              <span>Archived</span>
              {archivedCount > 0 && (
                <span className="rounded-full bg-ink/10 px-1.5 py-0.2 text-[10px] font-bold tabular-nums">
                  {archivedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="scroll-area flex-1 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+32px)]">
        <div className="mx-auto max-w-2xl space-y-3">
          {/* iOS Safari Install Banner */}
          <IosInstallBanner />

          {/* Active Sort Banner when not in manual order */}
          {sortBy !== 'manual' && filteredHabits.length > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5 text-xs card hairline">
              <div className="flex items-center gap-2 font-medium text-ink">
                <span className="text-accent">{sortIcon}</span>
                <span>
                  Sorted by <strong className="text-accent font-semibold">{sortLabel}</strong>
                </span>
              </div>
              <button
                type="button"
                className="font-semibold text-accent active:opacity-70 px-1 py-0.5"
                onClick={() => updateSettings({ sortBy: 'manual' })}
              >
                Reset to manual
              </button>
            </div>
          )}

          {/* Date Column Headers (Aligned with HabitRow check buttons) */}
          {filteredHabits.length > 0 && (
            <div className="flex items-center justify-between px-[15px] py-1 text-[11px] font-semibold text-muted">
              <span>{canReorder && isReorderMode ? 'Drag handles to reorder' : 'Habit & Strength'}</span>
              <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                {displayedDays.map((d) => {
                  const parts = dayParts(d);
                  const isT = d === today;
                  return (
                    <div
                      key={d}
                      className={`grid w-10 shrink-0 text-center ${isT ? 'text-accent font-bold' : ''}`}
                    >
                      <span className="text-[10px] uppercase opacity-70">
                        {WEEKDAY_LETTER[parts.weekday]}
                      </span>
                      <span className="tabular-nums leading-none">{parts.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Habit Rows List / Reorderable */}
          {loading ? (
            <div className="space-y-3 pt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-16 animate-pulse bg-elevated/40" />
              ))}
            </div>
          ) : filteredHabits.length > 0 ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={filteredHabits.map((h) => h.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2.5">
                  {filteredHabits.map((habit) => {
                    const stats = statsByHabit.get(habit.id);
                    if (!stats) return null;
                    return (
                      <HabitRow
                        key={habit.id}
                        habit={habit}
                        stats={stats}
                        days={displayedDays}
                        onToggleDay={handleToggleDay}
                        onOpenDetail={(h) => setDetailHabit(h)}
                        isReorderMode={canReorder && isReorderMode}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            /* Empty State */
            <div className="card my-8 flex flex-col items-center justify-center p-8 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent mb-4">
                <Sparkles size={32} />
              </div>
              <h2 className="text-lg font-bold text-ink">
                {filter === 'archived' ? 'No archived habits' : 'No habits yet'}
              </h2>
              <p className="mt-1.5 max-w-xs text-[14px] text-muted">
                {filter === 'archived'
                  ? 'Habits you archive will be stored here safely.'
                  : 'Start building consistency today with Loop’s habit-strength scoring formula.'}
              </p>
              {filter !== 'archived' && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setEditingHabit(null);
                      setFormOpen(true);
                    }}
                  >
                    <Plus size={18} strokeWidth={2.6} />
                    Create Habit
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSettingsOpen(true)}
                  >
                    Import or Load Demo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      <HabitDetailModal
        open={detailHabit !== null}
        habit={detailHabit}
        stats={detailHabit ? statsByHabit.get(detailHabit.id) ?? null : null}
        today={today}
        onClose={() => setDetailHabit(null)}
        onEdit={(h) => {
          setEditingHabit(h);
          setFormOpen(true);
        }}
        onToggleArchive={async (id, arch) => {
          await setArchived(id, arch);
          toast({
            message: arch ? 'Habit archived' : 'Habit restored to active',
            tone: 'default',
          });
          setDetailHabit(null);
        }}
        onDelete={async (id) => {
          await deleteHabit(id);
          toast({ message: 'Habit deleted', tone: 'default' });
          setDetailHabit(null);
        }}
        onToggleDay={handleToggleDay}
      />

      {/* Add / Edit Sheet */}
      <HabitFormModal
        open={formOpen}
        habit={editingHabit}
        onClose={() => {
          setFormOpen(false);
          setEditingHabit(null);
        }}
        onSubmit={handleSaveHabit}
      />

      {/* Sort Modal */}
      <SortModal
        open={sortModalOpen}
        currentSort={sortBy}
        onSelectSort={(option) => {
          updateSettings({ sortBy: option });
          if (option === 'manual') {
            setIsReorderMode(true);
          } else {
            setIsReorderMode(false);
          }
          toast({
            message:
              option === 'manual'
                ? 'Manual order: drag handles enabled'
                : option === 'name'
                  ? 'Sorted by Title (A → Z)'
                  : option === 'score_desc'
                    ? 'Sorted by Highest Score'
                    : 'Sorted by Lowest Score',
            tone: 'default',
          });
        }}
        onClose={() => setSortModalOpen(false)}
      />

      {/* Settings & Loop CSV Modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
