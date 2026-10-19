import { useSyncExternalStore } from 'react';
import type { HabitSortOption, ThemePreference } from '../types';

export interface Settings {
  theme: ThemePreference;
  /** Loop-Android style: newest day on the left. Default: newest on the right. */
  reverseDays: boolean;
  installHintDismissed: boolean;
  sortBy: HabitSortOption;
}

const KEYS: Record<keyof Settings, string> = {
  theme: 'loop.theme',
  reverseDays: 'loop.reverseDays',
  installHintDismissed: 'loop.installHintDismissed',
  sortBy: 'loop.sortBy',
};

const DEFAULTS: Settings = {
  theme: 'system',
  reverseDays: false,
  installHintDismissed: false,
  sortBy: 'manual',
};

function read(): Settings {
  try {
    const theme = (localStorage.getItem(KEYS.theme) as ThemePreference | null) ?? DEFAULTS.theme;
    const sortBy = (localStorage.getItem(KEYS.sortBy) as HabitSortOption | null) ?? DEFAULTS.sortBy;
    return {
      theme: ['system', 'dark', 'light'].includes(theme) ? theme : DEFAULTS.theme,
      reverseDays: localStorage.getItem(KEYS.reverseDays) === '1',
      installHintDismissed: localStorage.getItem(KEYS.installHintDismissed) === '1',
      sortBy: ['manual', 'name', 'score_desc', 'score_asc'].includes(sortBy) ? sortBy : DEFAULTS.sortBy,
    };
  } catch {
    return DEFAULTS;
  }
}

let snapshot = read();
const listeners = new Set<() => void>();

export function updateSettings(patch: Partial<Settings>): void {
  snapshot = { ...snapshot, ...patch };
  try {
    for (const [k, v] of Object.entries(patch) as [keyof Settings, Settings[keyof Settings]][]) {
      localStorage.setItem(KEYS[k], typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
    }
  } catch {
    /* private mode — keep in memory */
  }
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => snapshot,
  );
}

const darkQuery = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function subscribeSystemDark(cb: () => void) {
  darkQuery?.addEventListener('change', cb);
  return () => darkQuery?.removeEventListener('change', cb);
}

/** Resolved dark/light state, honoring the "system" preference. */
export function useIsDark(): boolean {
  const { theme } = useSettings();
  const systemDark = useSyncExternalStore(subscribeSystemDark, () => darkQuery?.matches ?? true);
  return theme === 'dark' || (theme === 'system' && systemDark);
}
