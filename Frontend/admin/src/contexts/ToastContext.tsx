/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type ToastVariant = 'success' | 'warning' | 'error' | 'info';

export interface ToastOptions {
  variant?: ToastVariant;
  durationMs?: number | null; // null = persistent until dismissed
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export interface Toast extends Required<Pick<ToastOptions, 'variant'>> {
  id: number;
  message: string;
  title: string | null;
  durationMs: number | null;
  actionLabel: string | null;
  onAction: (() => void) | null;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (message: string, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 5000;
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<number, number>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback((message: string, options: ToastOptions = {}): number => {
    const id = nextId++;
    const variant = options.variant ?? 'info';
    const durationMs = options.durationMs === null
      ? null
      : (options.durationMs ?? DEFAULT_DURATION_MS);
    const toast: Toast = {
      id,
      variant,
      message,
      title: options.title ?? null,
      durationMs,
      actionLabel: options.actionLabel ?? null,
      onAction: options.onAction ?? null,
    };
    setToasts((prev) => [...prev, toast]);
    if (durationMs !== null) {
      const timer = window.setTimeout(() => dismiss(id), durationMs);
      timersRef.current.set(id, timer);
    }
    return id;
  }, [dismiss]);

  const clear = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  useEffect(() => () => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toasts, push, dismiss, clear }), [toasts, push, dismiss, clear]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within <ToastProvider>');
  return ctx;
}

function ToastHost({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-host" role="region" aria-live="polite" aria-label="Notifications">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.variant}`} role="status">
          <div className="toast-body">
            {toast.title ? <strong className="toast-title">{toast.title}</strong> : null}
            <span className="toast-message">{toast.message}</span>
          </div>
          <div className="toast-actions">
            {toast.actionLabel && toast.onAction ? (
              <button
                type="button"
                className="toast-action-btn"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
              >
                {toast.actionLabel}
              </button>
            ) : null}
            <button
              type="button"
              className="toast-close-btn"
              aria-label="Fermer la notification"
              onClick={() => onDismiss(toast.id)}
            >
              x
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
