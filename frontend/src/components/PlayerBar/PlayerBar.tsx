import styles from "./PlayerBar.module.css";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "../../context/ToastContext";
import { usePlayer } from "../../context/PlayerContext";
import type { RepeatMode } from "../../types/player";
import type { Track } from "../../types/track";
import { AddToPlaylistModal } from "../AddToPlaylistModal/AddToPlaylistModal";
import { UiIcon } from "../UiIcon/UiIcon";
import { PlayerControls } from "./PlayerControls/PlayerControls";
import { PlayerTrackInfo } from "./PlayerTrackInfo/PlayerTrackInfo";
import { ProgressBar } from "./ProgressBar/ProgressBar";
import { VolumeControl } from "./VolumeControl/VolumeControl";

type PlayerBarProps = {
  isAuthorized: boolean;
  likedTrackIds: string[];
  dislikedTrackIds: string[];
  onToggleLike: (track: Track) => void;
  onToggleDislike: (track: Track) => void;
};

const nextRepeat = (mode: RepeatMode): RepeatMode => {
  if (mode === "off") return "queue";
  if (mode === "queue") return "one";
  return "off";
};

export function PlayerBar({ isAuthorized, likedTrackIds, dislikedTrackIds, onToggleLike, onToggleDislike }: PlayerBarProps) {
  const { showToast } = useToast();
  const {
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffled,
    repeatMode,
    togglePlay,
    next,
    previous,
    seekTo,
    setVolumeLevel,
    toggleMute,
    toggleShuffle,
    setRepeatMode,
    removeTrackAndSkip,
    isQueueOpen,
    toggleQueuePanel,
    openFullscreen,
    openLyrics
  } = usePlayer();

  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = useState(false);

  const hasCurrentTrack = Boolean(currentTrack);
  const hasLyrics = Boolean(currentTrack?.lyrics);
  const isPreviousDisabled = queueIndex <= 0;
  const isNextDisabled = queueIndex < 0 || (queueIndex >= queue.length - 1 && repeatMode !== "queue");
  const currentTrackId = currentTrack?.id ?? null;
  const currentTrackTitle = currentTrack?.title ?? "";

  const isCurrentLiked = useMemo(
    () => (currentTrackId ? likedTrackIds.includes(currentTrackId) : false),
    [currentTrackId, likedTrackIds]
  );

  const isCurrentDisliked = useMemo(
    () => (currentTrackId ? dislikedTrackIds.includes(currentTrackId) : false),
    [currentTrackId, dislikedTrackIds]
  );

  const handleToggleLike = useCallback(() => {
    if (!currentTrack) return;
    onToggleLike(currentTrack);
  }, [currentTrack, onToggleLike]);

  const handleToggleDislike = useCallback(() => {
    if (!currentTrack) return;
    const willBecomeDisliked = !isCurrentDisliked;
    onToggleDislike(currentTrack);
    if (willBecomeDisliked) {
      removeTrackAndSkip(currentTrack.id);
    }
  }, [currentTrack, isCurrentDisliked, onToggleDislike, removeTrackAndSkip]);

  const handleOpenLyrics = useCallback(() => {
    if (!currentTrack?.lyrics) {
      showToast("Текст не завезли", "info");
      return;
    }
    openLyrics();
  }, [currentTrack, openLyrics, showToast]);

  const handleToggleRepeat = useCallback(() => {
    setRepeatMode(nextRepeat(repeatMode));
  }, [repeatMode, setRepeatMode]);

  return (
    <div className={styles["player-bar"]}>
      <ProgressBar currentTime={currentTime} duration={duration} onSeek={seekTo} />

      <div className={styles["player-main-row"]}>
        <div className={styles["player-left"]}>
          <PlayerTrackInfo
            track={currentTrack}
            isPlaying={isPlaying}
            onOpenFullscreen={hasCurrentTrack ? openFullscreen : undefined}
          />
        </div>

        <div className={styles["player-center"]}>
          {(hasCurrentTrack && isAuthorized) ? (
            <button
              type="button"
              className={[styles["player-action"], isCurrentLiked ? styles["is-active"] : ""].filter(Boolean).join(" ")}
              onClick={handleToggleLike}
              aria-label="Лайк"
            >
              <UiIcon name="heart" className={styles["player-action-icon"]} />
            </button>
          ) : null}

          <button
            type="button"
            className={[styles["player-action"], isShuffled ? styles["is-active"] : ""].filter(Boolean).join(" ")}
            onClick={toggleShuffle}
            aria-label={isShuffled ? "Перемешивание включено" : "Перемешать"}
          >
            <UiIcon name="shuffle" className={styles["player-action-icon"]} />
          </button>

          <PlayerControls
            isPlaying={isPlaying}
            isPreviousDisabled={isPreviousDisabled}
            isNextDisabled={isNextDisabled}
            onTogglePlay={togglePlay}
            onNext={next}
            onPrevious={previous}
          />

          <button
            type="button"
            className={[styles["player-action"], repeatMode !== "off" ? styles["is-active"] : ""].filter(Boolean).join(" ")}
            onClick={handleToggleRepeat}
            aria-label="Режим повтора"
          >
            <UiIcon name={repeatMode === "one" ? "repeatOne" : "repeat"} className={styles["player-action-icon"]} />
          </button>

          {(hasCurrentTrack && isAuthorized) ? (
            <button
              type="button"
              className={[styles["player-action"], isCurrentDisliked ? styles["is-disliked"] : "", isCurrentDisliked ? styles["is-active"] : ""].filter(Boolean).join(" ")}
              onClick={handleToggleDislike}
              aria-label="Дизлайк"
            >
              <UiIcon name="heartOff" className={styles["player-action-icon"]} />
            </button>
          ) : null}
        </div>

        <div className={styles["player-right"]}>
          {isAuthorized ? (
            <button
              type="button"
              className={styles["player-action"]}
              onClick={() => setIsAddToPlaylistOpen(true)}
              aria-label="Добавить в плейлист"
              disabled={!hasCurrentTrack}
            >
              <UiIcon name="folderMusic" className={styles["player-action-icon"]} />
            </button>
          ) : null}

          <button
            type="button"
            className={[styles["player-action"], hasLyrics ? "" : styles["is-soft-disabled"]].filter(Boolean).join(" ")}
            onClick={handleOpenLyrics}
            aria-label="Текст"
          >
            <UiIcon name="text" className={styles["player-action-icon"]} />
          </button>

          <button
            type="button"
            className={[styles["player-action"], isQueueOpen ? styles["is-active"] : ""].filter(Boolean).join(" ")}
            onClick={toggleQueuePanel}
            aria-label="Очередь"
          >
            <UiIcon name="queue" className={styles["player-action-icon"]} />
          </button>

          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onSetVolume={setVolumeLevel}
            onToggleMute={toggleMute}
          />
        </div>
      </div>

      <AddToPlaylistModal
        isOpen={isAddToPlaylistOpen}
        trackId={currentTrackId}
        trackTitle={currentTrackTitle}
        onClose={() => setIsAddToPlaylistOpen(false)}
      />
    </div>
  );
}


