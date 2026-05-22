import styles from "./PlayerTrackInfo.module.css";
import { useEffect, useState } from "react";
import { UiIcon } from "../../UiIcon/UiIcon";
import type { Track } from "../../../types/track";
import { getTrackCoverUrl } from "../../../api/trackMedia";

type PlayerTrackInfoProps = {
  track: Track | null;
  isPlaying: boolean;
  onOpenFullscreen?: () => void;
};

function openPath(path: string) {
  if (!path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function PlayerTrackInfo({ track, isPlaying, onOpenFullscreen }: PlayerTrackInfoProps) {
  const [coverFailed, setCoverFailed] = useState(false);

  useEffect(() => {
    setCoverFailed(false);
  }, [track?.id]);

  if (!track) {
    return <div className={styles["player-track-info"]}>Ничего не играет</div>;
  }

  const artistIds = track.artistIds || [];
  const artistLabel = track.artistNames.join(", ");
  const coverWrapClassName = [styles["player-cover-wrap"], isPlaying ? styles["is-playing"] : ""].filter(Boolean).join(" ");

  return (
    <div className={styles["player-track-info"]}>
      <div className={coverWrapClassName}>
        {!coverFailed && getTrackCoverUrl(track.id) ? (
          <img src={getTrackCoverUrl(track.id)} alt={""} className={styles["player-cover"]} onError={() => setCoverFailed(true)} />
        ) : (
          <div className={styles["player-cover"] + " " + styles["player-cover-fallback"]}>
            <UiIcon name="musicTwo" className={styles["player-cover-fallback-icon"]} />
          </div>
        )}
        {onOpenFullscreen ? (
          <button type="button" className={styles["hover-fullscreen-btn"]} onClick={onOpenFullscreen} aria-label="Полный экран">
            <UiIcon name="fullscreen" className={styles["hover-fullscreen-icon"]} />
          </button>
        ) : null}
      </div>

      <div className={styles["player-text-meta"]}>
        <div className={styles["player-title"]} title={track.title}>{track.title}</div>
        <div className={styles["player-subtitle"]} title={artistLabel}>
          {track.artistNames.map((name, index) => {
            const artistId = artistIds[index];
            const clickable = Boolean(artistId);
            return (
              <span key={`${name}-${index}`}>
                    <button
                      type="button"
                      className={`${styles["artist-btn"]} ${clickable ? styles["artist-btn-clickable"] : ""}`}
                      disabled={!clickable}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (artistId) openPath(`/artists/${artistId}`);
                      }}
                    >
                      {name}
                    </button>
                {index < track.artistNames.length - 1 ? <span>, </span> : null}
                  </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}



