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
      <div className="fixed top-4 inset-x-0 mx-auto px-4 z-[80] flex flex-col items-center gap-2 max-w-sm w-full pointer-events-none sm:top-auto sm:inset-x-auto sm:bottom-6 sm:right-6 sm:px-0 sm:items-end">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              transition={{ type: 'spring', stiffness: 450, damping: 28 }}
              className="pointer-events-auto w-full bg-[#18231E]/95 backdrop-blur-xl text-white p-3.5 rounded-2xl shadow-2xl border border-white/15 flex items-start justify-between gap-3 font-sans"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-[#006F3C] text-white shrink-0 mt-0.5 shadow-xs">
                  {toast.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-[#DCE9AF]" />
                  ) : (
                    <Info className="w-4 h-4 text-emerald-200" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">{toast.title}</h4>
                  {toast.message && (
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-normal">
                      {toast.message}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Закрыть уведомление"
                className="text-slate-400 hover:text-white p-1 transition-colors rounded-lg"
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
