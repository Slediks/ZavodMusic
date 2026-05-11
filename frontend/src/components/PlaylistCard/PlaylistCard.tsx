import styles from './PlaylistCard.module.css';
import { UiIcon } from "../UiIcon/UiIcon";
import type { Playlist } from "../../types/playlist";
import { formatDuration } from "../../utils/formatDuration";

type PlaylistCardProps = {
  playlist: Playlist;
  canManage: boolean;
  isLiked: boolean;
  canLike?: boolean;
  canToggleVisibility?: boolean;
  onOpen: (id: string) => void;
  onPlay: (playlist: Playlist) => void;
  onLike: (playlist: Playlist) => void;
  onToggleVisibility?: (playlist: Playlist) => void;
  onEdit?: (playlist: Playlist) => void;
  onDelete?: (playlist: Playlist) => void;
  onCopyLink: (playlist: Playlist) => void;
};

export function PlaylistCard({ playlist, canManage, isLiked, canLike = true, canToggleVisibility = false, onOpen, onPlay, onLike, onToggleVisibility, onCopyLink }: PlaylistCardProps) {
  return (
    <article
      className={styles["playlist-card"]}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(playlist.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(playlist.id);
        }
      }}
    >
      <div className={styles["playlist-cover-wrap"]}>
        {playlist.coverUrl ? (
          <img src={playlist.coverUrl} alt={playlist.title} className={styles["playlist-cover"]} />
        ) : (
          <div className={styles["playlist-cover"] + " " + styles.placeholder}><UiIcon name="folderMusic" /></div>
        )}

        <div className={styles["playlist-cover-overlay"]}>
          <button
            type="button"
            className={styles["playlist-cover-play"]}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(playlist);
            }}
            aria-label={`Играть плейлист ${playlist.title}`}
          >
            <UiIcon name="play" />
          </button>

          {!canManage && canLike ? (
            <button
              type="button"
              className={`${styles["playlist-cover-like"]}${isLiked ? ` ${styles["is-liked"]}` : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onLike(playlist);
              }}
              aria-label={isLiked ? "Убрать лайк" : "Поставить лайк"}
            >
              <UiIcon name="heart" />
            </button>
          ) : null}

          {canToggleVisibility ? (
            <button
              type="button"
              className={styles["playlist-cover-privacy"]}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility?.(playlist);
              }}
              aria-label={playlist.isPublic ? "Сделать приватным" : "Сделать публичным"}
              title={playlist.isPublic ? "Публичный плейлист" : "Приватный плейлист"}
            >
              <UiIcon name={playlist.isPublic ? "lockOff" : "lock"} />
            </button>
          ) : null}

          <button
            type="button"
            className={styles["playlist-cover-link"]}
            onClick={(e) => {
              e.stopPropagation();
              onCopyLink(playlist);
            }}
            aria-label="Копировать ссылку"
          >
            <UiIcon name="link" />
          </button>
        </div>
      </div>

      <div className={styles["playlist-body"]}>
        <div className={styles["playlist-title"]}>{playlist.title}</div>
        <p className={styles["playlist-desc"]}>{playlist.description || "Без описания"}</p>
        <div className={styles["playlist-meta"]}>
          <span>{playlist.tracksCount} треков</span>
          <span>{formatDuration(playlist.duration)}</span>
        </div>
      </div>
    </article>
  );
}





