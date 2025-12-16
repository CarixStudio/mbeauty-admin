
import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Undo2 } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  onUndo?: () => void;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, onUndo?: () => void) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', onUndo?: () => void) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, onUndo }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm transform transition-all duration-300 animate-in slide-in-from-right-full fade-in zoom-in-95
              ${toast.type === 'success' ? 'bg-white/95 border-green-200 text-green-800 dark:bg-gray-900/95 dark:border-green-900 dark:text-green-400' : ''}
              ${toast.type === 'error' ? 'bg-white/95 border-red-200 text-red-800 dark:bg-gray-900/95 dark:border-red-900 dark:text-red-400' : ''}
              ${toast.type === 'info' ? 'bg-white/95 border-blue-200 text-blue-800 dark:bg-gray-900/95 dark:border-blue-900 dark:text-blue-400' : ''}
              ${toast.type === 'warning' ? 'bg-white/95 border-amber-200 text-amber-800 dark:bg-gray-900/95 dark:border-amber-900 dark:text-amber-400' : ''}
            `}
          >
            {toast.type === 'success' && <CheckCircle size={20} className="shrink-0" />}
            {toast.type === 'error' && <AlertCircle size={20} className="shrink-0" />}
            {toast.type === 'info' && <Info size={20} className="shrink-0" />}
            {toast.type === 'warning' && <AlertTriangle size={20} className="shrink-0" />}
            
            <span className="text-sm font-medium">{toast.message}</span>
            
            {toast.onUndo && (
              <button 
                onClick={() => { toast.onUndo?.(); removeToast(toast.id); }}
                className="ml-auto px-3 py-1.5 bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-lg text-xs font-bold hover:opacity-80 transition-opacity flex items-center gap-1.5 shadow-sm"
              >
                <Undo2 size={12} /> Undo
              </button>
            )}

            <button onClick={() => removeToast(toast.id)} className="ml-2 opacity-50 hover:opacity-100 transition-opacity">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
