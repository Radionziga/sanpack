'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Info, X } from 'lucide-react';

interface ToastMessage {
  id: string;
  type: 'success' | 'info';
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, message?: string, type: 'success' | 'info' = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    },
    []
  );

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Floating Toast Notification Container: Top on mobile, Bottom-Right on desktop */}
      <div className="pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[80] mx-auto flex w-full max-w-sm flex-col items-center gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:top-auto sm:px-0 sm:items-end">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="pointer-events-auto flex w-full items-start justify-between gap-3 rounded-[var(--sp-radius-card)] border border-[var(--sp-line)] bg-[color-mix(in_srgb,var(--sp-surface-raised)_95%,transparent)] p-3.5 font-sans text-[var(--sp-ink)] shadow-[var(--sp-shadow-raised)] backdrop-blur-xl"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0 rounded-[var(--sp-radius-control-inner)] bg-[var(--sp-brand)] p-2 text-[var(--sp-on-brand)] shadow-[var(--sp-shadow-soft)]">
                  {toast.type === 'success' ? (
                    <CheckCircle className="size-4 text-[var(--sp-accent)]" />
                  ) : (
                    <Info className="size-4 text-[var(--sp-on-brand)]" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight text-[var(--sp-ink)]">{toast.title}</h4>
                  {toast.message && (
                    <p className="mt-0.5 text-[11px] leading-normal text-[var(--sp-ink-secondary)]">
                      {toast.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Закрыть уведомление"
                className="sp-icon-button rounded-[var(--sp-radius-control-inner)] p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
