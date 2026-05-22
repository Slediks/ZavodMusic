import styles from './ArtistsPage.module.css';
import { useEffect, useRef, useState } from "react";
import { artistsApi } from "../../api/artistsApi";
import { ArtistCard } from "../../components/ArtistCard/ArtistCard";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ErrorBlock } from "../../components/ErrorBlock/ErrorBlock";
import { Pagination } from "../../components/Pagination/Pagination";
import { SearchToolbar } from "../../components/SearchToolbar/SearchToolbar";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useSearchControls } from "../../hooks/useSearchControls";
import { useUrlListFilters } from "../../hooks/useUrlListFilters";
import { useScrollToTopOnPageChange } from "../../hooks/useScrollToTopOnPageChange";
import { usePlayer } from "../../context/PlayerContext";
import { useToast } from "../../context/ToastContext";
import type { Artist } from "../../types/artist";
import { ApiError } from "../../types/api";
import { getRandomSearchPhrase } from "../../utils/searchPhrases";

export function ArtistsPage({ onOpenArtist }: { onOpenArtist: (id: string) => void }) {
  const initialParams = new URLSearchParams(window.location.search);
  const initialSearchInput = initialParams.get("search") ?? "";
  const initialPage = Math.max(1, Number(initialParams.get("page")) || 1);
  const { playTrack, hydrateTracks } = usePlayer();
  const { showToast } = useToast();

  const [items, setItems] = useState<Artist[]>([]);
  const { searchInput, setSearchInput, setSearchFromExternal, search, clearInstantSearch, applyInstantSearch, clearAllSearch } = useSearchControls({ initialSearchInput });
  const [page, setPage] = useState(initialPage);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useLocalStorage<number>("zavod_artists_limit", 24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchPhrase] = useState(getRandomSearchPhrase);
  const normalizedSearchPhrase = searchPhrase.replace(/^чем\s+/i, "");
  const cardsRegionRef = useRef<HTMLDivElement | null>(null);

  useUrlListFilters({
    page,
    setPage,
    limit,
    setLimit,
    searchInput,
    setSearchInput: setSearchFromExternal,
    defaultPage: 1,
    defaultLimit: 24,
  });
  useScrollToTopOnPageChange(page, cardsRegionRef);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await artistsApi.getAll({ search, page, limit });
        setItems(res.items || []);
        setPages(res.pages || 0);
        setTotal(res.total || 0);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [search, page, limit]);

  return (
    <section className={styles.tracksPage}>
      <h1 className={styles.title}>Исполнители</h1>

      <SearchToolbar
        hint={`Наш поиск работает быстрее, чем ${normalizedSearchPhrase}`}
        value={searchInput}
        onValueChange={(next) => {
          setSearchInput(next);
          clearInstantSearch();
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
        limitOptions={[24, 48]}
        onLimitChange={(next) => {
          setLimit(next);
          setPage(1);
        }}
      />

      {error ? <ErrorBlock message={error} /> : null}

      {!error ? (
        <div className={styles.tableAndFooter}>
          <div ref={cardsRegionRef} className={styles.cardsRegion}>
            {loading ? (
              <div className={styles.skeletonGrid} aria-hidden="true">
                {Array.from({ length: Math.max(8, Math.min(limit, 12)) }).map((_, idx) => (
                  <article key={`artist-sk-${idx}`} className={styles.skeletonCard}>
                    <div className={`${styles.skeletonBase} ${styles.skeletonCover}`} />
                    <div className={`${styles.skeletonBase} ${styles.skeletonTitle}`} />
                    <div className={styles.skeletonMetaRow}>
                      <div className={`${styles.skeletonBase} ${styles.skeletonMeta}`} />
                      <div className={`${styles.skeletonBase} ${styles.skeletonMeta}`} />
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {!loading && items.length === 0 ? <EmptyState text="Ничего не нашли, но мы старались" /> : null}
            {!loading && items.length > 0 ? (
              <div className={styles.artistsGrid}>
                {items.map((artist) => (
                  <ArtistCard
                    key={artist.id}
                    artist={artist}
                    onOpen={onOpenArtist}
                    onPlay={async (id) => {
                      try {
                        const tracks = await artistsApi.getTracks(id, { page: 1, limit: 100 });
                        const playable = tracks.items || [];
                        hydrateTracks(playable);
                        if (!playable.length) {
                          showToast("Ничего не нашли, но мы старались", "error");
                          return;
                        }
                        playTrack(playable[0], playable);
                      } catch {
                        showToast("Ошибка запуска", "error");
                      }
                    }}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <Pagination total={total} page={page} pages={pages} onChange={setPage} />
        </div>
      ) : null}
    </section>
  );
}














