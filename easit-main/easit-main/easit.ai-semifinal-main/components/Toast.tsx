
import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const icons = {
    error: <AlertCircle size={20} className="text-red-500" />,
    success: <CheckCircle size={20} className="text-green-500" />,
    info: <Info size={20} className="text-blue-500" />
  };

  const bgColors = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  };

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm w-full animate-slide-up-fade-in ${bgColors[toast.type]}`}>
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1">{toast.message}</p>
      <button onClick={() => onClose(toast.id)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
        <X size={16} />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<{ toasts: ToastMessage[]; removeToast: (id: string) => void }> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
};
