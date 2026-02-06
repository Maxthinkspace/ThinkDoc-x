import * as React from "react";

interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
}

interface ToastContextType {
  toast: (toast: Toast) => void;
  toasts: Toast[];
  removeToast: (index: number) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const toast = React.useCallback((newToast: Toast) => {
    setToasts((prev) => [...prev, newToast]);
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 5000);
  }, []);

  const removeToast = React.useCallback((index: number) => {
    setToasts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      {/* Toast display container - you can style this as needed */}
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        right: '20px', 
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {toasts.map((t, index) => (
          <div
            key={index}
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e1e1e1',
              borderRadius: '8px',
              padding: '12px 16px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              maxWidth: '300px',
              cursor: 'pointer'
            }}
            onClick={() => removeToast(index)}
          >
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>{t.title}</div>
            {t.description && (
              <div style={{ fontSize: '14px', color: '#666' }}>{t.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
