import {
  ArrowDown10,
  ArrowDownAZ,
  ArrowUp01,
  Check,
  GripVertical,
} from 'lucide-react';
import { Sheet } from './Sheet';
import type { HabitSortOption } from '../types';

interface Props {
  open: boolean;
  currentSort: HabitSortOption;
  onSelectSort: (option: HabitSortOption) => void;
  onClose: () => void;
}

const SORT_OPTIONS: {
  id: HabitSortOption;
  label: string;
  description: string;
  icon: typeof GripVertical;
}[] = [
  {
    id: 'manual',
    label: 'Manual Order',
    description: 'Drag & drop to order habits as you like',
    icon: GripVertical,
  },
  {
    id: 'name',
    label: 'Title (A → Z)',
    description: 'Alphabetical order by habit name',
    icon: ArrowDownAZ,
  },
  {
    id: 'score_desc',
    label: 'Score: Highest to Lowest',
    description: 'Your strongest habits at the top',
    icon: ArrowDown10,
  },
  {
    id: 'score_asc',
    label: 'Score: Lowest to Highest',
    description: 'Prioritize habits that need attention',
    icon: ArrowUp01,
  },
];

export function SortModal({ open, currentSort, onSelectSort, onClose }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title="Sort Habits">
      <div className="space-y-2 pb-4 pt-1">
        {SORT_OPTIONS.map((opt) => {
          const isSelected = opt.id === currentSort;
          const Icon = opt.icon;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onSelectSort(opt.id);
                onClose();
              }}
              className={`flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition active:scale-[0.98] ${
                isSelected ? 'bg-accent/15 border border-accent/40 shadow-sm' : 'card hover:bg-elevated/80'
              }`}
            >
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${
                  isSelected ? 'bg-accent text-white shadow-sm' : 'bg-elevated text-muted'
                }`}
              >
                <Icon size={20} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[15px] font-semibold ${isSelected ? 'text-ink font-bold' : 'text-ink'}`}>
                    {opt.label}
                  </span>
                </div>
                <p className="text-[12px] text-muted leading-tight mt-0.5">{opt.description}</p>
              </div>

              {isSelected && (
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-white">
                  <Check size={14} strokeWidth={3} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
