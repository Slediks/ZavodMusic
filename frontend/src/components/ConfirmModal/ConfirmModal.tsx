import styles from "./ConfirmModal.module.css";
import { Button } from "../Button/Button";
import { Modal } from "../Modal/Modal";

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  text: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({ isOpen, title, text, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onCancel} modalClassName={styles["ui-modal-compact"]}>
      <p className={styles["confirm-modal-text"]}>{text}</p>
      <div className={styles["ui-modal-actions"]}>
        <Button variant="ghost" onClick={onCancel}>Отмена</Button>
        <Button variant="danger" onClick={onConfirm}>Подтвердить</Button>
      </div>
    </Modal>
  );
}


