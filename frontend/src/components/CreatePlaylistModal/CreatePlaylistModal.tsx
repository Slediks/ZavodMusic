import styles from "./CreatePlaylistModal.module.css";
import { useState } from "react";
import { Button } from "../Button/Button";
import { Modal } from "../Modal/Modal";
import { UiIcon } from "../UiIcon/UiIcon";

type CreatePlaylistModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (body: { title: string; description: string; isPublic: boolean }) => Promise<void>;
};

export function CreatePlaylistModal({ isOpen, onClose, onSubmit }: CreatePlaylistModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const togglePrivacy = () => setIsPublic((prev) => !prev);

  return (
    <Modal isOpen={isOpen} title="Создать плейлист" onClose={onClose}>
      <div className={styles["form-grid"]}>
        <input placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="Описание" value={description} onChange={(e) => setDescription(e.target.value)} />

        <div
          role="button"
          tabIndex={0}
          className={`${styles["privacy-toggle"]} ${isPublic ? styles["is-public"] : ""}`.trim()}
          onClick={togglePrivacy}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              togglePrivacy();
            }
          }}
          aria-pressed={isPublic}
        >
          <UiIcon name={isPublic ? "lockOff" : "lock"} className={styles["privacy-toggle-icon"]} />
          {isPublic ? "Публичный" : "Приватный"}
        </div>
      </div>

      <div className={styles["ui-modal-actions"]}>
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button onClick={async () => { await onSubmit({ title, description, isPublic }); setTitle(""); setDescription(""); setIsPublic(false); }}>Создать</Button>
      </div>
    </Modal>
  );
}


