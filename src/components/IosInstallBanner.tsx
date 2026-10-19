import { useState } from 'react';
import { Share, SquarePlus, X } from 'lucide-react';
import { isIos, isStandalone } from '../lib/share';
import { useSettings, updateSettings } from '../hooks/useSettings';

export function IosInstallBanner() {
  const { installHintDismissed } = useSettings();
  const [dismissedLocal, setDismissedLocal] = useState(false);

  // Only show if running on iOS, in browser mode (not standalone), and not previously dismissed
  const shouldShow = isIos() && !isStandalone() && !installHintDismissed && !dismissedLocal;

  if (!shouldShow) return null;

  const dismiss = () => {
    setDismissedLocal(true);
    updateSettings({ installHintDismissed: true });
  };

  return (
    <aside
      aria-label="Install app instructions"
      className="card relative mx-4 mb-3 border-accent/30 bg-accent/10 p-3.5 shadow-card"
    >
      <button
        type="button"
        className="icon-btn absolute right-2 top-2 h-7 w-7 text-muted hover:text-ink"
        onClick={dismiss}
        aria-label="Dismiss install guide"
      >
        <X size={15} />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent text-white shadow-sm">
          <SquarePlus size={18} />
        </div>
        <div className="text-[13px] leading-snug">
          <p className="font-semibold text-ink">Install Loop on your iPhone</p>
          <p className="mt-1 text-muted">
            Tap the Share button <Share size={13} className="inline align-text-bottom text-ink" /> below
            in Safari, then select <strong className="text-ink">Add to Home Screen</strong> for full
            offline standalone mode.
          </p>
        </div>
      </div>
    </aside>
  );
}
