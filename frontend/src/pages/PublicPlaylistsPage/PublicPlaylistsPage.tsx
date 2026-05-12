import styles from './PublicPlaylistsPage.module.css';
import { useEffect, useMemo, useState } from "react";
import { playlistsApi } from "../../api/playlistsApi";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { ErrorBlock } from "../../components/ErrorBlock/ErrorBlock";
import { Pagination } from "../../components/Pagination/Pagination";
import { PlaylistCard } from "../../components/PlaylistCard/PlaylistCard";
import { SearchToolbar } from "../../components/SearchToolbar/SearchToolbar";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useSearchControls } from "../../hooks/useSearchControls";
import { ApiError } from "../../types/api";
import type { Playlist } from "../../types/playlist";
import { getRandomSearchPhrase } from "../../utils/searchPhrases";

export function PublicPlaylistsPage({ onOpenPlaylist }: { onOpenPlaylist: (id: string) => void }) {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [items, setItems] = useState<Playlist[]>([]);
  const { searchInput, setSearchInput, search, clearInstantSearch, applyInstantSearch, clearAllSearch } = useSearchControls();
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useLocalStorage<number>("zavod_public_playlists_limit", 24);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchPhrase] = useState(getRandomSearchPhrase);
  const normalizedSearchPhrase = searchPhrase.replace(/^чем\s+/i, "");

  const loadPublicPlaylists = async (opts?: { page?: number; limit?: number; search?: string }) => {
    setLoading(true);
    setError("");
    try {
      const res = await playlistsApi.getPublic({
        page: opts?.page ?? page,
        limit: opts?.limit ?? limit,
        search: opts?.search ?? search
      });
      setItems(res.items || []);
      setPages(res.pages || 0);
      setTotal(res.total || 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить плейлисты");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPublicPlaylists();
  }, [search, page, limit]);

  const likedIds = useMemo(() => new Set(user?.likedPlaylistIds || []), [user?.likedPlaylistIds]);

  return (
    <section className={styles.tracksPage}>
      <h1 className={styles.title}>Публичные плейлисты</h1>

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
          <div className={styles.cardsRegion}>
            {loading ? (
              <div className={styles.skeletonGrid} aria-hidden="true">
                {Array.from({ length: Math.max(8, Math.min(limit, 12)) }).map((_, idx) => (
                  <article key={`playlist-sk-${idx}`} className={styles.skeletonCard}>
                    <div className={`${styles.skeletonBase} ${styles.skeletonCover}`} />
                    <div className={`${styles.skeletonBase} ${styles.skeletonTitle}`} />
                    <div className={`${styles.skeletonBase} ${styles.skeletonSubtitle}`} />
                    <div className={styles.skeletonMetaRow}>
                      <div className={`${styles.skeletonBase} ${styles.skeletonMeta}`} />
                      <div className={`${styles.skeletonBase} ${styles.skeletonMeta}`} />
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            {!loading && items.length === 0 ? <EmptyState text="Публичных плейлистов пока нет" /> : null}
            {!loading && items.length > 0 ? (
              <div className={styles.playlistsGrid}>
                {items.map((p) => (
                  <PlaylistCard
                    key={p.id}
                    playlist={p}
                    canManage={false}
                    canLike={p.ownerId !== user?.id}
                    isLiked={likedIds.has(p.id)}
                    onOpen={onOpenPlaylist}
                    onPlay={() => showToast("Для воспроизведения откройте плейлист", "info")}
                    onLike={async (playlist) => {
                      const wasLiked = likedIds.has(playlist.id);
                      try {
                        const next = wasLiked
                          ? await playlistsApi.unlike(playlist.id)
                          : await playlistsApi.like(playlist.id);
                        updateUser(next);
                      } catch (e) {
                        showToast(e instanceof ApiError ? e.message : "Ошибка лайка", "error");
                      }
                    }}
                    onCopyLink={async (playlist) => {
                      await navigator.clipboard.writeText(`${window.location.origin}/playlists/${playlist.id}`);
                      showToast("Ссылка на плейлист скопирована", "success");
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














