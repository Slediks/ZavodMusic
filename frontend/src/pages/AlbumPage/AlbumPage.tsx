import styles from './AlbumPage.module.css';
import { useEffect, useState } from "react";
import { albumsApi } from "../../api/albumsApi";
import { AddToPlaylistModal } from "../../components/AddToPlaylistModal/AddToPlaylistModal";
import { ErrorBlock } from "../../components/ErrorBlock/ErrorBlock";
import { TrackInfoModal } from "../../components/TrackInfoModal/TrackInfoModal";
import { TrackTable } from "../../components/TrackTable/TrackTable";
import { UiIcon } from "../../components/UiIcon/UiIcon";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { Album } from "../../types/album";
import type { Track } from "../../types/track";
import { ApiError } from "../../types/api";
import { formatDuration } from "../../utils/formatDuration";

export function AlbumPage({ albumId, onToggleLike, onToggleDislike }: { albumId: string; onToggleLike: (track: Track) => void; onToggleDislike: (track: Track) => void }) {
  const { user } = useAuth();
  const { playTrack, addToQueue, hydrateTracks } = usePlayer();
  const { showToast } = useToast();
  const [album, setAlbum] = useState<Album | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState("");
  const [infoTrack, setInfoTrack] = useState<Track | null>(null);
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);

  useEffect(() => {
    const run = async () => {
      setError("");
      try {
        const [albumRes, tracksRes] = await Promise.all([
          albumsApi.getById(albumId),
          albumsApi.getTracks(albumId, { page: 1, limit: 100 }),
        ]);
        setAlbum(albumRes);
        setTracks(tracksRes.items || []);
        hydrateTracks(tracksRes.items || []);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Ничего не нашли, но мы старались");
      }
    };
    if (albumId) void run();
  }, [albumId]);

  const disliked = user?.dislikedTrackIds || [];
  const liked = user?.likedTrackIds || [];

  if (error) return <section className={styles.page}><ErrorBlock message="Ничего не нашли, но мы старались" /></section>;
  if (!album) return <section className={styles.page}><p>Загрузка...</p></section>;

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.coverWrap}>
          {album.coverUrl ? (
            <img src={album.coverUrl} alt={album.title} className={styles.cover} />
          ) : (
            <div className={`${styles.cover} ${styles.coverFallback}`}>
              <UiIcon name="musicAlbum" />
            </div>
          )}
        </div>

        <div className={styles.heroContent}>
          <p className={styles.kicker}>Альбом</p>
          <h1>{album.title}</h1>
          <p className={styles.artists}>{album.artistNames.join(", ")}</p>
          <div className={styles.meta}>
            <span className={styles.metaItem}>{tracks.length} треков</span>
            <span className={styles.metaItem}>{formatDuration(album.duration)}</span>
          </div>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.tracksRegion}>
          <TrackTable
            tracks={tracks}
            loading={false}
            showHeader={false}
            sortBy="title"
            sortDirection="asc"
            dislikedTrackIds={disliked}
            likedTrackIds={liked}
            onSort={() => undefined}
            onToggleLike={onToggleLike}
            onToggleDislike={onToggleDislike}
            onInfo={setInfoTrack}
            onAddToPlaylist={setPlaylistTrack}
            onPlay={(track) => {
              if (disliked.includes(track.id)) {
                showToast("Дизлайкнутый трек нельзя воспроизвести", "error");
                return;
              }
              const playable = tracks.filter((t) => !disliked.includes(t.id));
              playTrack(track, playable);
            }}
            onAddToQueue={(track) => {
              if (disliked.includes(track.id)) {
                showToast("Дизлайкнутый трек нельзя добавить в очередь", "error");
                return;
              }
              addToQueue(track);
              showToast("Трек добавлен в очередь", "info");
            }}
          />
        </div>
      </div>

      <TrackInfoModal track={infoTrack} onClose={() => setInfoTrack(null)} />
      <AddToPlaylistModal
        isOpen={Boolean(playlistTrack)}
        trackId={playlistTrack?.id || null}
        trackTitle={playlistTrack?.title || ""}
        onClose={() => setPlaylistTrack(null)}
      />
    </section>
  );
}




