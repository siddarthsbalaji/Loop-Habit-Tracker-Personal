/**
 * Loop Habit Tracker scoring engine — a faithful TypeScript port of
 * iSoron/uhabits `EntryList.recomputeFrom`, `ScoreList.recompute` and
 * `StreakList.recompute`.
 *
 * Score recurrence (exponential moving average):
 *
 *     Score_t = Score_{t-1} · α + Value_t · (1 − α)
 *     α       = 0.5 ^ (1 / halfLifeInDays)
 *     halfLife = 13 / √frequency        (frequency = targetCount / targetDays)
 *
 * so a daily habit has a half-life of 13 days, a 1×/week habit ≈ 34 days, etc.
 * `Value_t` is the fraction of the target achieved in the trailing frequency
 * window (rolling sum of manual checks / targetCount, capped at 1). Skipped days
 * leave the score untouched.
 */
import { Entry, RepValue, type EntryValue, type HabitStats, type Repetition, type Streak } from '../types';
import { dayIndexFromDate, isoToDay, monthLength } from './dates';

export interface FrequencyLike {
  targetCount: number;
  targetDays: number;
}

/** Half-life (in days) of the score for a given frequency. */
export function halfLifeDays(freq: FrequencyLike): number {
  const f = clampFrequency(freq);
  return 13 / Math.sqrt(f.targetCount / f.targetDays);
}

/** Smoothing factor α = 0.5^(1/halfLife). */
export function smoothingFactor(freq: FrequencyLike): number {
  return Math.pow(0.5, 1 / halfLifeDays(freq));
}

/**
 * Single step of the EMA with consecutive streak continuity bonus.
 * Consistent, uninterrupted daily work gives higher points per check.
 */
export function computeScoreStep(
  alpha: number,
  previousScore: number,
  value: number,
  consecutiveStreak: number = 0,
): number {
  if (value >= previousScore) {
    const streakBonus = consecutiveStreak >= 2 ? Math.min(0.5, (consecutiveStreak - 1) * 0.15) : 0;
    const baseGain = (1 - alpha) * (value - previousScore);
    return Math.min(1, previousScore + baseGain * (1 + streakBonus));
  }
  return previousScore * alpha + value * (1 - alpha);
}

function clampFrequency(freq: FrequencyLike): FrequencyLike {
  const targetDays = Math.max(1, Math.round(freq.targetDays || 1));
  const targetCount = Math.min(targetDays, Math.max(1, Math.round(freq.targetCount || 1)));
  return { targetCount, targetDays };
}

/** Map a stored repetition value to Loop's entry code. */
export function repToEntry(value: RepValue): EntryValue {
  switch (value) {
    case RepValue.COMPLETED:
      return Entry.YES_MANUAL;
    case RepValue.SKIPPED:
      return Entry.SKIP;
    default:
      return Entry.NO;
  }
}

interface Interval {
  begin: number;
  center: number;
  end: number;
}

/**
 * Port of Loop's `buildIntervals`. `checksNewestFirst` contains the day indices
 * of manual checks, sorted descending.
 */
export function buildIntervals(freq: FrequencyLike, checksNewestFirst: number[]): Interval[] {
  const { targetCount: num, targetDays: den } = clampFrequency(freq);
  const intervals: Interval[] = [];
  for (let i = num - 1; i < checksNewestFirst.length; i++) {
    const begin = checksNewestFirst[i];
    const center = checksNewestFirst[i - num + 1];
    let size = den;
    if (den === 30 || den === 31) {
      // Monthly habits use real month lengths, like Loop.
      size = monthLength(begin) === dayOfMonth(begin) ? monthLength(begin + 1) : monthLength(begin);
    }
    if (center - begin < size) intervals.push({ begin, center, end: begin + size - 1 });
  }
  return intervals;
}

function dayOfMonth(day: number): number {
  return new Date(day * 86_400_000).getUTCDate();
}

/** Port of Loop's `snapIntervalsTogether` — shifts overlapping windows back in time. */
export function snapIntervalsTogether(intervals: Interval[]): void {
  for (let i = 1; i < intervals.length; i++) {
    const curr = intervals[i];
    const next = intervals[i - 1];
    const gapNextToCurrent = curr.end - next.begin;
    const gapCenterToEnd = curr.end - curr.center;
    if (gapNextToCurrent >= 0) {
      const shift = Math.min(gapCenterToEnd, gapNextToCurrent + 1);
      intervals[i] = { begin: curr.begin - shift, center: curr.center, end: curr.end - shift };
    }
  }
}

/**
 * Computes per-day entry codes (UNKNOWN / NO / YES_AUTO / YES_MANUAL / SKIP)
 * for the inclusive range [from, to]. Port of `buildEntriesFromInterval`.
 */
export function computeEntries(
  freq: FrequencyLike,
  original: Map<number, EntryValue>,
  from: number,
  to: number,
): Int8Array {
  const out = new Int8Array(Math.max(0, to - from + 1)).fill(Entry.UNKNOWN);
  const checks = [...original.entries()]
    .filter(([, v]) => v === Entry.YES_MANUAL)
    .map(([d]) => d)
    .sort((a, b) => b - a);
  const intervals = buildIntervals(freq, checks);
  snapIntervalsTogether(intervals);

  for (const iv of intervals) {
    for (let d = Math.max(iv.begin, from); d <= Math.min(iv.end, to); d++) out[d - from] = Entry.YES_AUTO;
  }
  for (const [d, v] of original) {
    if (d < from || d > to) continue;
    const idx = d - from;
    const current = out[idx];
    out[idx] = current === Entry.UNKNOWN || v === Entry.SKIP || v === Entry.YES_MANUAL ? v : Entry.YES_AUTO;
  }
  return out;
}

