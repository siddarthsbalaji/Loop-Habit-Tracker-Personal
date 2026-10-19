import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Prevent dismiss by backdrop / drag (e.g. while saving). */
  locked?: boolean;
}

/**
 * iOS-style bottom sheet with backdrop, slide-up animation, drag-to-dismiss on
 * the grabber, and safe-area padding.
 */
export function Sheet({ open, onClose, title, children, footer, locked }: Props) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setDragY(0);
    } else if (mounted) {
      setClosing(true);
      const t = window.setTimeout(() => {
        setMounted(false);
        setClosing(false);
      }, 220);
      return () => window.clearTimeout(t);
    }
  }, [open, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !locked && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, locked, onClose]);

  if (!mounted) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    dragStart.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, e.clientY - dragStart.current));
  };
  const onPointerUp = () => {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragY > 110) onClose();
    else setDragY(0);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`absolute inset-0 bg-black/55 backdrop-blur-[2px] transition-opacity duration-200 ${
          closing ? 'opacity-0' : 'animate-fade-in'
        }`}
        onClick={() => !locked && onClose()}
      />
      <div
        className={`relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-4xl border-t bg-surface shadow-sheet hairline ${
          closing ? 'translate-y-full transition-transform duration-200 ease-in' : 'animate-slide-up'
        }`}
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
      >
        <div
          className="flex cursor-grab touch-none flex-col items-center pb-1 pt-2.5"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="h-1.5 w-10 rounded-full bg-ink/20" />
          {title && (
            <div className="relative flex w-full items-center justify-center px-14 pt-3">
              <h2 className="truncate text-[17px] font-semibold">{title}</h2>
              <button
                type="button"
                className="icon-btn absolute right-3 top-1.5 h-8 w-8 bg-elevated"
                onClick={onClose}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label="Close"
                disabled={locked}
              >
                <X size={17} />
              </button>
            </div>
          )}
        </div>
        <div className="scroll-area flex-1 px-5 pb-4 pt-3">{children}</div>
        {footer && <div className="border-t px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 hairline">{footer}</div>}
        {!footer && <div className="pb-[env(safe-area-inset-bottom)]" />}
      </div>
    </div>,
    document.body,
  );
}
