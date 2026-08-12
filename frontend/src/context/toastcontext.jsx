import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";

const ToastContext = createContext(null);

let toastIdSeq = 0;

// lucide, like the rest of the app. These were Font Awesome glyphs, which made
// the toast the one surface in the product drawn in a different icon language —
// and pulled the whole Font Awesome stylesheet off a CDN to render three icons.
// `warning` was missing from the old map, so a warning toast (the OCR
// couldn't-verify path in employee.jsx) silently showed the info icon.
const ICONS = {
  success: Check,
  error: X,
  warning: AlertTriangle,
  info: Info,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast) => {
      const id = ++toastIdSeq;
      const duration = toast.duration ?? 4000;
      const newToast = { id, variant: "info", ...toast };
      setToasts((prev) => [...prev, newToast]);
      if (duration > 0) {
        setTimeout(() => dismissToast(id), duration);
      }
      return id;
    },
    [dismissToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function Toast({ toast, onDismiss }) {
  const Icon = ICONS[toast.variant] || ICONS.info;
  return (
    <div className={`toast-card toast-${toast.variant}`} role="status">
      <div className="toast-icon">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        {toast.message && <div className="toast-message">{toast.message}</div>}
      </div>
      <button
        className="toast-dismiss"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return ctx;
}
