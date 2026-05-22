import styles from './FavoritesPage.module.css';
import { useEffect, useRef, useState } from "react";
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
import { usePagination } from "../../hooks/usePagination";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useSearchControls } from "../../hooks/useSearchControls";
import { useUrlListFilters } from "../../hooks/useUrlListFilters";
import { useScrollToTopOnPageChange } from "../../hooks/useScrollToTopOnPageChange";
import { ApiError } from "../../types/api";
import type { Track } from "../../types/track";
import { getRandomSearchPhrase } from "../../utils/searchPhrases";
import { buildTrackPlaybackHandlers } from "../../utils/trackPlayback";

type FavoritesPageProps = {
  onTracksHydrated: (tracks: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onToggleDislike: (track: Track) => void;
};

export function FavoritesPage({ onTracksHydrated, onToggleLike, onToggleDislike }: FavoritesPageProps) {
  const initialParams = new URLSearchParams(window.location.search);
  const initialSearchInput = initialParams.get("search") ?? "";
  const initialPage = Math.max(1, Number(initialParams.get("page")) || 1);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { playTrack, addToQueue } = usePlayer();

  const { searchInput, setSearchInput, setSearchFromExternal, search, applyInstantSearch, clearAllSearch } = useSearchControls({ initialSearchInput });
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useLocalStorage<number>("zavod_favorites_limit", 20);
  const [infoTrack, setInfoTrack] = useState<Track | null>(null);
  const [playlistTrack, setPlaylistTrack] = useState<Track | null>(null);
  const [searchPhrase] = useState(getRandomSearchPhrase);
  const normalizedSearchPhrase = searchPhrase.replace(/^чем\s+/i, "");
  const bodyListRef = useRef<HTMLDivElement | null>(null);

  const dislikedTrackIds = user?.dislikedTrackIds || [];
  const likedTrackIds = user?.likedTrackIds || [];

  useUrlListFilters({
    page,
    setPage,
    limit,
    setLimit,
    searchInput,
    setSearchInput: setSearchFromExternal,
    defaultPage: 1,
    defaultLimit: 20,
  });
  useScrollToTopOnPageChange(page, bodyListRef);

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
  const { onPlay, onAddToQueue } = buildTrackPlaybackHandlers({
    tracks,
    dislikedTrackIds,
    playTrack,
    addToQueue,
    showToast,
  });

  return (
    <section className={styles.tracksPage}>
      <h1 className={styles.title}>Избранные треки</h1>

      <SearchToolbar
        hint={`Наш поиск работает быстрее, чем ${normalizedSearchPhrase}`}
        value={searchInput}
        onValueChange={(next) => {
          setSearchInput(next);
          setPage(1);
        }}
        onEnter={() => {
          applyInstantSearch();
          setPage(1);
        }}
        onClear={() => {
          clearAllSearch();
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
              bodyListRef={bodyListRef}
              tracks={tracks}
              loading={loading}
              isAuthorized={user != null}
              sortBy="title"
              sortDirection="asc"
              dislikedTrackIds={dislikedTrackIds}
              likedTrackIds={likedTrackIds}
              onSort={() => undefined}
              onToggleLike={onToggleLike}
              onToggleDislike={onToggleDislike}
              onInfo={setInfoTrack}
              onAddToPlaylist={setPlaylistTrack}
              onPlay={onPlay}
              onAddToQueue={onAddToQueue}
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