/**
 * Score series for computed entries (oldest first). Port of Loop's boolean
 * branch of `ScoreList.recompute`.
 */
export function computeScores(freq: FrequencyLike, entries: Int8Array): Float64Array {
  const f = clampFrequency(freq);
  let num = f.targetCount;
  let den = f.targetDays;
  const frequency = num / den;
  // Loop doubles the window for non-daily habits to smooth irregular schedules.
  if (frequency < 1) {
    num *= 2;
    den *= 2;
  }
  const alpha = smoothingFactor(f);
  const scores = new Float64Array(entries.length);
  let rollingSum = 0;
  let previous = 0;
  let consecutiveStreak = 0;

  for (let j = 0; j < entries.length; j++) {
    const entry = entries[j];
    if (entry === Entry.YES_MANUAL) rollingSum += 1;
    if (j - den >= 0 && entries[j - den] === Entry.YES_MANUAL) rollingSum -= 1;

    if (entry !== Entry.SKIP) {
      if (entry === Entry.YES_MANUAL || entry === Entry.YES_AUTO) {
        consecutiveStreak += 1;
      } else {
        consecutiveStreak = 0;
      }
      const percentageCompleted = Math.min(1, rollingSum / num);
      previous = computeScoreStep(alpha, previous, percentageCompleted, consecutiveStreak);
    }
    // Skipped days leave the score untouched and preserve the streak
    scores[j] = previous;
  }
  return scores;
}

/** Port of `StreakList.recompute`: runs of consecutive days with value > 0. */
export function computeStreaks(entries: Int8Array, firstDay: number): Streak[] {
  const streaks: Streak[] = [];
  let start = -1;
  for (let j = 0; j <= entries.length; j++) {
    const positive = j < entries.length && entries[j] > 0;
    if (positive && start < 0) start = j;
    if (!positive && start >= 0) {
      streaks.push({ start: firstDay + start, end: firstDay + j - 1, length: j - start });
      start = -1;
    }
  }
  return streaks;
}

/** Full statistics for one habit as of `today` (day index). */
export function computeHabitStats(
  habit: FrequencyLike & { createdAt?: number },
  reps: Pick<Repetition, 'date' | 'value'>[],
  today: number,
): HabitStats {
  const original = new Map<number, EntryValue>();
  let oldest = today;
  for (const r of reps) {
    const d = isoToDay(r.date);
    if (Number.isNaN(d) || d > today) continue;
    original.set(d, repToEntry(r.value));
    if (d < oldest) oldest = d;
  }

  // Snapped intervals may begin before the oldest check; leave room for that.
  // The range also reaches back to the creation day so early misses count.
  const freq = clampFrequency(habit);
  const createdDay = habit.createdAt ? dayIndexFromDate(new Date(habit.createdAt)) : today;
  const firstDay = original.size ? Math.min(oldest - freq.targetDays, createdDay) : Math.min(today, createdDay);
  const entries = computeEntries(freq, original, firstDay, today);
  const scores = computeScores(freq, entries);
  const streaks = computeStreaks(entries, firstDay);

  let totalCompleted = 0;
  for (const v of original.values()) if (v === Entry.YES_MANUAL) totalCompleted++;

  // Completion rate: share of tracked days that were satisfied (manual or auto),
  // excluding skipped days, and excluding today while it is still open.
  const rateStart = Math.max(firstDay, Math.min(original.size ? oldest : today, createdDay));
  let satisfied = 0;
  let counted = 0;
  for (let d = rateStart; d <= today; d++) {
    const v = entries[d - firstDay];
    if (v === Entry.SKIP) continue;
    if (d === today && v !== Entry.YES_MANUAL && v !== Entry.YES_AUTO) continue;
    counted++;
    if (v === Entry.YES_MANUAL || v === Entry.YES_AUTO) satisfied++;
  }

  const last = streaks[streaks.length - 1];
  const currentStreak = last && last.end >= today - 1 ? last.length : 0;
  const bestStreak = streaks.reduce((m, s) => Math.max(m, s.length), 0);
  const scoreAt = (day: number) => (day < firstDay ? 0 : scores[day - firstDay]);

  return {
    score: scores[scores.length - 1] ?? 0,
    scores,
    entries,
    firstDay,
    currentStreak,
    bestStreak,
    streaks,
    totalCompleted,
    completionRate: counted ? satisfied / counted : 0,
    scoreMonthAgo: scoreAt(today - 30),
    scoreYearAgo: scoreAt(today - 365),
  };
}

/** Lookup a computed entry for a given day from stats (UNKNOWN when out of range). */
export function entryAt(stats: HabitStats, day: number): EntryValue {
  const idx = day - stats.firstDay;
  if (idx < 0 || idx >= stats.entries.length) return Entry.UNKNOWN;
  return stats.entries[idx] as EntryValue;
}

/** Lookup a score for a given day (0 before tracking began, last score after). */
export function scoreAt(stats: HabitStats, day: number): number {
  const idx = day - stats.firstDay;
  if (idx < 0) return 0;
  if (idx >= stats.scores.length) return stats.score;
  return stats.scores[idx];
}
