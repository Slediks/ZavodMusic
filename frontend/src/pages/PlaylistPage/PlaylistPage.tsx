import styles from './PlaylistPage.module.css';
import { useEffect, useState } from "react";
import { playlistsApi } from "../../api/playlistsApi";
import { AddToPlaylistModal } from "../../components/AddToPlaylistModal/AddToPlaylistModal";
import { ConfirmModal } from "../../components/ConfirmModal/ConfirmModal";
import { EmptyState } from "../../components/EmptyState/EmptyState";
import { EditPlaylistModal } from "../../components/EditPlaylistModal/EditPlaylistModal";
import { ErrorBlock } from "../../components/ErrorBlock/ErrorBlock";
import { TrackTable } from "../../components/TrackTable/TrackTable";
import { useAuth } from "../../context/AuthContext";
import { usePlayer } from "../../context/PlayerContext";
import { useToast } from "../../context/ToastContext";
import { ApiError } from "../../types/api";
import type { PlaylistDetail } from "../../types/playlist";
import type { Track } from "../../types/track";
import { UiIcon } from "../../components/UiIcon/UiIcon";
import { formatDuration } from "../../utils/formatDuration";

export function PlaylistPage({ playlistId }: { playlistId: string }) {
  const { user, updateUser } = useAuth();
  const { playTrack, addToQueue } = usePlayer();
  const { showToast } = useToast();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [orderedTracks, setOrderedTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);
  const [addTrackModal, setAddTrackModal] = useState<{ id: string; title: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const reload = async () => {
    setLoading(true); setError("");
    try {
      const res = await playlistsApi.getById(playlistId);
      setPlaylist(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Не удалось загрузить плейлист");
    } finally { setLoading(false); }
  };

  useEffect(() => { void reload(); }, [playlistId]);
  useEffect(() => { setOrderedTracks(playlist?.tracks || []); }, [playlist?.tracks]);

  const dislikedTrackIds = user?.dislikedTrackIds || [];
  const likedTrackIds = user?.likedTrackIds || [];
  const isOwner = Boolean(user && playlist && user.id === playlist.ownerId);
  const isLikedPlaylist = Boolean(user && playlist && user.likedPlaylistIds.includes(playlist.id));

  const handleReorderInTable = async (fromIndex: number, toIndex: number) => {
    if (!playlist || !isOwner) return;
    const next = [...orderedTracks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setOrderedTracks(next);

    try {
      const updated = await playlistsApi.reorderTracks(playlist.id, next.map((t) => t.id));
      setPlaylist((prev) => (prev ? { ...prev, ...updated, tracks: next } : prev));
    } catch (e) {
      setOrderedTracks(playlist.tracks);
      showToast(e instanceof ApiError ? e.message : "Попробуйте еще раз", "error");
    }
  };

  return (
    <section className={styles.page}>
      {error ? <ErrorBlock message={error} /> : null}
      {loading ? <p>Загрузка...</p> : null}
      {playlist ? (
        <>
          <header className={styles.hero}>
            <div className={styles.quickActions}>
              {isOwner ? (
                <button
                  type="button"
                  className={`ui-icon-btn ${styles.quickBtn}`}
                  onClick={async () => {
                    try {
                      await playlistsApi.update(playlist.id, { isPublic: !playlist.isPublic });
                      await reload();
                      showToast(playlist.isPublic ? "Плейлист стал приватным" : "Плейлист стал публичным", "success");
                    } catch (e) {
                      showToast(e instanceof ApiError ? e.message : "Не удалось изменить приватность", "error");
                    }
                  }}
                  aria-label={playlist.isPublic ? "Сделать плейлист приватным" : "Сделать плейлист публичным"}
                >
                  <UiIcon name={playlist.isPublic ? "lockOff" : "lock"} />
                </button>
              ) : null}
              {!isOwner ? (
                <button
                  type="button"
                  className={`ui-icon-btn ${styles.quickBtn} ${isLikedPlaylist ? styles.quickBtnActive : ""}`}
                  onClick={async () => {
                    try {
                      const next = isLikedPlaylist ? await playlistsApi.unlike(playlist.id) : await playlistsApi.like(playlist.id);
                      updateUser(next);
                      showToast(isLikedPlaylist ? "Плейлист удален из избранного" : "Плейлист добавлен в избранное", "success");
                    } catch (e) {
                      showToast(e instanceof ApiError ? e.message : "Ошибка лайка", "error");
                    }
                  }}
                  aria-label={isLikedPlaylist ? "Убрать лайк плейлиста" : "Поставить лайк плейлисту"}
                >
                  <UiIcon name="heart" />
                </button>
              ) : null}
              {isOwner ? (
                <button type="button" className={`ui-icon-btn ${styles.quickBtn}`} onClick={() => setEditOpen(true)} aria-label="Редактировать плейлист">
                  <UiIcon name="edit" />
                </button>
              ) : null}
            </div>
            <div className={styles.coverWrap}>
              {playlist.coverUrl ? (
                <img src={playlist.coverUrl} alt={playlist.title} className={styles.cover} />
              ) : (
                <div className={`${styles.cover} ${styles.coverFallback}`}>
                  <UiIcon name="folderMusic" />
                </div>
              )}
              <div className={styles.coverOverlay}>
                <button
                  type="button"
                  className={styles.coverPlay}
                  onClick={() => {
                    const playable = orderedTracks.filter((t) => !dislikedTrackIds.includes(t.id));
                    if (!playable.length) { showToast("Нет доступных треков для старта", "error"); return; }
                    playTrack(playable[0], playable);
                  }}
                  aria-label="Играть плейлист"
                >
                  <UiIcon name="play" />
                </button>
              </div>
            </div>

            <div className={styles.heroContent}>
              <p className={styles.kicker}>Плейлист</p>
              <h1>{playlist.title}</h1>
              <p className={styles.description}>{playlist.description || "Без описания"}</p>
              <div className={styles.meta}>
                <span className={styles.metaItem}>{orderedTracks.length} треков</span>
                <span className={styles.metaItem}>{formatDuration(playlist.duration)}</span>
                <span className={styles.metaItem}>{playlist.ownerLogin}</span>
              </div>
            </div>
          </header>

          <div className={styles.content}>
            <div className={styles.tracksRegion}>
              {orderedTracks.length === 0 ? <EmptyState text="В плейлисте пока нет треков" /> : (
                <TrackTable
                  tracks={orderedTracks}
                  loading={false}
                  showHeader={false}
                  sortable={isOwner}
                  onReorder={handleReorderInTable}
                  showQueueButton={!isOwner}
                  menuIncludeQueue={isOwner}
                  showDragHandle={isOwner}
                  showRemoveButton={isOwner}
                  onRemoveTrack={(track) => setDeleteTrackId(track.id)}
                  sortBy="title"
                  sortDirection="asc"
                  dislikedTrackIds={dislikedTrackIds}
                  likedTrackIds={likedTrackIds}
                  onSort={() => undefined}
                  onToggleLike={() => undefined}
                  onToggleDislike={() => undefined}
                  onInfo={() => undefined}
                  onAddToPlaylist={(track) => setAddTrackModal({ id: track.id, title: track.title })}
                  onPlay={(track) => {
                    if (dislikedTrackIds.includes(track.id)) { showToast("Дизлайкнутый трек нельзя воспроизвести", "error"); return; }
                    const playable = orderedTracks.filter((t) => !dislikedTrackIds.includes(t.id));
                    playTrack(track, playable);
                  }}
                  onAddToQueue={(track) => {
                    if (dislikedTrackIds.includes(track.id)) { showToast("Дизлайкнутый трек нельзя добавить в очередь", "error"); return; }
                    addToQueue(track);
                    showToast("Трек добавлен в очередь", "info");
                  }}
                />
              )}
            </div>

          </div>

          <ConfirmModal
            isOpen={Boolean(deleteTrackId)}
            title="Удалить трек"
            text="Удалить трек из плейлиста?"
            onCancel={() => setDeleteTrackId(null)}
            onConfirm={async () => {
              if (!deleteTrackId) return;
              try {
                await playlistsApi.removeTrack(playlist.id, deleteTrackId);
                setDeleteTrackId(null);
                await reload();
                showToast("Трек удален", "info");
              } catch (e) {
                showToast(e instanceof ApiError ? e.message : "Не удалось удалить трек", "error");
              }
            }}
          />

          <AddToPlaylistModal
            isOpen={Boolean(addTrackModal)}
            trackId={addTrackModal?.id || null}
            trackTitle={addTrackModal?.title || ""}
            onClose={() => setAddTrackModal(null)}
            onDone={async () => {
              showToast("Трек добавлен в плейлист", "success");
              await reload();
            }}
          />
          <EditPlaylistModal
            playlist={editOpen ? playlist : null}
            onClose={() => setEditOpen(false)}
            onSubmit={async (id, body) => {
              try {
                await playlistsApi.update(id, body);
                setEditOpen(false);
                await reload();
                showToast("Плейлист обновлен", "success");
              } catch (e) {
                showToast(e instanceof ApiError ? e.message : "Не удалось обновить плейлист", "error");
              }
            }}
          />
        </>
      ) : null}
    </section>
  );
}




