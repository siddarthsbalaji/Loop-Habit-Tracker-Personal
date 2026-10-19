import { useEffect, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { Sheet } from './Sheet';
import { PRESET_COLORS, DEFAULT_COLOR, displayColor, normalizeHex } from '../lib/colors';
import { halfLifeDays } from '../lib/scoring';
import { sanitizeFrequency, type HabitDraft } from '../db/actions';
import type { Habit } from '../types';
import { useIsDark } from '../hooks/useSettings';

type Mode = 'daily' | 'weekly' | 'monthly' | 'custom';

interface Props {
  open: boolean;
  habit?: Habit | null;
  onClose: () => void;
  onSubmit: (draft: HabitDraft) => Promise<void>;
}

function modeFor(count: number, days: number): Mode {
  if (days === 1 && count === 1) return 'daily';
  if (days === 7) return 'weekly';
  if (days === 30) return 'monthly';
  return 'custom';
}

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-elevated p-1" aria-label={label}>
      <button type="button" className="icon-btn h-9 w-9" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
        <Minus size={16} />
      </button>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-10 bg-transparent text-center font-semibold tabular-nums focus:outline-none"
        value={value}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
          if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
        }}
        aria-label={label}
      />
      <button type="button" className="icon-btn h-9 w-9" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
        <Plus size={16} />
      </button>
    </div>
  );
}

export function HabitFormModal({ open, habit, onClose, onSubmit }: Props) {
  const dark = useIsDark();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [mode, setMode] = useState<Mode>('daily');
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(1);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name ?? '');
    setDescription(habit?.description ?? '');
    setColor(habit ? normalizeHex(habit.color) : PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    const c = habit?.targetCount ?? 1;
    const d = habit?.targetDays ?? 1;
    setCount(c);
    setDays(d);
    setMode(modeFor(c, d));
    setSaving(false);
    setTouched(false);
  }, [open, habit]);

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'daily') {
      setCount(1);
      setDays(1);
    } else if (m === 'weekly') {
      setDays(7);
      setCount((c) => Math.min(7, Math.max(1, c === 1 && days === 1 ? 3 : c)));
    } else if (m === 'monthly') {
      setDays(30);
      setCount((c) => Math.min(30, Math.max(1, c === 1 && days === 1 ? 10 : c)));
    } else {
      setDays((d) => (d === 1 ? 2 : d));
    }
  };

  const freq = sanitizeFrequency(count, days);
  const nameError = touched && !name.trim();
  const accent = displayColor(color, dark);

  const summary =
    mode === 'daily'
      ? 'Every day'
      : mode === 'weekly'
        ? `${freq.targetCount} ${freq.targetCount === 1 ? 'time' : 'times'} per week`
        : mode === 'monthly'
          ? `${freq.targetCount} ${freq.targetCount === 1 ? 'time' : 'times'} per month`
          : `${freq.targetCount} ${freq.targetCount === 1 ? 'time' : 'times'} every ${freq.targetDays} days`;

  const submit = async () => {
    setTouched(true);
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSubmit({ name, description, color, ...freq });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      locked={saving}
      title={habit ? 'Edit habit' : 'New habit'}
      footer={
        <div className="grid grid-cols-[1fr_2fr] gap-3">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn text-white"
            style={{ background: accent, boxShadow: `0 10px 30px -12px ${accent}` }}
            onClick={submit}
            disabled={saving}
            id="habit-form-save"
          >
            <Check size={18} strokeWidth={2.6} />
            {habit ? 'Save changes' : 'Create habit'}
          </button>
        </div>
      }
    >
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div>
          <label htmlFor="habit-name" className="label">
            Name
          </label>
          <input
            id="habit-name"
            className={`field text-[17px] font-semibold ${nameError ? 'border-danger/70 ring-2 ring-danger/20' : ''}`}
            placeholder="e.g. Meditate"
            value={name}
            maxLength={80}
            autoComplete="off"
            enterKeyHint="done"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            style={{ caretColor: accent }}
          />
          {nameError && <p className="mt-1.5 text-[13px] text-danger">Give your habit a name.</p>}
        </div>

        <div>
          <label htmlFor="habit-desc" className="label">
            Question / notes <span className="normal-case tracking-normal text-faint">(optional)</span>
          </label>
          <textarea
            id="habit-desc"
            className="field min-h-[76px] resize-none leading-snug"
            placeholder="Did you meditate for 10 minutes today?"
            value={description}
            maxLength={280}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <fieldset>
          <legend className="label">Color</legend>
          <div className="grid grid-cols-6 gap-3">
            {PRESET_COLORS.map((c) => {
              const selected = normalizeHex(c) === normalizeHex(color);
              const shown = displayColor(c, dark);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={selected}
                  className="grid aspect-square place-items-center rounded-full transition active:scale-90"
                  style={{
                    background: shown,
                    boxShadow: selected ? `0 0 0 3px rgb(var(--c-surface)), 0 0 0 5px ${shown}` : undefined,
                  }}
                >
                  {selected && <Check size={18} color="#fff" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Frequency</legend>
          <div className="segmented grid-cols-4">
            {(['daily', 'weekly', 'monthly', 'custom'] as Mode[]).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => switchMode(m)} className="capitalize">
                {m}
              </button>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border bg-bg/40 p-4 hairline">
            {mode === 'daily' && <p className="text-[15px] text-muted">Check in once every day.</p>}
            {mode === 'weekly' && (
              <div className="flex items-center justify-between gap-3">
                <Stepper label="times per week" value={freq.targetCount} min={1} max={7} onChange={setCount} />
                <span className="text-[15px] text-muted">times per week</span>
              </div>
            )}
            {mode === 'monthly' && (
              <div className="flex items-center justify-between gap-3">
                <Stepper label="times per month" value={freq.targetCount} min={1} max={30} onChange={setCount} />
                <span className="text-[15px] text-muted">times per month</span>
              </div>
            )}
            {mode === 'custom' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Stepper label="times" value={freq.targetCount} min={1} max={freq.targetDays} onChange={setCount} />
                  <span className="text-[15px] text-muted">times</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <Stepper
                    label="days"
                    value={freq.targetDays}
                    min={1}
                    max={365}
                    onChange={(d) => {
                      setDays(d);
                      setCount((c) => Math.min(c, d));
                    }}
                  />
                  <span className="text-[15px] text-muted">every N days</span>
                </div>
              </div>
            )}
            <div className="mt-4 flex items-center justify-between border-t pt-3 text-[13px] hairline">
              <span className="font-semibold" style={{ color: accent }}>
                {summary}
              </span>
              <span className="text-faint">Score half-life ≈ {Math.round(halfLifeDays(freq))} days</span>
            </div>
          </div>
        </fieldset>
        <button type="submit" hidden />
      </form>
    </Sheet>
  );
}
