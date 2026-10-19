import { useEffect, useRef, useState } from 'react';
import {
  Check,
  Database,
  Download,
  HardDrive,
  Moon,
  Sparkles,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react';
import { Sheet } from './Sheet';
import { ConfirmDialog } from './ConfirmDialog';
import { useSettings, updateSettings } from '../hooks/useSettings';
import { exportAll, planFromTexts, readImportFiles, applyImport } from '../lib/loopCsv';
import { deliverFiles, isStandalone } from '../lib/share';
import { requestPersistentStorage } from '../db/db';
import { wipeAllData, createHabit, setRepetitionValue } from '../db/actions';
import { useToast } from './Toast';
import { dayToIso, todayIndex } from '../lib/dates';
import { RepValue } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export function SettingsModal({ open, onClose, onRefreshData }: Props) {
  const { theme, reverseDays } = useSettings();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);

  useEffect(() => {
    if (open) {
      if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
        navigator.storage.persisted().then(setIsPersisted);
      }
    }
  }, [open]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { zip, fileName } = await exportAll();
      const status = await deliverFiles([
        {
          name: fileName,
          data: zip as unknown as BlobPart,
          type: 'application/zip',
        },
      ]);
      if (status !== 'cancelled') {
        toast({ message: `Exported as ${fileName}`, tone: 'success' });
      }
    } catch (err) {
      toast({ message: `Export failed: ${String(err)}`, tone: 'error' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsImporting(true);
    try {
      const texts = await readImportFiles(files);
      const plan = planFromTexts(texts);
      if (plan.habits.length === 0 && plan.reps.length === 0) {
        toast({
          message: 'No valid Loop habit or repetition data found in the uploaded file.',
          tone: 'error',
        });
        return;
      }

      const result = await applyImport(plan, 'merge');
      toast({
        message: `Imported ${result.habitsCreated + result.habitsUpdated} habits and ${result.repetitions} repetitions!`,
        tone: 'success',
      });
      onRefreshData?.();
      onClose();
    } catch (err) {
      toast({ message: `Import error: ${String(err)}`, tone: 'error' });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRequestStorage = async () => {
    const ok = await requestPersistentStorage();
    setIsPersisted(ok);
    toast({
      message: ok ? 'Persistent storage granted!' : 'Browser could not guarantee persistent storage.',
      tone: ok ? 'success' : 'default',
    });
  };

  const handleResetData = async () => {
    setConfirmReset(false);
    await wipeAllData();
    toast({ message: 'All habit data has been cleared.', tone: 'default' });
    onRefreshData?.();
    onClose();
  };

  const handleLoadSampleData = async () => {
    setConfirmSample(false);
    try {
      // Create 3 sample habits with 30-day realistic histories
      const today = todayIndex();

      const h1Id = await createHabit({
        name: 'Morning Meditation',
        description: '10 minutes of mindfulness before starting work',
        color: '#00897B',
        targetCount: 1,
        targetDays: 1,
      });

      const h2Id = await createHabit({
        name: 'Workout / Cardio',
        description: 'Gym or 5k run',
        color: '#E64A19',
        targetCount: 4,
        targetDays: 7,
      });

      const h3Id = await createHabit({
        name: 'Read 20 Pages',
        description: 'Books on science, philosophy, or engineering',
        color: '#1976D2',
        targetCount: 1,
        targetDays: 1,
      });

      // Populate recent checkmarks
      for (let d = today - 30; d <= today; d++) {
        const iso = dayToIso(d);
        // Meditation: ~85% consistency
        if ((d % 7 !== 2) && (d % 5 !== 0)) {
          await setRepetitionValue(h1Id, iso, RepValue.COMPLETED);
        } else if (d % 7 === 2) {
          await setRepetitionValue(h1Id, iso, RepValue.SKIPPED);
        }

        // Workout: 4 days a week
        if ([1, 3, 5, 6].includes(d % 7)) {
          await setRepetitionValue(h2Id, iso, RepValue.COMPLETED);
        }

        // Reading: ~75% consistency
        if (d % 4 !== 1) {
          await setRepetitionValue(h3Id, iso, RepValue.COMPLETED);
        }
      }

      toast({ message: 'Loaded 3 sample habits with 30-day history!', tone: 'success' });
      onRefreshData?.();
      onClose();
    } catch (err) {
      toast({ message: `Failed to load sample data: ${String(err)}`, tone: 'error' });
    }
  };

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Settings & Backup">
        <div className="space-y-6 pb-6">
          {/* Appearance Section */}
          <div className="card p-4">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
              Appearance
            </h3>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[15px] font-medium text-ink">Theme</span>
              <div className="segmented grid-cols-3 text-xs">
                <button
                  type="button"
                  aria-pressed={theme === 'system'}
                  onClick={() => updateSettings({ theme: 'system' })}
                  className="flex items-center gap-1 px-2.5 py-1 text-[12px]"
                >
                  System
                </button>
                <button
                  type="button"
                  aria-pressed={theme === 'light'}
                  onClick={() => updateSettings({ theme: 'light' })}
                  className="flex items-center gap-1 px-2.5 py-1 text-[12px]"
                >
                  <Sun size={13} />
                  Light
                </button>
                <button
                  type="button"
                  aria-pressed={theme === 'dark'}
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className="flex items-center gap-1 px-2.5 py-1 text-[12px]"
                >
                  <Moon size={13} />
                  Dark
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3 hairline">
              <div>
                <span className="text-[15px] font-medium text-ink">Reverse Day Slider</span>
                <p className="text-[12px] text-muted">Show newest date on the left (Loop Android style)</p>
              </div>
              <button
                type="button"
                onClick={() => updateSettings({ reverseDays: !reverseDays })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  reverseDays ? 'bg-accent' : 'bg-elevated'
                }`}
                aria-pressed={reverseDays}
                aria-label="Toggle reverse day slider"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    reverseDays ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Habit Sorting Section */}
          <div className="card p-4">
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
              Habits Sorting
            </h3>
            <p className="mt-1 text-[13px] text-muted">Choose how habits are ordered in the main view.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                aria-pressed={useSettings().sortBy === 'manual'}
                onClick={() => updateSettings({ sortBy: 'manual' })}
                className={`rounded-xl border p-2.5 text-left transition hairline ${
                  useSettings().sortBy === 'manual'
                    ? 'border-accent bg-accent/10 font-bold text-ink'
                    : 'bg-elevated text-muted hover:text-ink'
                }`}
              >
                <div className="font-semibold text-[13px]">Manual</div>
                <div className="text-[11px] opacity-75">Drag & drop order</div>
              </button>

              <button
                type="button"
                aria-pressed={useSettings().sortBy === 'name'}
                onClick={() => updateSettings({ sortBy: 'name' })}
                className={`rounded-xl border p-2.5 text-left transition hairline ${
                  useSettings().sortBy === 'name'
                    ? 'border-accent bg-accent/10 font-bold text-ink'
                    : 'bg-elevated text-muted hover:text-ink'
                }`}
              >
                <div className="font-semibold text-[13px]">Title (A → Z)</div>
                <div className="text-[11px] opacity-75">Alphabetical</div>
              </button>

              <button
                type="button"
                aria-pressed={useSettings().sortBy === 'score_desc'}
                onClick={() => updateSettings({ sortBy: 'score_desc' })}
                className={`rounded-xl border p-2.5 text-left transition hairline ${
                  useSettings().sortBy === 'score_desc'
                    ? 'border-accent bg-accent/10 font-bold text-ink'
                    : 'bg-elevated text-muted hover:text-ink'
                }`}
              >
                <div className="font-semibold text-[13px]">Score: High → Low</div>
                <div className="text-[11px] opacity-75">Strongest habits first</div>
              </button>

              <button
                type="button"
                aria-pressed={useSettings().sortBy === 'score_asc'}
                onClick={() => updateSettings({ sortBy: 'score_asc' })}
                className={`rounded-xl border p-2.5 text-left transition hairline ${
                  useSettings().sortBy === 'score_asc'
                    ? 'border-accent bg-accent/10 font-bold text-ink'
                    : 'bg-elevated text-muted hover:text-ink'
                }`}
              >
                <div className="font-semibold text-[13px]">Score: Low → High</div>
                <div className="text-[11px] opacity-75">Focus on growth</div>
              </button>
            </div>
          </div>

          {/* Loop CSV Data Backup & Restore */}
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-accent" />
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
                Loop Data (CSV / ZIP)
              </h3>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Fully compatible with <strong>iSoron/uhabits</strong> Android exports. Export or import
              Habits.csv and Repetitions.csv without data loss.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="btn-secondary h-11 text-xs font-semibold"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download size={15} />
                {isExporting ? 'Exporting...' : 'Export ZIP'}
              </button>

              <button
                type="button"
                className="btn-secondary h-11 text-xs font-semibold"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload size={15} />
                {isImporting ? 'Importing...' : 'Import CSV/ZIP'}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.csv,text/csv,application/zip"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* Storage & PWA Status */}
          <div className="card p-4">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-muted" />
              <h3 className="text-[13px] font-semibold uppercase tracking-wider text-muted">
                Offline Persistence
              </h3>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <span className="text-[14px] font-medium text-ink">IndexedDB Storage</span>
                <p className="text-[12px] text-muted">
                  {isPersisted === true
                    ? 'Storage is protected against Safari auto-eviction.'
                    : 'Tap below to request persistent storage.'}
                </p>
              </div>
              {isPersisted === true ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-500">
                  <Check size={13} />
                  Persisted
                </span>
              ) : (
                <button
                  type="button"
                  className="btn-secondary h-8 px-2.5 text-xs"
                  onClick={handleRequestStorage}
                >
                  Enable
                </button>
              )}
            </div>

            <div className="mt-3 border-t pt-2.5 text-[12px] text-muted hairline">
              <span>App Mode: </span>
              <strong className="text-ink font-semibold">
                {isStandalone() ? 'Standalone PWA (Home Screen)' : 'Browser Safari'}
              </strong>
            </div>
          </div>

          {/* Demo Data & Danger Zone */}
          <div className="space-y-3">
            <button
              type="button"
              className="btn-secondary w-full"
              onClick={() => setConfirmSample(true)}
            >
              <Sparkles size={16} className="text-amber-500" />
              Load Demo Habits
            </button>

            <button
              type="button"
              className="btn-danger w-full"
              onClick={() => setConfirmReset(true)}
            >
              <Trash2 size={16} />
              Reset All Habits & Data
            </button>
          </div>
        </div>
      </Sheet>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={confirmReset}
        title="Reset All Data?"
        message="This will permanently delete all habits, streaks, and checkmark history. Ensure you have exported your data first if you wish to keep it."
        confirmLabel="Wipe Everything"
        destructive
        onConfirm={handleResetData}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={confirmSample}
        title="Load Demo Habits?"
        message="This will add 3 sample habits (Meditation, Workout, Reading) with 30 days of checkmark history. Your existing habits will not be deleted."
        confirmLabel="Load Demo"
        onConfirm={handleLoadSampleData}
        onCancel={() => setConfirmSample(false)}
      />
    </>
  );
}
