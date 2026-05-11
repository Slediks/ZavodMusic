import styles from './AddToPlaylistModal.module.css';
import { useEffect, useState } from "react";
import { playlistsApi } from "../../api/playlistsApi";
import { ApiError } from "../../types/api";
import { Modal } from "../Modal/Modal";

type PlaylistLite = { id: string; title: string; ownerLogin?: string; isPublic?: boolean };

type AddToPlaylistModalProps = {
  isOpen: boolean;
  trackId: string | null;
  trackTitle: string;
  onClose: () => void;
  onDone?: () => void;
};

export function AddToPlaylistModal({ isOpen, trackId, trackTitle, onClose, onDone }: AddToPlaylistModalProps) {
  const [items, setItems] = useState<PlaylistLite[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await playlistsApi.getMy({ page: 1, limit: 100 });
        setItems(response.own.items || []);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Не удалось загрузить плейлисты";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [isOpen]);

  const addTrackToPlaylist = async (playlistId: string) => {
    if (!trackId) return;
    try {
      await playlistsApi.addTrack(playlistId, trackId);
      onDone?.();
      onClose();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Не удалось добавить трек";
      setError(msg);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Добавить в плейлист" onClose={onClose}>
      <p className={styles["playlist-track-caption"]}>Трек: <span className={styles["playlist-track-title"]}>{trackTitle}</span></p>

      {loading ? <p>Загрузка...</p> : null}
      {error ? <p className={styles["ui-error"]}>{error}</p> : null}

      {!loading && !error ? (
        items.length ? (
          <div className={styles["playlist-pick-list"]}>
            {items.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                className={styles["playlist-pick-item"]}
                onClick={() => { void addTrackToPlaylist(p.id); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void addTrackToPlaylist(p.id);
                  }
                }}
              >
                {p.title}
              </div>
            ))}
          </div>
        ) : (
          <p>У вас пока нет своих плейлистов</p>
        )
      ) : null}
    </Modal>
  );
}





