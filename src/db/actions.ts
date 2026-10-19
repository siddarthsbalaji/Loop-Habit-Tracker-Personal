import { db, repId } from './db';
import { RepValue, type FrequencyType, type Habit, type Repetition } from '../types';
import { uuid } from '../lib/uuid';
import { normalizeHex } from '../lib/colors';

export type HabitDraft = Pick<Habit, 'name' | 'color' | 'targetCount' | 'targetDays'> & {
  description?: string;
};

/** Derive the preset label from a numerator/denominator pair. */
export function classifyFrequency(targetCount: number, targetDays: number): FrequencyType {
  if (targetDays === 1 && targetCount === 1) return 'every_day';
  if (targetDays === 7) return 'x_days_per_week';
  if (targetDays === 30 || targetDays === 31) return 'x_days_per_month';
  return 'custom';
}

export function sanitizeFrequency(targetCount: number, targetDays: number) {
  const days = Math.min(365, Math.max(1, Math.round(Number(targetDays) || 1)));
  const count = Math.min(days, Math.max(1, Math.round(Number(targetCount) || 1)));
  return { targetCount: count, targetDays: days };
}

export async function createHabit(draft: HabitDraft): Promise<string> {
  const { targetCount, targetDays } = sanitizeFrequency(draft.targetCount, draft.targetDays);
  const last = await db.habits.orderBy('order').last();
  const habit: Habit = {
    id: uuid(),
    name: draft.name.trim(),
    description: draft.description?.trim() || undefined,
    color: normalizeHex(draft.color),
    frequencyType: classifyFrequency(targetCount, targetDays),
    targetCount,
    targetDays,
    archived: false,
    order: (last?.order ?? -1) + 1,
    createdAt: Date.now(),
  };
  await db.habits.add(habit);
  return habit.id;
}

export async function updateHabit(id: string, draft: HabitDraft): Promise<void> {
  const { targetCount, targetDays } = sanitizeFrequency(draft.targetCount, draft.targetDays);
  await db.habits.update(id, {
    name: draft.name.trim(),
    description: draft.description?.trim() || undefined,
    color: normalizeHex(draft.color),
    targetCount,
    targetDays,
    frequencyType: classifyFrequency(targetCount, targetDays),
  });
}

export async function setArchived(id: string, archived: boolean): Promise<void> {
  await db.habits.update(id, { archived });
}

export async function deleteHabit(id: string): Promise<void> {
  await db.transaction('rw', db.habits, db.repetitions, async () => {
    await db.repetitions.where('habitId').equals(id).delete();
    await db.habits.delete(id);
  });
}

/** Persist a new manual ordering (array of habit ids, top to bottom). */
export async function reorderHabits(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.habits, async () => {
    await Promise.all(orderedIds.map((id, order) => db.habits.update(id, { order })));
  });
}

/** Next value in the tap cycle: None → Completed → Skipped → None. */
export function nextRepValue(current: RepValue | undefined): RepValue | undefined {
  if (current === RepValue.COMPLETED) return RepValue.SKIPPED;
  if (current === RepValue.SKIPPED) return undefined;
  return RepValue.COMPLETED; // none or explicitly missed
}

/** Apply the tap cycle to a habit/day. Returns the new value (undefined = cleared). */
export async function cycleRepetition(habitId: string, date: string): Promise<RepValue | undefined> {
  return db.transaction('rw', db.repetitions, async () => {
    const id = repId(habitId, date);
    const existing = await db.repetitions.get(id);
    const next = nextRepValue(existing?.value);
    await setRepetitionValue(habitId, date, next);
    return next;
  });
}

export async function setRepetitionValue(habitId: string, date: string, value: RepValue | undefined): Promise<void> {
  const id = repId(habitId, date);
  if (value === undefined) await db.repetitions.delete(id);
  else await db.repetitions.put({ id, habitId, date, value } satisfies Repetition);
}

export async function wipeAllData(): Promise<void> {
  await db.transaction('rw', db.habits, db.repetitions, async () => {
    await db.repetitions.clear();
    await db.habits.clear();
  });
}
