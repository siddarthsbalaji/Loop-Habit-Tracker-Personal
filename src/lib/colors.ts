/**
 * Loop Habit Tracker's material palette (PaletteColor indices 0..19 in uhabits).
 * We expose 12 curated presets in the picker; any hex is accepted on import.
 */
export const LOOP_PALETTE = [
  '#D32F2F', // 0 red
  '#E64A19', // 1 deep orange
  '#F57C00', // 2 orange
  '#FF8F00', // 3 amber
  '#F9A825', // 4 yellow
  '#AFB42B', // 5 lime
  '#7CB342', // 6 light green
  '#388E3C', // 7 green
  '#00897B', // 8 teal
  '#00ACC1', // 9 cyan
  '#039BE5', // 10 light blue
  '#1976D2', // 11 blue
  '#303F9F', // 12 indigo
  '#5E35B1', // 13 deep purple
  '#8E24AA', // 14 purple
  '#D81B60', // 15 pink
  '#5D4037', // 16 brown
  '#303030', // 17 dark grey
  '#757575', // 18 grey
  '#AAAAAA', // 19 light grey
] as const;

export const PRESET_COLORS: string[] = [
  '#D32F2F',
  '#F57C00',
  '#F9A825',
  '#7CB342',
  '#388E3C',
  '#00897B',
  '#039BE5',
  '#1976D2',
  '#5E35B1',
  '#8E24AA',
  '#D81B60',
  '#757575',
];

export const DEFAULT_COLOR = '#00897B';

export function normalizeHex(input: string | undefined | null): string {
  if (!input) return DEFAULT_COLOR;
  const s = input.trim();
  // Loop (older exports) may store a palette index instead of a hex value.
  if (/^\d{1,2}$/.test(s)) return LOOP_PALETTE[Number(s)] ?? DEFAULT_COLOR;
  let hex = s.replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map((c) => c + c).join('');
  if (/^[0-9a-f]{8}$/i.test(hex)) hex = hex.slice(2); // ARGB -> RGB
  return /^[0-9a-f]{6}$/i.test(hex) ? `#${hex.toUpperCase()}` : DEFAULT_COLOR;
}

/** `#RRGGBB` + alpha (0..1) -> `rgba()` string. */
export function withAlpha(hex: string, alpha: number): string {
  const h = normalizeHex(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Brighten dark palette colors slightly so they pop on a dark background. */
export function displayColor(hex: string, dark: boolean): string {
  if (!dark) return normalizeHex(hex);
  const h = normalizeHex(hex).slice(1);
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lum = (0.299 * ch[0] + 0.587 * ch[1] + 0.114 * ch[2]) / 255;
  if (lum > 0.45) return `#${h}`;
  const k = 0.45 - lum; // lift towards white proportionally to darkness
  const lifted = ch.map((c) => Math.round(c + (255 - c) * k * 0.9));
  return `#${lifted.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
