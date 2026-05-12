import styles from "./Modal.module.css";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { UiIcon } from "../UiIcon/UiIcon";

type ModalProps = {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  showCloseButton?: boolean;
  modalClassName?: string;
};

export function Modal({ isOpen, title, onClose, children, showCloseButton = true, modalClassName = "" }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles["ui-modal-backdrop"]} onClick={onClose} role="dialog" aria-modal="true">
      <div className={[styles["ui-modal"], modalClassName].filter(Boolean).join(" ")} onClick={(e) => e.stopPropagation()}>
        {title || showCloseButton ? (
          <div className={styles["ui-modal-header"]}>
            {title ? <h3>{title}</h3> : null}
            {showCloseButton ? (
              <button type="button" className={styles["ui-modal-close"]} onClick={onClose} aria-label="Закрыть">
                <UiIcon name="close" className={styles["ui-modal-close-icon"]} />
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}


