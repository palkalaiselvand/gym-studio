import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        const getIcon = () => {
          switch (toast.type) {
            case 'success':
              return <CheckCircle2 size={18} color="var(--accent-primary)" />;
            case 'error':
              return <AlertCircle size={18} color="var(--accent-rose)" />;
            case 'warning':
              return <AlertTriangle size={18} color="var(--accent-amber)" />;
            default:
              return <Info size={18} color="var(--accent-cyan)" />;
          }
        };

        return (
          <div key={toast.id} className={`toast-item ${toast.type}`}>
            <div style={{ marginTop: '2px' }}>{getIcon()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-main)' }}>
                {toast.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
