import styles from "./EditPlaylistModal.module.css";
import { useEffect, useState } from "react";
import type { Playlist } from "../../types/playlist";
import { Button } from "../Button/Button";
import { Modal } from "../Modal/Modal";
import { UiIcon } from "../UiIcon/UiIcon";

type EditPlaylistModalProps = {
  playlist: Playlist | null;
  onClose: () => void;
  onSubmit: (id: string, body: { title: string; description: string; isPublic: boolean }) => Promise<void>;
};

export function EditPlaylistModal({ playlist, onClose, onSubmit }: EditPlaylistModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (!playlist) return;
    setTitle(playlist.title);
    setDescription(playlist.description);
    setIsPublic(playlist.isPublic);
  }, [playlist]);

  const togglePrivacy = () => setIsPublic((prev) => !prev);

  return (
    <Modal isOpen={Boolean(playlist)} title="Редактировать плейлист" onClose={onClose}>
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
        <Button onClick={async () => { if (!playlist) return; await onSubmit(playlist.id, { title, description, isPublic }); }}>Сохранить</Button>
      </div>
    </Modal>
  );
}


