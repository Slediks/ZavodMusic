import styles from './AlbumsPage.module.css';
import { useEffect, useState } from "react";
import { albumsApi } from "../../api/albumsApi";
import { AlbumCard } from "../../components/AlbumCard/AlbumCard";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ErrorBlock } from "../../components/ErrorBlock/ErrorBlock";
import { Pagination } from "../../components/Pagination/Pagination";
import { SearchToolbar } from "../../components/SearchToolbar/SearchToolbar";
import { useDebounce } from "../../hooks/useDebounce";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { usePlayer } from "../../context/PlayerContext";
import { useToast } from "../../context/ToastContext";
import type { Album } from "../../types/album";
import { ApiError } from "../../types/api";
import { getRandomSearchPhrase } from "../../utils/searchPhrases";

export function AlbumsPage({ onOpenAlbum }: { onOpenAlbum: (id: string) => void }) {
  const { playTrack, hydrateTracks } = usePlayer();
  const { showToast } = useToast();
  const [items, setItems] = useState<Album[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [instantSearch, setInstantSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useLocalStorage<number>("zavod_albums_limit", 24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchPhrase] = useState(getRandomSearchPhrase);
  const normalizedSearchPhrase = searchPhrase.replace(/^чем\s+/i, "");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await albumsApi.getAll({ search: instantSearch || search, page, limit });
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
  }, [search, instantSearch, page, limit]);

  return (
    <section className={`${'{'}styles["page-stub"]} ${styles.tracksPage}`}>
      <h1 className={styles.title}>Альбомы</h1>

      <SearchToolbar
        hint={`Наш поиск работает быстрее, чем ${normalizedSearchPhrase}`}
        value={searchInput}
        onValueChange={(next) => {
          setSearchInput(next);
          setInstantSearch("");
          setPage(1);
        }}
        onEnter={() => {
          setInstantSearch(searchInput.trim());
          setPage(1);
        }}
        onClear={() => {
          setSearchInput("");
          setInstantSearch("");
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
          <div className={styles.cardsRegion}>
            {loading ? (
              <div className={styles.skeletonGrid} aria-hidden="true">
                {Array.from({ length: Math.max(8, Math.min(limit, 12)) }).map((_, idx) => (
                  <article key={`album-sk-${idx}`} className={styles.skeletonCard}>
                    <div className={`ui-skeleton ${styles.skeletonCover}`} />
                    <div className={`ui-skeleton ${styles.skeletonTitle}`} />
                    <div className={`ui-skeleton ${styles.skeletonSubtitle}`} />
                    <div className={styles.skeletonMetaRow}>
                      <div className={`ui-skeleton ${styles.skeletonMeta}`} />
                      <div className={`ui-skeleton ${styles.skeletonMeta}`} />
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {!loading && items.length === 0 ? <EmptyState text="Ничего не нашли, но мы старались" /> : null}
            {!loading && items.length > 0 ? (
              <div className={styles.albumsGrid}>
                {items.map((album) => (
                  <AlbumCard
                    key={album.id}
                    album={album}
                    onOpen={onOpenAlbum}
                    onPlay={async (id) => {
                      try {
                        const tracks = await albumsApi.getTracks(id, { page: 1, limit: 100 });
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




