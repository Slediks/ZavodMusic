import styles from "./AlbumCard.module.css";
import { UiIcon } from "../UiIcon/UiIcon";
import type { Album } from "../../types/album";
import { formatDuration } from "../../utils/formatDuration";
import { getAlbumCoverUrl } from "../../api/entityMedia";

type AlbumCardProps = {
  album: Album;
  onOpen: (id: string) => void;
  onPlay: (id: string) => void;
};

export function AlbumCard({ album, onOpen, onPlay }: AlbumCardProps) {
  const albumLink = `${window.location.origin}/albums/${album.id}`;
  const copyAlbumLink = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(albumLink);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = albumLink;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  };

  return (
    <article
      className={styles["album-card"]}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(album.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(album.id);
        }
      }}
    >
      <div className={styles["album-cover-wrap"]}>
        {album.coverExists ? (
          <img src={getAlbumCoverUrl(album.id)} alt={album.title} className={styles["album-cover"]} />
        ) : (
          <div className={styles["album-cover"] + " " + styles["album-cover-fallback"]}><UiIcon name="musicAlbum" className={styles["album-cover-fallback-icon"]} /></div>
        )}

        <div className={styles["album-cover-overlay"]}>
          <button
            type="button"
            className={styles["album-cover-play"]}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(album.id);
            }}
            aria-label={`Играть альбом ${album.title}`}
          >
            <UiIcon name="play" className={styles["album-cover-play-icon"]} />
          </button>

          <button
            type="button"
            className={styles["album-cover-link"]}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await copyAlbumLink();
              } catch {
                // no-op
              }
            }}
            aria-label={`Копировать ссылку на ${album.title}`}
          >
            <UiIcon name="link" className={styles["album-cover-link-icon"]} />
          </button>
        </div>
      </div>

      <div className={styles["album-info-wrap"]}>
        <div className={styles["album-title"]}>{album.title}</div>
        <p className={styles["album-subtitle"]}>{album.artistNames.join(", ")}</p>
      </div>

      <div className={styles["album-meta"]}>
        <span>{album.tracksCount} треков</span>
        <span>{formatDuration(album.duration)}</span>
      </div>
    </article>
  );
}



