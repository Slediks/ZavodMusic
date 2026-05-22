import styles from './TrackInfoModal.module.css';
import type { Track } from "../../types/track";
import { formatDuration } from "../../utils/formatDuration";
import { Modal } from "../Modal/Modal";
import { getTrackCoverUrl } from "../../api/trackMedia";
import {UiIcon} from "../UiIcon/UiIcon.tsx";
import {useEffect, useState} from "react";

type TrackInfoModalProps = {
  track: Track | null;
  onClose: () => void;
};

export function TrackInfoModal({ track, onClose }: TrackInfoModalProps) {
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [track?.id]);

  if (!track) return null;

  return (
    <Modal isOpen={Boolean(track)} title="Информация о треке" onClose={onClose}>
      <div className={styles["track-info-layout"]}>
        {!coverFailed && getTrackCoverUrl(track.id) ? (
          <img src={getTrackCoverUrl(track.id)} alt={""} className={styles["track-info-cover"]} onError={() => setCoverFailed(true)} />
        ) : (
          <div className={styles["track-info-cover"] + " " + styles["track-info-cover-fallback"]}>
            <UiIcon name="musicTwo" className={styles["track-info-cover-fallback-icon"]} />
          </div>
        )}

        <div className={styles["track-info-grid"]}>
          <div><b>Название:</b> {track.title}</div>
          <div><b>Исполнители:</b> {track.artistNames.join(", ") || "-"}</div>
          <div><b>Альбом:</b> {track.albumTitle || "-"}</div>
          <div><b>Длительность:</b> {formatDuration(track.duration)}</div>
          <div><b>Жанр:</b> {track.genre || "-"}</div>
          <div><b>Год:</b> {track.year || "-"}</div>
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








