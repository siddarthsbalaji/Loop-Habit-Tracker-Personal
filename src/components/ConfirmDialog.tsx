import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** iOS-style alert dialog. */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', destructive, onConfirm, onCancel }: Props) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-8" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-black/55" onClick={onCancel} />
      <div className="glass relative w-full max-w-[290px] animate-toast-in overflow-hidden rounded-2xl border text-center shadow-sheet hairline">
        <div className="px-5 pb-4 pt-5">
          <h3 className="text-[17px] font-semibold">{title}</h3>
          {message && <p className="mt-1.5 text-[13px] leading-snug text-muted">{message}</p>}
        </div>
        <div className="grid grid-cols-2 border-t hairline">
          <button type="button" className="h-12 border-r text-[17px] text-accent hairline active:bg-ink/10" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`h-12 text-[17px] font-semibold active:bg-ink/10 ${destructive ? 'text-danger' : 'text-accent'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
