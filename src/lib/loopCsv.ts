/**
 * CSV import / export compatible with iSoron/uhabits (Loop Habit Tracker).
 *
 * Export bundle (`Loop Habits CSV YYYY-MM-DD.zip`):
 *   - Habits.csv       Position,Name,Description,Color,Frequency_Num,Frequency_Den,Archived
 *   - Repetitions.csv  Timestamp,Habit_Name,Value      (one row per manual entry)
 *   - Checkmarks.csv   Date,<habit 1>,<habit 2>,...     (Loop's wide computed format)
 *
 * Values use Loop's entry codes: 2 = YES_MANUAL (completed), 3 = SKIP,
 * 1 = YES_AUTO (derived), 0 = NO, -1 = UNKNOWN.
 *
 * Import understands:
 *   - our own bundle (above), as a ZIP or loose CSV files;
 *   - the official Loop Android export ZIP: Habits.csv with
 *     `Position,Name,Question,Description,NumRepetitions,Interval,Color`, the root
 *     wide `Checkmarks.csv`, and/or per-habit `NNN Name/Checkmarks.csv` files.
 */
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { db, repId } from '../db/db';
import { classifyFrequency, sanitizeFrequency } from '../db/actions';
import { Entry, RepValue, type Habit, type Repetition } from '../types';
import { headerIndex, parseCsv, toCsv } from './csv';
import { dayToIso, parseDateCell, todayIndex, isoToDay } from './dates';
import { DEFAULT_COLOR, normalizeHex } from './colors';
import { computeHabitStats } from './scoring';
import { uuid } from './uuid';

export const HABITS_HEADER = ['Position', 'Name', 'Description', 'Color', 'Frequency_Num', 'Frequency_Den', 'Archived'];
export const REPETITIONS_HEADER = ['Timestamp', 'Habit_Name', 'Value'];

/* ------------------------------------------------------------------ export */

/** Make habit names unique so name-keyed CSV rows stay unambiguous. */
function uniqueNames(habits: Habit[]): Map<string, string> {
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const h of habits) {
    const base = h.name.trim() || 'Untitled';
    const n = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), n);
    out.set(h.id, n === 1 ? base : `${base} (${n})`);
  }
  return out;
}

export interface CsvBundle {
  'Habits.csv': string;
  'Repetitions.csv': string;
  'Checkmarks.csv': string;
}

export function buildCsvBundle(habitsIn: Habit[], reps: Repetition[], today = todayIndex()): CsvBundle {
  const habits = [...habitsIn].sort((a, b) => a.order - b.order);
  const names = uniqueNames(habits);

  const habitRows = habits.map((h, i) => [
    String(i + 1).padStart(3, '0'),
    names.get(h.id),
    h.description ?? '',
    normalizeHex(h.color),
    h.targetCount,
    h.targetDays,
    h.archived ? 'true' : 'false',
  ]);

  const byHabit = new Map<string, Repetition[]>();
  for (const r of reps) {
    if (!names.has(r.habitId)) continue;
    const list = byHabit.get(r.habitId) ?? [];
    list.push(r);
    byHabit.set(r.habitId, list);
  }

  const repRows = reps
    .filter((r) => names.has(r.habitId) && r.value !== RepValue.MISSED)
    .sort((a, b) => a.date.localeCompare(b.date) || names.get(a.habitId)!.localeCompare(names.get(b.habitId)!))
    .map((r) => [r.date, names.get(r.habitId), r.value === RepValue.COMPLETED ? Entry.YES_MANUAL : Entry.SKIP]);

  // Loop-style wide Checkmarks.csv, newest day first, computed values.
  const stats = habits.map((h) => computeHabitStats(h, byHabit.get(h.id) ?? [], today));
  const earliest = stats.reduce((m, s) => Math.min(m, s.firstDay), today);
  const checkRows: unknown[][] = [];
  if (reps.length) {
    for (let d = today; d >= earliest; d--) {
      checkRows.push([
        dayToIso(d),
        ...stats.map((s) => (d < s.firstDay ? Entry.UNKNOWN : s.entries[d - s.firstDay])),
      ]);
    }
  }

  return {
    'Habits.csv': toCsv([HABITS_HEADER, ...habitRows]),
    'Repetitions.csv': toCsv([REPETITIONS_HEADER, ...repRows]),
    'Checkmarks.csv': toCsv([['Date', ...habits.map((h) => names.get(h.id))], ...checkRows]),
  };
}

