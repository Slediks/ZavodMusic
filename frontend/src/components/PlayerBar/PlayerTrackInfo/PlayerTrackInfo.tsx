import styles from './PlayerTrackInfo.module.css';
import { useEffect, useState } from "react";
import { UiIcon } from "../../UiIcon/UiIcon";
import type { Track } from "../../../types/track";

type PlayerTrackInfoProps = {
  track: Track | null;
  isPlaying: boolean;
  onOpenFullscreen?: () => void;
};

export function PlayerTrackInfo({ track, isPlaying, onOpenFullscreen }: PlayerTrackInfoProps) {
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [track?.id, track?.coverUrl]);

  if (!track) {
    return <div className={styles["player-track-info"]}>Ничего не играет</div>;
  }

  const artistLabel = track.artistNames.join(", ");
  const coverWrapClassName = `player-cover-wrap ${isPlaying ? "is-playing" : ""}`;

  return (
    <div className={styles["player-track-info"]}>
      <div className={coverWrapClassName}>
        {!coverFailed && track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className={styles["player-cover"]} onError={() => setCoverFailed(true)} />
        ) : (
          <div className={styles["player-cover"] + " " + styles["player-cover-fallback"]}>
            <UiIcon name="musicTwo" />
          </div>
        )}
        {onOpenFullscreen ? (
          <button type="button" className={styles["hover-fullscreen-btn"]} onClick={onOpenFullscreen} aria-label="Полный экран">
            <UiIcon name="fullscreen" />
          </button>
        ) : null}
      </div>

      <div className={styles["player-text-meta"]}>
        <div className={styles["player-title"]} title={track.title}>{track.title}</div>
        <div className={styles["player-subtitle"]} title={artistLabel}>{artistLabel}</div>
      </div>
    </div>
  );
}





