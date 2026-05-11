import styles from './MyPlaylistsPage.module.css';
import { useEffect, useMemo, useState, type WheelEvent as ReactWheelEvent } from 'react';
import { playlistsApi } from '../../api/playlistsApi';
import { ConfirmModal } from '../../components/ConfirmModal/ConfirmModal';
import { CreatePlaylistCard } from '../../components/CreatePlaylistCard/CreatePlaylistCard';
import { CreatePlaylistModal } from '../../components/CreatePlaylistModal/CreatePlaylistModal';
import { EditPlaylistModal } from '../../components/EditPlaylistModal/EditPlaylistModal';
import { ErrorBlock } from '../../components/ErrorBlock/ErrorBlock';
import { PlaylistCard } from '../../components/PlaylistCard/PlaylistCard';
import { useAuth } from '../../context/AuthContext';
import { usePlayer } from '../../context/PlayerContext';
import { useToast } from '../../context/ToastContext';
import { ApiError } from '../../types/api';
import type { Playlist } from '../../types/playlist';

export function MyPlaylistsPage({ onOpenPlaylist }: { onOpenPlaylist: (id: string) => void }) {
  const { user, updateUser } = useAuth();
  const { playTrack } = usePlayer();
  const { showToast } = useToast();
  const [created, setCreated] = useState<Playlist[]>([]);
  const [liked, setLiked] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editPlaylist, setEditPlaylist] = useState<Playlist | null>(null);
  const [deletePlaylist, setDeletePlaylist] = useState<Playlist | null>(null);

  const reload = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await playlistsApi.getMy({ page: 1, limit: 100 });
      setCreated(res.own.items || []);
      setLiked(res.liked.items || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Не удалось загрузить плейлисты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const likedIds = useMemo(() => new Set(user?.likedPlaylistIds || []), [user?.likedPlaylistIds]);

  const onRailWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (delta === 0) return;
    e.preventDefault();
    target.scrollLeft += delta;
  };

  const guardedOpenPlaylist = (id: string) => {
    onOpenPlaylist(id);
  };

  const guardedCreatePlaylist = () => {
    setCreateOpen(true);
  };

  const playPlaylistFromCard = async (playlist: Playlist) => {
    try {
      const detail = await playlistsApi.getById(playlist.id);
      const dislikedTrackIds = user?.dislikedTrackIds || [];
      const playable = (detail.tracks || []).filter((track) => !dislikedTrackIds.includes(track.id));
      if (!playable.length) {
        showToast("Нет доступных треков для старта", "error");
        return;
      }
      playTrack(playable[0], playable);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "Не удалось запустить плейлист", "error");
    }
  };

  return (
    <section className={`${'{'}styles["page-stub"]} ${styles.tracksPage}`}>
      <h1 className={styles.title}>Мои плейлисты</h1>
      {error ? <ErrorBlock message={error} /> : null}

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>Созданные мной</h2>
        <div className={styles.railViewport} onWheel={onRailWheel}>
          <div className={styles.playlistRail}>
            {loading
              ? Array.from({ length: 8 }).map((_, idx) => (
                  <article key={`my-own-sk-${idx}`} className={styles.playlistCardSkeleton}>
                    <div className={`ui-skeleton ${styles.playlistCardSkeletonCover}`} />
                    <div className={`ui-skeleton ${styles.playlistCardSkeletonTitle}`} />
                    <div className={`ui-skeleton ${styles.playlistCardSkeletonMeta}`} />
                  </article>
                ))
              : (
                  <>
                    <CreatePlaylistCard onCreate={guardedCreatePlaylist} />
                    {created.map((p) => (
                      <PlaylistCard
                        key={p.id}
                        playlist={p}
                        canManage
                        isLiked={false}
                        canToggleVisibility
                        onOpen={guardedOpenPlaylist}
                        onPlay={(playlist) => { void playPlaylistFromCard(playlist); }}
                        onLike={() => undefined}
                        onToggleVisibility={async (playlist) => {
                          try {
                            await playlistsApi.update(playlist.id, { isPublic: !playlist.isPublic });
                            await reload();
                            showToast(playlist.isPublic ? 'Плейлист сделан приватным' : 'Плейлист сделан публичным', 'success');
                          } catch (e) {
                            showToast(e instanceof ApiError ? e.message : 'Не удалось изменить приватность', 'error');
                          }
                        }}
                        onEdit={setEditPlaylist}
                        onDelete={setDeletePlaylist}
                        onCopyLink={async (playlist) => {
                          await navigator.clipboard.writeText(`${window.location.origin}/playlists/${playlist.id}`);
                          showToast('Ссылка на плейлист скопирована', 'success');
                        }}
                      />
                    ))}
                  </>
                )}
          </div>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <h2 className={styles.sectionTitle}>Понравившиеся</h2>
        <div className={styles.railViewport} onWheel={onRailWheel}>
          <div className={styles.playlistRail}>
            {loading
              ? Array.from({ length: 8 }).map((_, idx) => (
                  <article key={`my-liked-sk-${idx}`} className={styles.playlistCardSkeleton}>
                    <div className={`ui-skeleton ${styles.playlistCardSkeletonCover}`} />
                    <div className={`ui-skeleton ${styles.playlistCardSkeletonTitle}`} />
                    <div className={`ui-skeleton ${styles.playlistCardSkeletonMeta}`} />
                  </article>
                ))
              : liked.map((p) => (
                  <PlaylistCard
                    key={p.id}
                    playlist={p}
                    canManage={false}
                    isLiked={likedIds.has(p.id)}
                    onOpen={guardedOpenPlaylist}
                    onPlay={(playlist) => { void playPlaylistFromCard(playlist); }}
                    onLike={async (playlist) => {
                      try {
                        const nextUser = likedIds.has(playlist.id)
                          ? await playlistsApi.unlike(playlist.id)
                          : await playlistsApi.like(playlist.id);
                        updateUser(nextUser);
                        await reload();
                      } catch (e) {
                        showToast(e instanceof ApiError ? e.message : 'Ошибка лайка', 'error');
                      }
                    }}
                    onCopyLink={async (playlist) => {
                      await navigator.clipboard.writeText(`${window.location.origin}/playlists/${playlist.id}`);
                      showToast('Ссылка на плейлист скопирована', 'success');
                    }}
                  />
                ))}

            {!loading && liked.length === 0 ? (
              <div className={styles.emptyLiked}>
                Понравившихся плейлистов пока нет. Самое время найти что-то годное и влепить лайк.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <CreatePlaylistModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (body) => {
          try {
            await playlistsApi.create(body);
            setCreateOpen(false);
            await reload();
            showToast('Плейлист создан', 'success');
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : 'Не удалось создать плейлист', 'error');
          }
        }}
      />

      <EditPlaylistModal
        playlist={editPlaylist}
        onClose={() => setEditPlaylist(null)}
        onSubmit={async (id, body) => {
          try {
            await playlistsApi.update(id, body);
            setEditPlaylist(null);
            await reload();
            showToast('Плейлист обновлен', 'success');
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : 'Не удалось обновить плейлист', 'error');
          }
        }}
      />

      <ConfirmModal
        isOpen={Boolean(deletePlaylist)}
        title="Удалить плейлист"
        text="Удалить плейлист без возможности восстановления?"
        onCancel={() => setDeletePlaylist(null)}
        onConfirm={async () => {
          if (!deletePlaylist) return;
          try {
            await playlistsApi.remove(deletePlaylist.id);
            setDeletePlaylist(null);
            await reload();
            showToast('Плейлист удален', 'info');
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : 'Не удалось удалить плейлист', 'error');
          }
        }}
      />
    </section>
  );
}




