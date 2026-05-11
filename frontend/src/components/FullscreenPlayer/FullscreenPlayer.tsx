import styles from './FullscreenPlayer.module.css';
import { useEffect, useMemo } from "react";
import type { Track } from "../../types/track";
import { usePlayer } from "../../context/PlayerContext";
import { UiIcon } from "../UiIcon/UiIcon";
import { ProgressBar } from "../PlayerBar/ProgressBar/ProgressBar";
import { PlayerControls } from "../PlayerBar/PlayerControls/PlayerControls";

type FullscreenPlayerProps = {
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

export function FullscreenPlayer({ likedTrackIds, dislikedTrackIds, onToggleLike, onToggleDislike }: FullscreenPlayerProps) {
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
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, closeFullscreen]);

  if (!isOpen || !currentTrack) return null;

  return (
    <section className={`${'{'}styles["fullscreen-player"]} ${showLyrics ? "has-lyrics" : "no-lyrics"}`} role="dialog" aria-modal="false">
      <button type="button" className={styles["ui-icon-btn"] + " " + styles["fullscreen-close"]} onClick={closeFullscreen} aria-label="Закрыть"><UiIcon name="close" /></button>

      <div className={styles["fullscreen-main"]}>
        <div className={styles["fullscreen-cover-wrap"]}>
          <img src={currentTrack.coverUrl} alt={currentTrack.title} className={styles["fullscreen-cover"]} />
          <div className={styles["fullscreen-cover-overlay"]} aria-hidden="true" />

          <div className={styles["fullscreen-cover-controls"]}>
            <button
              type="button"
              className={`ui-icon-btn ${'{'}styles["player-action"]} ${'{'}styles["fullscreen-control-btn"]} ${'{'}styles["fullscreen-anchor-btn"]} ${'{'}styles["fullscreen-queue-btn"]} ${isQueueOpen ? "is-active" : ""}`}
              onClick={toggleQueuePanel}
              aria-label="Очередь"
            >
              <UiIcon name="queue" />
            </button>

            <button
              type="button"
              className={`ui-icon-btn ${'{'}styles["player-action"]} ${'{'}styles["fullscreen-control-btn"]} ${'{'}styles["fullscreen-anchor-btn"]} ${'{'}styles["fullscreen-like-btn"]} ${isCurrentLiked ? "is-active" : ""}`}
              onClick={() => onToggleLike(currentTrack)}
              aria-label="Лайк"
            >
              <UiIcon name="heart" />
            </button>

            <button
              type="button"
              className={`ui-icon-btn ${'{'}styles["player-action"]} ${'{'}styles["fullscreen-control-btn"]} ${'{'}styles["fullscreen-anchor-btn"]} ${'{'}styles["fullscreen-dislike-btn"]} ${isCurrentDisliked ? "is-active is-disliked" : ""}`}
              onClick={() => {
                const willBecomeDisliked = !isCurrentDisliked;
                onToggleDislike(currentTrack);
                if (willBecomeDisliked) removeTrackAndSkip(currentTrack.id);
              }}
              aria-label="Дизлайк"
            >
              <UiIcon name="heartOff" />
            </button>

            {hasLyrics ? (
              <button
                type="button"
                className={`ui-icon-btn ${'{'}styles["player-action"]} ${'{'}styles["fullscreen-control-btn"]} ${'{'}styles["fullscreen-anchor-btn"]} ${'{'}styles["fullscreen-text-btn"]} ${showLyrics ? "is-active" : ""}`}
                onClick={() => {
                  if (showLyrics) openFullscreen();
                  else openLyrics();
                }}
                aria-label="Текст"
              >
                <UiIcon name="text" />
              </button>
            ) : null}

            <div className={styles["fullscreen-center-controls"]}>
              <button
                type="button"
                className={`ui-icon-btn ${'{'}styles["player-action"]} ${'{'}styles["fullscreen-control-btn"]} ${isShuffled ? "is-active" : ""}`}
                onClick={toggleShuffle}
                aria-label={isShuffled ? "Перемешивание включено" : "Перемешать"}
              >
                <UiIcon name="shuffle" />
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
                className={`ui-icon-btn ${'{'}styles["player-action"]} ${'{'}styles["fullscreen-control-btn"]} ${repeatMode !== "off" ? "is-active" : ""}`}
                onClick={() => setRepeatMode(nextRepeat(repeatMode as RepeatMode))}
                aria-label="Режим повтора"
              >
                <UiIcon name={repeatMode === "one" ? "repeatOne" : "repeat"} />
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





