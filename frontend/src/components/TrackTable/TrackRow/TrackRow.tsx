import styles from './TrackRow.module.css';
import { useMemo, useState } from "react";
import type { Track } from "../../../types/track";
import { usePlayer } from "../../../context/PlayerContext";
import { UiIcon } from "../../UiIcon/UiIcon";
import { formatDuration } from "../../../utils/formatDuration";

type TrackRowProps = {
  track: Track;
  isLiked: boolean;
  isDisliked: boolean;
  onToggleLike: (track: Track) => void;
  onToggleDislike: (track: Track) => void;
  onInfo: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  showRemoveButton?: boolean;
  onRemoveTrack?: (track: Track) => void;
  showQueueButton?: boolean;
  menuIncludeQueue?: boolean;
  showDragHandle?: boolean;
  dragHandleAttributes?: Record<string, unknown>;
  dragHandleListeners?: Record<string, unknown>;
};

function openPath(path: string) {
  if (!path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function TrackRow({
  track,
  isLiked,
  isDisliked,
  onToggleLike,
  onToggleDislike,
  onInfo,
  onAddToPlaylist,
  onPlay,
  onAddToQueue,
  showRemoveButton = false,
  onRemoveTrack,
  showQueueButton = true,
  menuIncludeQueue = false,
  showDragHandle = false,
  dragHandleAttributes,
  dragHandleListeners,
}: TrackRowProps) {
  const { currentTrack, isPlaying, togglePlay } = usePlayer();
  const [menuOpen, setMenuOpen] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const isCurrent = currentTrack?.id === track.id;
  const canInteract = !isDisliked;
  const showCoverOverlay = canInteract && isCurrent;
  const coverIconName = isCurrent && isPlaying ? "pause" : "play";

  const rowClassName = useMemo(
    () => `${styles.row} ${isCurrent ? styles.isCurrent : ""} ${isDisliked ? styles.isDisliked : ""} ${menuOpen ? styles.isMenuOpen : ""}`,
    [isCurrent, isDisliked, menuOpen],
  );

  const artistIds = track.artistIds || [];
  const handleRowPlayToggle = () => {
    if (!canInteract) return;
    if (isCurrent) {
      togglePlay();
      return;
    }
    onPlay(track);
  };

  return (
    <div
      className={rowClassName}
      onMouseLeave={() => setMenuOpen(false)}
      onClick={handleRowPlayToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && canInteract) {
          e.preventDefault();
          handleRowPlayToggle();
        }
      }}
    >
      <div className={`${styles.cell} ${styles.titleCell}`}>
        <div className={styles.titleWrap}>
          <button
            type="button"
            className={styles.coverWrap}
            onClick={(e) => { e.stopPropagation(); handleRowPlayToggle(); }}
            disabled={!canInteract}
            aria-label={`Воспроизвести ${track.title}`}
          >
            {!coverFailed && track.coverUrl ? (
              <img src={track.coverUrl} alt={track.title} className={styles.trackCover} onError={() => setCoverFailed(true)} />
            ) : (
              <span className={styles.coverFallback}><UiIcon name="musicTwo" /></span>
            )}
            <span className={`${styles.coverOverlay} ${showCoverOverlay ? styles.coverOverlayVisible : ""}`}>
              <UiIcon name={coverIconName} className={styles.coverPlayIcon} />
            </span>
          </button>

          <div className={styles.meta}>
            <div className={styles.title}>{track.title}</div>
            <div className={styles.subtitle}>
              {track.artistNames.map((name, index) => {
                const artistId = artistIds[index];
                const clickable = Boolean(artistId);
                return (
                  <span key={`${name}-${index}`}>
                    <button
                      type="button"
                      className={`${styles.artistBtn} ${clickable ? styles.artistBtnClickable : ""}`}
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
      </div>

      <div className={`${styles.cell} ${styles.albumCell}`}>
        <div className={styles.albumTitleWrap}>
          <button
            type="button"
            className={`${styles.albumTitle} ${track.albumId ? styles.albumLink : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (track.albumId) openPath(`/albums/${track.albumId}`);
            }}
            disabled={!track.albumId}
          >
            {track.albumTitle}
          </button>
        </div>
        {showRemoveButton ? (
          <button
            type="button"
            className={`ui-icon-btn ${styles.iconBtn} ${styles.iconBtnRemove}`}
            onClick={(e) => {
              e.stopPropagation();
              onRemoveTrack?.(track);
            }}
            aria-label="Удалить из плейлиста"
          >
            <UiIcon name="trash" />
          </button>
        ) : null}
        <button
          type="button"
          className={`ui-icon-btn ${styles.iconBtn} ${isLiked ? styles.iconBtnActive : ""} ${isDisliked ? styles.iconBtnDanger : ""}`}
          onClick={(e) => { e.stopPropagation(); isDisliked ? onToggleDislike(track) : onToggleLike(track); }}
          aria-label={isDisliked ? "Убрать дизлайк" : isLiked ? "Убрать лайк" : "Поставить лайк"}
        >
          <UiIcon name={isDisliked ? "heartOff" : "heart"} />
        </button>
      </div>

      <div className={`${styles.cell} ${styles.timeCell}`}>
        <span className={`${styles.timeValue} ${menuOpen ? styles.timeValueHidden : ""}`}>{formatDuration(track.duration)}</span>
        {canInteract ? (
          <div className={`${styles.actions} ${menuOpen ? styles.actionsVisible : ""}`}>
            {showQueueButton ? (
              <button type="button" className={`ui-icon-btn ${styles.iconBtn}`} onClick={(e) => { e.stopPropagation(); onAddToQueue(track); }} aria-label="Добавить в очередь">
                <UiIcon name="plus" />
              </button>
            ) : null}
            <div className={styles.menuWrap}>
              <button type="button" className={`ui-icon-btn ${styles.iconBtn}`} onClick={(e) => { e.stopPropagation(); setMenuOpen((prev) => !prev); }} aria-label="Больше опций">
                <UiIcon name="menuVertical" />
              </button>
              {menuOpen ? (
                <div className={styles.menuPopover}>
                  {menuIncludeQueue ? (
                    <button type="button" className={styles.menuItem} onClick={(e) => { e.stopPropagation(); onAddToQueue(track); setMenuOpen(false); }}>
                      Добавить в очередь
                    </button>
                  ) : null}
                  <button type="button" className={styles.menuItem} onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track); setMenuOpen(false); }}>
                    Добавить в плейлист
                  </button>
                  <button type="button" className={styles.menuItem} onClick={(e) => { e.stopPropagation(); onInfo(track); setMenuOpen(false); }}>
                    Показать информацию
                  </button>
                </div>
              ) : null}
            </div>
            {showDragHandle ? (
              <button
                type="button"
                className={`ui-icon-btn ${styles.iconBtn} ${styles.dragHandle}`}
                onClick={(e) => e.stopPropagation()}
                aria-label="Перетащить трек"
                {...(dragHandleAttributes as Record<string, unknown>)}
                {...(dragHandleListeners as Record<string, unknown>)}
              >
                <UiIcon name="signEqual" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}




