import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'error' | 'info';

type Toast = Readonly<{
  id: string;
  tone: ToastTone;
  message: string;
}>;

type ToastContextValue = Readonly<{
  notify: (message: string, tone?: ToastTone) => void;
}>;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, tone: ToastTone = 'info'): void => {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 grid w-[min(24rem,calc(100vw-2rem))] gap-3">
        {toasts.map((toast) => (
          <div
            className={`rounded-2xl border bg-white/95 p-4 text-sm shadow-soft backdrop-blur ${
              toast.tone === 'error'
                ? 'border-rose-200 text-rose-900'
                : toast.tone === 'success'
                  ? 'border-emerald-200 text-emerald-900'
                  : 'border-slate-200 text-slate-800'
            }`}
            key={toast.id}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (context === null) {
    throw new Error('useToast must be used within ToastProvider.');
  }

  return context;
}
