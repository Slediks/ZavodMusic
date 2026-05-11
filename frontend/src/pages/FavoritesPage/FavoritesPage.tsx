import styles from './FavoritesPage.module.css';
import { useEffect, useState } from "react";
import { tracksApi } from "../../api/tracksApi";
import { AddToPlaylistModal } from "../../components/AddToPlaylistModal/AddToPlaylistModal";
import { ErrorBlock } from "../../components/ErrorBlock/ErrorBlock";
import { Pagination } from "../../components/Pagination/Pagination";
import { TrackInfoModal } from "../../components/TrackInfoModal/TrackInfoModal";
import { TrackTable } from "../../components/TrackTable/TrackTable";
import { SearchToolbar } from "../../components/SearchToolbar/SearchToolbar";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import { useToast } from "../../context/ToastContext";
import { useDebounce } from "../../hooks/useDebounce";
import { usePagination } from "../../hooks/usePagination";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { ApiError } from "../../types/api";
import type { Track } from "../../types/track";
import { getRandomSearchPhrase } from "../../utils/searchPhrases";

type FavoritesPageProps = {
  onTracksHydrated: (tracks: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onToggleDislike: (track: Track) => void;
};

export function FavoritesPage({ onTracksHydrated, onToggleLike, onToggleDislike }: FavoritesPageProps) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { playTrack, addToQueue } = usePlayer();

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [search, setSearch] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useLocalStorage<number>("zavod_favorites_limit", 20);
  const [infoTrack, setInfoTrack] = useState<Track | null>(null);
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);
  const [searchPhrase] = useState(getRandomSearchPhrase);
  const normalizedSearchPhrase = searchPhrase.replace(/^чем\s+/i, "");

  const dislikedTrackIds = user?.dislikedTrackIds || [];
  const likedTrackIds = user?.likedTrackIds || [];

  useEffect(() => {
    setSearch(debouncedSearch);
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await tracksApi.getFavorites({ search, page, limit });
        setTracks(response.items);
        onTracksHydrated(response.items);
        setTotal(response.total);
      } catch (e) {
        console.error(e);
        const message = e instanceof ApiError ? e.message : "Что-то пошло не так, попробуйте обновить страницу";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [search, page, limit, onTracksHydrated]);

  const { pages } = usePagination({ total, page, limit });

  return (
    <section className={`page-stub ${styles.tracksPage}`}>
      <h1 className={styles.title}>Избранные треки</h1>

      <SearchToolbar
        hint={`Наш поиск работает быстрее, чем ${normalizedSearchPhrase}`}
        value={searchInput}
        onValueChange={setSearchInput}
        onEnter={() => {
          setSearch(searchInput.trim());
          setPage(1);
        }}
        onClear={() => {
          setSearchInput("");
          setSearch("");
          setPage(1);
        }}
        limit={limit}
        limitOptions={[20, 50, 100]}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      {error ? <ErrorBlock message={error} /> : null}

      {!error ? (
        <div className={styles.tableAndFooter}>
          <div className={styles.tableRegion}>
            <TrackTable
              tracks={tracks}
              loading={loading}
              sortBy="title"
              sortDirection="asc"
              dislikedTrackIds={dislikedTrackIds}
              likedTrackIds={likedTrackIds}
              onSort={() => undefined}
              onToggleLike={onToggleLike}
              onToggleDislike={onToggleDislike}
              onInfo={setInfoTrack}
              onAddToPlaylist={setPlaylistTrack}
              onPlay={(track) => {
                if (dislikedTrackIds.includes(track.id)) {
                  showToast("Дизлайкнутый трек нельзя воспроизвести", "error");
                  return;
                }
                const playableQueue = tracks.filter((t) => !dislikedTrackIds.includes(t.id));
                playTrack(track, playableQueue);
              }}
              onAddToQueue={(track) => {
                if (dislikedTrackIds.includes(track.id)) {
                  showToast("Дизлайкнутый трек нельзя добавить в очередь", "error");
                  return;
                }
                addToQueue(track);
                showToast("Трек добавлен в очередь", "info");
              }}
              emptyText="Избранного пока нет"
              showHeader={false}
            />
          </div>
          <Pagination total={total} page={page} pages={pages} onChange={setPage} />
        </div>
      ) : null}
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





