import Dexie, { type EntityTable } from 'dexie';
import type { Habit, Repetition } from '../types';

/**
 * IndexedDB schema (via Dexie).
 *
 * - `habits`: primary key `id`; indexed by `order` (manual sort) and `createdAt`.
 *   (`archived` is a boolean, which IndexedDB cannot index, so it is filtered in memory.)
 * - `repetitions`: primary key is the composite string `${habitId}_${date}`,
 *   so toggling a day is an idempotent `put`/`delete`. Indexed by `habitId`,
 *   `date` and the compound `[habitId+date]`.
 */
export class LoopDatabase extends Dexie {
  habits!: EntityTable<Habit, 'id'>;
  repetitions!: EntityTable<Repetition, 'id'>;

  constructor(name = 'loop-habits') {
    super(name);
    this.version(1).stores({
      habits: 'id, order, createdAt',
      repetitions: 'id, habitId, date, [habitId+date]',
    });
  }
}

export const db = new LoopDatabase();

export const repId = (habitId: string, date: string) => `${habitId}_${date}`;

/**
 * Ask the browser to keep our data even under storage pressure. On iOS this
 * matters a lot: Safari may evict script-writable storage for sites that are not
 * installed to the Home Screen.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* not supported */
  }
  return false;
}
