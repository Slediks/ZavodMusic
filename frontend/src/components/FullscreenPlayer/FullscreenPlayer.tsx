import styles from './FullscreenPlayer.module.css';
import {useEffect, useMemo, useState} from "react";
import type { Track } from "../../types/track";
import { usePlayer } from "../../context/PlayerContext";
import { UiIcon } from "../UiIcon/UiIcon";
import { ProgressBar } from "../PlayerBar/ProgressBar/ProgressBar";
import { PlayerControls } from "../PlayerBar/PlayerControls/PlayerControls";
import { getTrackCoverUrl } from "../../api/trackMedia";

type FullscreenPlayerProps = {
  isAuthorized: boolean;
  likedTrackIds: string[];
  dislikedTrackIds: string[];
  onToggleLike: (track: Track) => void;
  onToggleDislike: (track: Track) => void;
};

type RepeatMode = "off" | "queue" | "one";

const nextRepeat = (mode: RepeatMode): RepeatMode => {
  if (mode === "off") return "queue";
  if (mode === "queue") return "one";
  return "off";
};

export function FullscreenPlayer({ isAuthorized, likedTrackIds, dislikedTrackIds, onToggleLike, onToggleDislike }: FullscreenPlayerProps) {
  const {
    fullscreenMode,
    closeFullscreen,
    openFullscreen,
    openLyrics,
    currentTrack,
    currentTime,
    duration,
    seekTo,
    isPlaying,
    queue,
    queueIndex,
    isShuffled,
    repeatMode,
    togglePlay,
    toggleShuffle,
    setRepeatMode,
    previous,
    next,
    toggleQueuePanel,
    isQueueOpen,
    removeTrackAndSkip,
  } = usePlayer();

  const [coverFailed, setCoverFailed] = useState(false);

  const isOpen = fullscreenMode !== "closed";
  const showLyrics = fullscreenMode === "lyrics";
  const hasLyrics = Boolean(currentTrack?.lyrics);
  const currentTrackId = currentTrack?.id ?? null;
  const isPreviousDisabled = queueIndex <= 0;
  const isNextDisabled = queueIndex < 0 || (queueIndex >= queue.length - 1 && repeatMode !== "queue");

  const isCurrentLiked = useMemo(
    () => (currentTrackId ? likedTrackIds.includes(currentTrackId) : false),
    [currentTrackId, likedTrackIds]
  );

  const isCurrentDisliked = useMemo(
    () => (currentTrackId ? dislikedTrackIds.includes(currentTrackId) : false),
    [currentTrackId, dislikedTrackIds]
  );

  useEffect(() => {
    setCoverFailed(false);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeFullscreen]);

  if (!isOpen || !currentTrack) return null;

  return (
    <section className={[styles["fullscreen-player"], showLyrics ? styles["has-lyrics"] : styles["no-lyrics"]].join(" ")} role="dialog" aria-modal="false">
      <button type="button" className={styles["fullscreen-close"]} onClick={closeFullscreen} aria-label="Закрыть"><UiIcon name="close" /></button>

      <div className={styles["fullscreen-main"]}>
        <div className={styles["fullscreen-cover-wrap"]}>
          {!coverFailed && getTrackCoverUrl(currentTrack.id) ? (
            <img src={getTrackCoverUrl(currentTrack.id)} alt={""} className={styles["fullscreen-cover"]} onError={() => setCoverFailed(true)} />
          ) : (
            <div className={styles["fullscreen-cover"] + " " + styles["fullscreen-cover-fallback"]}>
              <UiIcon name="musicTwo" className={styles["fullscreen-cover-fallback-icon"]} />
            </div>
          )}
          <div className={styles["fullscreen-cover-overlay"]} aria-hidden="true" />

          <div className={styles["fullscreen-cover-controls"]}>
            <button
              type="button"
              className={[styles["fullscreen-control-btn"], styles["fullscreen-anchor-btn"], styles["fullscreen-queue-btn"], isQueueOpen ? styles["is-active"] : ""].filter(Boolean).join(" ")}
              onClick={toggleQueuePanel}
              aria-label="Очередь"
            >
              <UiIcon name="queue" className={styles["fullscreen-control-icon"]} />
            </button>

            {isAuthorized ? (
              <button
                type="button"
                className={[styles["fullscreen-control-btn"], styles["fullscreen-anchor-btn"], styles["fullscreen-like-btn"], isCurrentLiked ? styles["is-active"] : ""].filter(Boolean).join(" ")}
                onClick={() => onToggleLike(currentTrack)}
                aria-label="Лайк"
              >
                <UiIcon name="heart" className={styles["fullscreen-control-icon"]} />
              </button>
            ) : null}

            {isAuthorized ? (
              <button
                type="button"
                className={[styles["fullscreen-control-btn"], styles["fullscreen-anchor-btn"], styles["fullscreen-dislike-btn"], isCurrentDisliked ? styles["is-active"] : "", isCurrentDisliked ? styles["is-disliked"] : ""].filter(Boolean).join(" ")}
                onClick={() => {
                  const willBecomeDisliked = !isCurrentDisliked;
                  onToggleDislike(currentTrack);
                  if (willBecomeDisliked) removeTrackAndSkip(currentTrack.id);
                }}
                aria-label="Дизлайк"
              >
                <UiIcon name="heartOff" className={styles["fullscreen-control-icon"]} />
              </button>
            ) : null}

            {hasLyrics ? (
              <button
                type="button"
                className={[styles["fullscreen-control-btn"], styles["fullscreen-anchor-btn"], styles["fullscreen-text-btn"], showLyrics ? styles["is-active"] : ""].filter(Boolean).join(" ")}
                onClick={() => {
                  if (showLyrics) openFullscreen();
                  else openLyrics();
                }}
                aria-label="Текст"
              >
                <UiIcon name="text" className={styles["fullscreen-control-icon"]} />
              </button>
            ) : null}

            <div className={styles["fullscreen-center-controls"]}>
              <button
                type="button"
                className={[styles["fullscreen-control-btn"], isShuffled ? styles["is-active"] : ""].filter(Boolean).join(" ")}
                onClick={toggleShuffle}
                aria-label={isShuffled ? "Перемешивание включено" : "Перемешать"}
              >
                <UiIcon name="shuffle" className={styles["fullscreen-control-icon"]} />
              </button>

              <div className={styles["fullscreen-transport-group"]}>
                <PlayerControls
                  isPlaying={isPlaying}
                  isPreviousDisabled={isPreviousDisabled}
                  isNextDisabled={isNextDisabled}
                  onTogglePlay={togglePlay}
                  onNext={next}
                  onPrevious={previous}
                />
              </div>

              <button
                type="button"
                className={[styles["fullscreen-control-btn"], repeatMode !== "off" ? styles["is-active"] : ""].filter(Boolean).join(" ")}
                onClick={() => setRepeatMode(nextRepeat(repeatMode as RepeatMode))}
                aria-label="Режим повтора"
              >
                <UiIcon name={repeatMode === "one" ? "repeatOne" : "repeat"} className={styles["fullscreen-control-icon"]} />
              </button>
            </div>
          </div>
        </div>

        <div className={styles["fullscreen-track-meta"]}>
          <h2>{currentTrack.title}</h2>
          <p className={styles["fullscreen-artist"]}>{currentTrack.artistNames.join(", ")}</p>
        </div>

        <div className={styles["fullscreen-progress-wrap"]}>
          <ProgressBar currentTime={currentTime} duration={duration} onSeek={seekTo} />
        </div>
      </div>

      {showLyrics ? (
        <aside className={styles["lyrics-pane"]}>
          <h3>Текст</h3>
          <pre>{currentTrack.lyrics || "Текст не завезли"}</pre>
        </aside>
      ) : null}
    </section>
  );
}