export function zipBundle(bundle: CsvBundle): Uint8Array {
  const files: Record<string, Uint8Array> = {};
  for (const [name, text] of Object.entries(bundle)) files[name] = strToU8(text);
  return zipSync(files, { level: 6 });
}

export async function exportAll(): Promise<{ bundle: CsvBundle; zip: Uint8Array; fileName: string }> {
  const [habits, reps] = await Promise.all([db.habits.toArray(), db.repetitions.toArray()]);
  const bundle = buildCsvBundle(habits, reps);
  return { bundle, zip: zipBundle(bundle), fileName: `Loop Habits CSV ${dayToIso(todayIndex())}.zip` };
}

/* ------------------------------------------------------------------ import */

export interface ParsedHabit {
  position: number;
  name: string;
  description?: string;
  color: string;
  targetCount: number;
  targetDays: number;
  archived: boolean;
}

export interface ParsedRep {
  habitName: string;
  date: string;
  value: RepValue;
}

export interface ImportPlan {
  habits: ParsedHabit[];
  reps: ParsedRep[];
  warnings: string[];
  sources: string[];
}

/** Map a Loop entry code from a CSV cell to our stored value (or null to ignore). */
export function loopCodeToRep(cell: string | undefined): RepValue | null {
  if (cell === undefined || cell.trim() === '') return RepValue.COMPLETED; // presence = done
  const n = Math.round(Number(cell));
  if (n === Entry.YES_MANUAL) return RepValue.COMPLETED;
  if (n === Entry.SKIP) return RepValue.SKIPPED;
  return null; // YES_AUTO / NO / UNKNOWN are derived — don't store them
}

export function parseHabitsCsv(text: string, warnings: string[] = []): ParsedHabit[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const [header, ...body] = rows;
  const iPos = headerIndex(header, 'Position');
  const iName = headerIndex(header, 'Name');
  const iDesc = headerIndex(header, 'Description');
  const iQuestion = headerIndex(header, 'Question');
  const iColor = headerIndex(header, 'Color', 'Colour');
  const iNum = headerIndex(header, 'Frequency_Num', 'NumRepetitions', 'FreqNum', 'Numerator');
  const iDen = headerIndex(header, 'Frequency_Den', 'Interval', 'FreqDen', 'Denominator');
  const iArch = headerIndex(header, 'Archived');
  if (iName < 0) {
    warnings.push('Habits.csv has no "Name" column — skipped.');
    return [];
  }
  return body
    .map((r, idx): ParsedHabit | null => {
      const name = (r[iName] ?? '').trim();
      const q = (iQuestion >= 0 ? r[iQuestion] : '')?.trim();
      const d = (iDesc >= 0 ? r[iDesc] : '')?.trim();
      const desc = q || d || undefined;
      const freq = sanitizeFrequency(Number(iNum >= 0 ? r[iNum] : 1) || 1, Number(iDen >= 0 ? r[iDen] : 1) || 1);
      const pos = iPos >= 0 ? parseInt(r[iPos], 10) : NaN;
      return {
        position: Number.isFinite(pos) ? pos : idx + 1,
        name,
        description: desc,
        color: iColor >= 0 ? normalizeHex(r[iColor]) : DEFAULT_COLOR,
        ...freq,
        archived: iArch >= 0 ? /^(true|1|yes)$/i.test((r[iArch] ?? '').trim()) : false,
      };
    })
    .filter((h): h is ParsedHabit => h !== null);
}

