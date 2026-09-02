import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toastMessage, clearToast } = useUIStore();

  return (
    <BrowserRouter>
      {children}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md flex items-center space-x-3 text-xs font-mono font-bold ${
              toastMessage.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : toastMessage.type === 'error'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : 'bg-teal-500/20 text-teal-300 border-teal-500/40'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={clearToast} className="text-slate-400 hover:text-white ml-2">
              ×
            </button>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
};
