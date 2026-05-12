import styles from "./ArtistCard.module.css";
import { UiIcon } from "../UiIcon/UiIcon";
import type { Artist } from "../../types/artist";
import { formatDuration } from "../../utils/formatDuration";
import { getArtistCoverUrl } from "../../api/entityMedia";

type ArtistCardProps = {
  artist: Artist;
  onOpen: (id: string) => void;
  onPlay: (id: string) => void;
};

export function ArtistCard({ artist, onOpen, onPlay }: ArtistCardProps) {
  const artistLink = `${window.location.origin}/artists/${artist.id}`;
  const copyArtistLink = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(artistLink);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = artistLink;
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
      className={styles["artist-card"]}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(artist.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(artist.id);
        }
      }}
    >
      <div className={styles["artist-cover-wrap"]}>
        {artist.coverExists ? (
          <img src={getArtistCoverUrl(artist.id)} alt={artist.name} className={styles["artist-cover"]} />
        ) : (
          <div className={styles["artist-cover"] + " " + styles["artist-cover-fallback"]}><UiIcon name="musicArtist" className={styles["artist-cover-fallback-icon"]} /></div>
        )}

        <div className={styles["artist-cover-overlay"]}>
          <button type="button" className={styles["artist-cover-play"]} onClick={(e) => { e.stopPropagation(); onPlay(artist.id); }} aria-label={`Играть исполнителя ${artist.name}`}>
            <UiIcon name="play" className={styles["artist-cover-play-icon"]} />
          </button>

          <button
            type="button"
            className={styles["artist-cover-link"]}
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await copyArtistLink();
              } catch {
                // no-op
              }
            }}
            aria-label={`Копировать ссылку на ${artist.name}`}
          >
            <UiIcon name="link" className={styles["artist-cover-link-icon"]} />
          </button>
        </div>
      </div>

      <div className={styles["artist-info-wrap"]}>
        <div className={styles["artist-title"]}>{artist.name}</div>

        <div className={styles["artist-meta"]}>
          <span>{artist.tracksCount} треков</span>
          <span>{formatDuration(artist.duration)}</span>
        </div>
      </div>
    </article>
  );
}