export function parseRepetitionsCsv(text: string, warnings: string[] = []): ParsedRep[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const [header, ...body] = rows;
  const iTs = headerIndex(header, 'Timestamp', 'Date');
  const iName = headerIndex(header, 'Habit_Name', 'Habit', 'Name');
  const iVal = headerIndex(header, 'Value');
  if (iTs < 0 || iName < 0) {
    warnings.push('Repetitions.csv needs "Timestamp" and "Habit_Name" columns — skipped.');
    return [];
  }
  const out: ParsedRep[] = [];
  let bad = 0;
  for (const r of body) {
    const day = parseDateCell(r[iTs] ?? '');
    const habitName = (r[iName] ?? '').trim();
    const value = loopCodeToRep(iVal >= 0 ? r[iVal] : undefined);
    if (Number.isNaN(day) || !habitName) {
      bad++;
      continue;
    }
    if (value !== null) out.push({ habitName, date: dayToIso(day), value });
  }
  if (bad) warnings.push(`Repetitions.csv: ${bad} malformed row(s) ignored.`);
  return out;
}

/** Loop's wide format: `Date,<habit>,<habit>,...` (trailing empty column tolerated). */
export function parseWideCheckmarksCsv(text: string): ParsedRep[] {
  const rows = parseCsv(text);
  if (rows.length < 1) return [];
  const [header, ...body] = rows;
  const out: ParsedRep[] = [];
  for (const r of body) {
    const day = parseDateCell(r[0] ?? '');
    if (Number.isNaN(day)) continue;
    for (let c = 1; c < header.length; c++) {
      const habitName = (header[c] ?? '').trim();
      if (!habitName || r[c] === undefined || r[c].trim() === '') continue;
      const value = loopCodeToRep(r[c]);
      if (value !== null) out.push({ habitName, date: dayToIso(day), value });
    }
  }
  return out;
}

/** Loop's per-habit `NNN Name/Checkmarks.csv`: rows of `date,value` (header optional). */
export function parsePerHabitCheckmarksCsv(text: string, habitName: string): ParsedRep[] {
  const out: ParsedRep[] = [];
  for (const r of parseCsv(text)) {
    const day = parseDateCell(r[0] ?? '');
    if (Number.isNaN(day) || r[1] === undefined || r[1].trim() === '') continue;
    const value = loopCodeToRep(r[1]);
    if (value !== null) out.push({ habitName, date: dayToIso(day), value });
  }
  return out;
}

const baseName = (path: string) => path.split('/').pop()!.toLowerCase();

/** Build an import plan from a map of `path -> CSV text`. Pure; no DB access. */
export function planFromTexts(files: Record<string, string>): ImportPlan {
  const warnings: string[] = [];
  const sources: string[] = [];
  const entries = Object.entries(files).filter(([p]) => !p.startsWith('__MACOSX/') && p.toLowerCase().endsWith('.csv'));
  const perHabitFolder = /(?:^|\/)\d+ [^/]+\/[^/]+$/;
  const find = (name: string) =>
    entries
      .filter(([p]) => baseName(p) === name && !perHabitFolder.test(p))
      .sort((a, b) => a[0].split('/').length - b[0].split('/').length)[0];

  const habitsFile = find('habits.csv');
  const habits = habitsFile ? parseHabitsCsv(habitsFile[1], warnings) : [];
  if (habitsFile) sources.push(habitsFile[0]);

  let reps: ParsedRep[] = [];
  const repsFile = find('repetitions.csv');
  const wideFile = find('checkmarks.csv');
  if (repsFile) {
    reps = parseRepetitionsCsv(repsFile[1], warnings);
    sources.push(repsFile[0]);
  } else if (wideFile) {
    reps = parseWideCheckmarksCsv(wideFile[1]);
    sources.push(wideFile[0]);
  } else {
    // Per-habit folders: "001 Meditate/Checkmarks.csv"
    for (const [path, text] of entries) {
      const m = /(?:^|\/)(\d+) ([^/]+)\/checkmarks\.csv$/i.exec(path);
      if (!m) continue;
      const pos = parseInt(m[1], 10);
      const habitName = habits.find((h) => h.position === pos)?.name ?? m[2];
      reps.push(...parsePerHabitCheckmarksCsv(text, habitName));
      sources.push(path);
    }
  }

  if (!habitsFile && !reps.length) warnings.push('No Habits.csv, Repetitions.csv or Checkmarks.csv found.');
  return { habits, reps, warnings, sources };
}

