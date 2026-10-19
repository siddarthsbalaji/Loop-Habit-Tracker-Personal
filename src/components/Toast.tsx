import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface ToastOptions {
  message: string;
  action?: { label: string; onClick: () => void };
  /** ms; 0 = sticky until dismissed / action clicked. */
  duration?: number;
  tone?: 'default' | 'success' | 'error';
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(t: ToastOptions) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const show = useCallback(
    (t: ToastOptions) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-2), { ...t, id }]);
      const duration = t.duration ?? 3200;
      if (duration > 0) window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[70] flex flex-col items-center gap-2 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              className={`glass pointer-events-auto flex w-full max-w-md animate-toast-in items-center gap-3 rounded-2xl border px-4 py-3 text-[14px] shadow-sheet hairline ${
                t.tone === 'error' ? 'text-danger' : ''
              }`}
            >
              <span className="flex-1 leading-snug">{t.message}</span>
              {t.action && (
                <button
                  type="button"
                  className="shrink-0 rounded-lg px-2 py-1 font-semibold text-accent active:bg-ink/10"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label}
                </button>
              )}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
