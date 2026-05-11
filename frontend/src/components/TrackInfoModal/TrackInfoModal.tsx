import styles from './TrackInfoModal.module.css';
import type { Track } from "../../types/track";
import { formatDuration } from "../../utils/formatDuration";
import { Modal } from "../Modal/Modal";

type TrackInfoModalProps = {
  track: Track | null;
  onClose: () => void;
};

export function TrackInfoModal({ track, onClose }: TrackInfoModalProps) {
  if (!track) return null;

  return (
    <Modal isOpen={Boolean(track)} title="Информация о треке" onClose={onClose}>
      <div className={styles["track-info-layout"]}>
        <img className={styles["track-info-cover"]} src={track.coverUrl} alt={`Обложка: ${track.title}`} />

        <div className={styles["track-info-grid"]}>
          <div><b>Название:</b> {track.title}</div>
          <div><b>Исполнители:</b> {track.artistNames.join(", ") || "-"}</div>
          <div><b>Альбом:</b> {track.albumTitle || "-"}</div>
          <div><b>Длительность:</b> {formatDuration(track.duration)}</div>
          <div><b>Жанр:</b> {track.genre || "-"}</div>
          <div><b>Год:</b> {track.year || "-"}</div>
          <div><b>Cover URL:</b> {track.coverUrl || "-"}</div>
          <div><b>Audio URL:</b> {track.audioUrl || "-"}</div>
          {track.lyrics ? (
            <div>
              <b>Текст:</b>
              <div className={styles["track-info-lyrics"]}>{track.lyrics}</div>
            </div>
          ) : (
            <div><b>Текст:</b> -</div>
          )}
        </div>
      </div>
    </Modal>
  );
}





