import styles from './ToastContainer.module.css';
import { useToast } from "../../context/ToastContext";

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className={styles["toast-container"]} aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className={`${'{'}styles["toast-item"]} toast-${toast.type}`}
          onClick={() => removeToast(toast.id)}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}