/** Read user-selected files (CSV and/or ZIP) into a `path -> text` map. */
export async function readImportFiles(fileList: Iterable<File>): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const file of fileList) {
    const buf = new Uint8Array(await file.arrayBuffer());
    const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // "PK"
    if (isZip) {
      const unzipped = unzipSync(buf, { filter: (f) => f.name.toLowerCase().endsWith('.csv') });
      for (const [path, data] of Object.entries(unzipped)) out[path] = strFromU8(data);
    } else {
      out[file.name] = new TextDecoder('utf-8').decode(buf);
    }
  }
  return out;
}

export interface ImportResult {
  habitsCreated: number;
  habitsUpdated: number;
  repetitions: number;
  warnings: string[];
}

/** Local-midnight epoch ms for an ISO date (used as createdAt for imported habits). */
function isoToLocalMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/**
 * Apply a plan to IndexedDB atomically.
 * - `merge` (default): habits are matched by name (case-insensitive) and updated;
 *   repetitions are upserted per habit/day. Nothing that exists locally is removed.
 * - `replace`: all local data is wiped first.
 */
export async function applyImport(plan: ImportPlan, mode: 'merge' | 'replace' = 'merge'): Promise<ImportResult> {
  const result: ImportResult = { habitsCreated: 0, habitsUpdated: 0, repetitions: 0, warnings: [...plan.warnings] };

  await db.transaction('rw', db.habits, db.repetitions, async () => {
    if (mode === 'replace') {
      await db.repetitions.clear();
      await db.habits.clear();
    }
    const existing = await db.habits.toArray();
    const byName = new Map(existing.map((h) => [h.name.trim().toLowerCase(), h]));
    let nextOrder = existing.reduce((m, h) => Math.max(m, h.order), -1) + 1;

    // Earliest repetition per habit name -> sensible createdAt for new habits.
    const earliest = new Map<string, string>();
    for (const r of plan.reps) {
      const k = r.habitName.toLowerCase();
      const cur = earliest.get(k);
      if (!cur || r.date < cur) earliest.set(k, r.date);
    }
    const createdAtFor = (name: string) => {
      const e = earliest.get(name.toLowerCase());
      return e ? isoToLocalMs(e) : Date.now();
    };

    const upserts: Habit[] = [];
    for (const p of [...plan.habits].sort((a, b) => a.position - b.position)) {
      const key = p.name.toLowerCase();
      const found = byName.get(key);
      const common = {
        name: p.name,
        description: p.description,
        color: p.color,
        targetCount: p.targetCount,
        targetDays: p.targetDays,
        frequencyType: classifyFrequency(p.targetCount, p.targetDays),
        archived: p.archived,
      };
      if (found) {
        const updated: Habit = { ...found, ...common, createdAt: Math.min(found.createdAt, createdAtFor(p.name)) };
        byName.set(key, updated);
        upserts.push(updated);
        result.habitsUpdated++;
      } else {
        const created: Habit = { id: uuid(), ...common, order: nextOrder++, createdAt: createdAtFor(p.name) };
        byName.set(key, created);
        upserts.push(created);
        result.habitsCreated++;
      }
    }

    // Repetitions referencing unknown habits: create a default habit rather than dropping data.
    for (const r of plan.reps) {
      const key = r.habitName.toLowerCase();
      if (byName.has(key)) continue;
      const created: Habit = {
        id: uuid(),
        name: r.habitName,
        color: DEFAULT_COLOR,
        frequencyType: 'every_day',
        targetCount: 1,
        targetDays: 1,
        archived: false,
        order: nextOrder++,
        createdAt: createdAtFor(r.habitName),
      };
      byName.set(key, created);
      upserts.push(created);
      result.habitsCreated++;
    }
    await db.habits.bulkPut(upserts);

    const repRecords = new Map<string, Repetition>();
    for (const r of plan.reps) {
      const habit = byName.get(r.habitName.toLowerCase())!;
      if (Number.isNaN(isoToDay(r.date))) continue;
      const id = repId(habit.id, r.date);
      repRecords.set(id, { id, habitId: habit.id, date: r.date, value: r.value });
    }
    await db.repetitions.bulkPut([...repRecords.values()]);
    result.repetitions = repRecords.size;
  });

  return result;
}
