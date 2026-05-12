import styles from './ArtistPage.module.css';
import { useEffect, useRef, useState } from "react";
import { artistsApi } from "../../api/artistsApi";
import { AlbumCard } from "../../components/AlbumCard/AlbumCard";
import { AddToPlaylistModal } from "../../components/AddToPlaylistModal/AddToPlaylistModal";
import { ErrorBlock } from "../../components/ErrorBlock/ErrorBlock";
import { TrackTable } from "../../components/TrackTable/TrackTable";
import { TrackInfoModal } from "../../components/TrackInfoModal/TrackInfoModal";
import { UiIcon } from "../../components/UiIcon/UiIcon";
import { usePlayer } from "../../context/PlayerContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { Artist } from "../../types/artist";
import type { Album } from "../../types/album";
import type { Track } from "../../types/track";
import { ApiError } from "../../types/api";
import { formatDuration } from "../../utils/formatDuration";
import { getArtistCoverUrl } from "../../api/entityMedia";

export function ArtistPage({ artistId, onOpenAlbum, onToggleLike, onToggleDislike }: { artistId: string; onOpenAlbum: (id: string) => void; onToggleLike: (track: Track) => void; onToggleDislike: (track: Track) => void }) {
  const { user } = useAuth();
  const { playTrack, addToQueue, hydrateTracks } = usePlayer();
  const { showToast } = useToast();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [error, setError] = useState("");
  const [infoTrack, setInfoTrack] = useState<Track | null>(null);
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);
  const albumsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const run = async () => {
      setError("");
      try {
        const [artistRes, tracksRes, albumsRes] = await Promise.all([
          artistsApi.getById(artistId),
          artistsApi.getTracks(artistId, { page: 1, limit: 100 }),
          artistsApi.getAlbums(artistId, { page: 1, limit: 100 }),
        ]);
        setArtist(artistRes);
        setTracks(tracksRes.items || []);
        hydrateTracks(tracksRes.items || []);
        setAlbums(albumsRes.items || []);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Ничего не нашли, но мы старались");
      }
    };
    if (artistId) void run();
  }, [artistId]);

  const disliked = user?.dislikedTrackIds || [];
  const liked = user?.likedTrackIds || [];

  if (error) return <section className={styles.page}><ErrorBlock message="Ничего не нашли, но мы старались" /></section>;
  if (!artist) return <section className={styles.page}><p>Загрузка...</p></section>;

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.coverWrap}>
          {artist.coverExists ? (
            <img src={getArtistCoverUrl(artist.id)} alt={artist.name} className={styles.cover} />
          ) : (
            <div className={`${styles.cover} ${styles.coverFallback}`}>
              <UiIcon name="musicArtist" />
            </div>
          )}
        </div>

        <div className={styles.heroContent}>
          <p className={styles.kicker}>Исполнитель</p>
          <h1>{artist.name}</h1>
          <div className={styles.meta}>
            <span className={styles.metaItem}>{tracks.length} треков</span>
            <span className={styles.metaItem}>{albums.length} альбомов</span>
            <span className={styles.metaItem}>{formatDuration(artist.duration)}</span>
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

        <div className={styles.albumsRegion}>
          <h2 className={styles.sectionTitle}>Альбомы</h2>
          <div
            ref={albumsScrollRef}
            className={styles.albumsScroll}
            onWheel={(e) => {
              const el = albumsScrollRef.current;
              if (!el || e.deltaY === 0) return;
              if (el.scrollWidth <= el.clientWidth) return;
              el.scrollLeft += e.deltaY;
              e.preventDefault();
            }}
          >
            <div className={styles.albumsGrid}>
              {albums.map((album) => (
                <div key={album.id} className={styles.albumsItem}>
                  <AlbumCard
                    album={album}
                    onOpen={onOpenAlbum}
                    onPlay={() => {
                      const albumTracks = tracks.filter((track) => track.albumId === album.id);
                      const playable = albumTracks.filter((track) => !disliked.includes(track.id));
                      if (!playable.length) {
                        showToast("Нет доступных треков для старта", "error");
                        return;
                      }
                      playTrack(playable[0], playable);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
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







