/**
 * Core domain types for the Loop Habits PWA.
 *
 * These mirror the concepts of iSoron/uhabits (Loop Habit Tracker) while staying
 * idiomatic for a TypeScript + IndexedDB application.
 */

/** Preset frequency kinds. `targetCount` / `targetDays` are always authoritative. */
export type FrequencyType = 'every_day' | 'x_days_per_week' | 'x_days_per_month' | 'custom';

export interface Habit {
  /** UUID */
  id: string;
  name: string;
  description?: string;
  /** Hex color, e.g. `#388E3C` */
  color: string;
  frequencyType: FrequencyType;
  /** Numerator — e.g. 3 for "3 times a week". */
  targetCount: number;
  /** Denominator — e.g. 7 for a week, 30 for a month. */
  targetDays: number;
  archived: boolean;
  /** Manual sort position (ascending). */
  order: number;
  /** Epoch milliseconds. */
  createdAt: number;
}

/** Stored repetition values (user-facing data model). */
export const RepValue = {
  /** Explicitly missed. Treated the same as "no entry" by the scoring engine. */
  MISSED: 0,
  /** Skipped / dismissed — neither helps nor hurts the score, keeps streaks alive. */
  SKIPPED: 1,
  /** Fully completed (check). */
  COMPLETED: 2,
} as const;
export type RepValue = (typeof RepValue)[keyof typeof RepValue];

export interface Repetition {
  /** Composite key: `${habitId}_${date}` — guarantees one entry per habit per day. */
  id: string;
  habitId: string;
  /** Local calendar date, ISO `YYYY-MM-DD`. */
  date: string;
  value: RepValue;
}

/**
 * Computed (derived) per-day state — matches Loop's internal Entry codes so the
 * algorithm can be ported 1:1.
 */
export const Entry = {
  UNKNOWN: -1,
  NO: 0,
  /** Day automatically satisfied by a non-daily frequency window. */
  YES_AUTO: 1,
  YES_MANUAL: 2,
  SKIP: 3,
} as const;
export type EntryValue = (typeof Entry)[keyof typeof Entry];

export interface Streak {
  /** Day index (see lib/dates.ts) of first day of the streak. */
  start: number;
  /** Day index of last day of the streak (inclusive). */
  end: number;
  length: number;
}

export interface HabitStats {
  /** Current score 0..1 */
  score: number;
  /** Score per day index from `firstDay` to `today` (inclusive). */
  scores: Float64Array;
  /** Computed entries (Loop codes) from `firstDay` to `today`. */
  entries: Int8Array;
  /** Day index of the first element in `scores` / `entries`. */
  firstDay: number;
  currentStreak: number;
  bestStreak: number;
  streaks: Streak[];
  totalCompleted: number;
  /** Completion rate relative to the habit's target frequency, 0..1. */
  completionRate: number;
  scoreMonthAgo: number;
  scoreYearAgo: number;
}

export type HabitFilter = 'active' | 'all' | 'archived';
export type HabitSortOption = 'manual' | 'name' | 'score_desc' | 'score_asc';
export type ThemePreference = 'system' | 'dark' | 'light';
