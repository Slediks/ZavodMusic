import styles from './TracksPage.module.css';
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

type SortBy = "title" | "albumTitle" | "duration";
type SortDirection = "asc" | "desc";
const TRACKS_ALLOWED_SORT_FIELDS: SortBy[] = ["title", "albumTitle", "duration"];

type TracksPageProps = {
  onTracksHydrated: (tracks: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onToggleDislike: (track: Track) => void;
};

export function TracksPage({ onTracksHydrated, onToggleLike, onToggleDislike }: TracksPageProps) {
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
  const [limit, setLimit] = useLocalStorage<number>("zavod_tracks_limit", 20);

  const [sortBy, setSortBy] = useState<SortBy>("title");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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
    sortBy,
    setSortBy: (next) => setSortBy(next as SortBy),
    allowedSortBy: TRACKS_ALLOWED_SORT_FIELDS,
    defaultSortBy: "title",
    sortDirection,
    setSortDirection: (next) => setSortDirection(next as SortDirection),
    defaultSortDirection: "asc",
  });
  useScrollToTopOnPageChange(page, bodyListRef);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await tracksApi.getAll({ search, page, limit, sortBy, sortDirection });
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
  }, [search, page, limit, sortBy, sortDirection, onTracksHydrated]);

  const { pages } = usePagination({ total, page, limit });

  const onSort = (field: SortBy) => {
    if (field === sortBy) setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const { onPlay, onAddToQueue } = buildTrackPlaybackHandlers({
    tracks,
    dislikedTrackIds,
    playTrack,
    addToQueue,
    showToast,
  });

  return (
    <section className={styles.tracksPage}>
      <h1 className={styles.title}>Все треки</h1>

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
              sortBy={sortBy}
              sortDirection={sortDirection}
              dislikedTrackIds={dislikedTrackIds}
              likedTrackIds={likedTrackIds}
              onSort={onSort}
              onToggleLike={onToggleLike}
              onToggleDislike={onToggleDislike}
              onInfo={setInfoTrack}
              onAddToPlaylist={setPlaylistTrack}
              onPlay={onPlay}
              onAddToQueue={onAddToQueue}
              emptyText="Ничего не нашли, но мы старались"
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








