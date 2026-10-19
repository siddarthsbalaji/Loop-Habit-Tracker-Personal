/**
 * Timezone-safe calendar helpers.
 *
 * All arithmetic is done on integer "day indices" (days since 1970-01-01 in UTC
 * calendar space), which avoids DST bugs entirely. Dates are always derived from
 * the user's *local* calendar day.
 */

const MS_PER_DAY = 86_400_000;

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** Day index for a local Date. */
export function dayIndexFromDate(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / MS_PER_DAY);
}

/** Today's day index in the user's local timezone. */
export function todayIndex(): number {
  return dayIndexFromDate(new Date());
}

/** `YYYY-MM-DD` -> day index. Returns NaN on malformed input. */
export function isoToDay(iso: string): number {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(iso.trim());
  if (!m) return NaN;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_PER_DAY);
}

/** Day index -> `YYYY-MM-DD`. */
export function dayToIso(day: number): string {
  const d = new Date(day * MS_PER_DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Calendar parts for a day index. `weekday` is 0 = Sunday. */
export function dayParts(day: number): { year: number; month: number; date: number; weekday: number } {
  const d = new Date(day * MS_PER_DAY);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), date: d.getUTCDate(), weekday: d.getUTCDay() };
}

/** Number of days in the month containing `day`. */
export function monthLength(day: number): number {
  const { year, month } = dayParts(day);
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/** Convert a UTC-midnight epoch timestamp (ms or s) to a day index. */
export function epochToDay(value: number): number {
  const ms = value < 1e11 ? value * 1000 : value;
  return Math.floor(ms / MS_PER_DAY);
}

/** Parse a date cell that may be ISO, or an epoch timestamp in ms / seconds. */
export function parseDateCell(raw: string): number {
  const s = raw.trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return isoToDay(s);
  if (/^-?\d+(\.\d+)?$/.test(s)) return epochToDay(Number(s));
  const parsed = Date.parse(s);
  return Number.isNaN(parsed) ? NaN : dayIndexFromDate(new Date(parsed));
}

export function formatLongDate(day: number): string {
  const { year, month, date, weekday } = dayParts(day);
  return `${WEEKDAY_SHORT[weekday]}, ${MONTH_SHORT[month]} ${date}, ${year}`;
}

export function formatShortDate(day: number): string {
  const { month, date } = dayParts(day);
  return `${MONTH_SHORT[month]} ${date}`;
}
