import React from 'react';
import { usePOS } from '../context/POSContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export default function Toast() {
  const { toasts } = usePOS();

  if (toasts.length === 0) return null;

  const activeToasts = toasts.slice(-1);

  return (
    <div className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm pointer-events-none">
      {activeToasts.map(toast => {
        let bg = 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20';
        let Icon = CheckCircle2;

        if (toast.type === 'error') {
          bg = 'bg-rose-600 text-white shadow-lg shadow-rose-600/30';
          Icon = AlertCircle;
        } else if (toast.type === 'warning') {
          bg = 'bg-amber-600 text-white shadow-lg shadow-amber-500/20';
          Icon = AlertTriangle;
        } else if (toast.type === 'info') {
          bg = 'bg-stone-800 text-white shadow-lg shadow-stone-800/20';
          Icon = Info;
        }

        return (
          <div
            key={toast.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-medium text-sm animate-fade-in pointer-events-auto transition-all transform ${bg}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
