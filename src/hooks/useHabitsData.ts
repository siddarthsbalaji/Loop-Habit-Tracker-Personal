import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { computeHabitStats } from '../lib/scoring';
import type { Habit, HabitStats, Repetition, RepValue } from '../types';

export interface HabitsData {
  loading: boolean;
  habits: Habit[];
  /** habitId -> (ISO date -> stored value) */
  repsByHabit: Map<string, Map<string, RepValue>>;
  statsByHabit: Map<string, HabitStats>;
}

const EMPTY: Habit[] = [];
const EMPTY_REPS: Repetition[] = [];

/** Live (IndexedDB-reactive) habits + repetitions + computed Loop statistics. */
export function useHabitsData(today: number): HabitsData {
  const habits = useLiveQuery(() => db.habits.orderBy('order').toArray(), []);
  const reps = useLiveQuery(() => db.repetitions.toArray(), []);

  const repsByHabit = useMemo(() => {
    const map = new Map<string, Map<string, RepValue>>();
    for (const r of reps ?? EMPTY_REPS) {
      let m = map.get(r.habitId);
      if (!m) map.set(r.habitId, (m = new Map()));
      m.set(r.date, r.value);
    }
    return map;
  }, [reps]);

  const statsByHabit = useMemo(() => {
    const map = new Map<string, HabitStats>();
    for (const h of habits ?? EMPTY) {
      const m = repsByHabit.get(h.id);
      const list = m ? [...m].map(([date, value]) => ({ date, value })) : [];
      map.set(h.id, computeHabitStats(h, list, today));
    }
    return map;
  }, [habits, repsByHabit, today]);

  return {
    loading: habits === undefined || reps === undefined,
    habits: habits ?? EMPTY,
    repsByHabit,
    statsByHabit,
  };
}
