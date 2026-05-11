import { useMemo } from "react";
import { tracksApi } from "./api/tracksApi";
import { AppLayout } from "./components/AppLayout/AppLayout";
import { useAuth } from "./context/AuthContext";
import { usePlayer } from "./context/PlayerContext";
import { useToast } from "./context/ToastContext";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useRouter } from "./hooks/useRouter";
import { useWindowWidth } from "./hooks/useWindowWidth";
import { AlbumPage } from "./pages/AlbumPage/AlbumPage";
import { AlbumsPage } from "./pages/AlbumsPage/AlbumsPage";
import { ArtistPage } from "./pages/ArtistPage/ArtistPage";
import { ArtistsPage } from "./pages/ArtistsPage/ArtistsPage";
import { FavoritesPage } from "./pages/FavoritesPage/FavoritesPage";
import { MyPlaylistsPage } from "./pages/MyPlaylistsPage/MyPlaylistsPage";
import { NotFoundPage } from "./pages/NotFoundPage/NotFoundPage";
import { PlaylistPage } from "./pages/PlaylistPage/PlaylistPage";
import { PublicPlaylistsPage } from "./pages/PublicPlaylistsPage/PublicPlaylistsPage";
import { TracksPage } from "./pages/TracksPage/TracksPage";
import type { Track } from "./types/track";

function App() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">("zavod_theme", "dark");
  const [warningDismissed, setWarningDismissed] = useLocalStorage<boolean>("zavod_mobile_warning_dismissed", false);
  const width = useWindowWidth();
  const { user, isLoading, loginError, login, logout, updateUser, clearLoginError } = useAuth();
  const { showToast } = useToast();
  const { hydrateTracks, currentTrack, removeTrackAndSkip } = usePlayer();

  const isAuthorized = Boolean(user);
  const { pathname, route, navigate } = useRouter(isAuthorized);
  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  const toggleLike = async (track: Track) => {
    if (!user) { showToast("Войдите, чтобы ставить лайки", "error"); return; }
    const isLiked = user.likedTrackIds.includes(track.id);
    const next = isLiked ? await tracksApi.unlike(track.id) : await tracksApi.like(track.id);
    updateUser(next);
    showToast(isLiked ? "Трек удален из избранного" : "Трек добавлен в избранное", "success");
  };

  const toggleDislike = async (track: Track) => {
    if (!user) { showToast("Войдите, чтобы ставить дизлайк", "error"); return; }
    const isDisliked = user.dislikedTrackIds.includes(track.id);
    const next = isDisliked ? await tracksApi.undislike(track.id) : await tracksApi.dislike(track.id);
    updateUser(next);
    if (!isDisliked) {
      removeTrackAndSkip(track.id);
      if (currentTrack?.id === track.id) showToast("Трек больше не будет воспроизводиться", "info");
      else showToast("Трек больше не будет воспроизводиться", "info");
    } else showToast("Трек снова может быть воспроизведен", "success");
  };

  const playlistIdFromPath = pathname.startsWith("/playlists/") ? pathname.split("/")[2] || "" : "";
  const artistIdFromPath = pathname.startsWith("/artists/") ? pathname.split("/")[2] || "" : "";
  const albumIdFromPath = pathname.startsWith("/albums/") ? pathname.split("/")[2] || "" : "";

  const page = useMemo(() => {
    if (!route) return <NotFoundPage />;
    if (pathname === "/") return <TracksPage onTracksHydrated={hydrateTracks} onToggleLike={(track) => { void toggleLike(track); }} onToggleDislike={(track) => { void toggleDislike(track); }} />;
    if (pathname === "/favorites") return <FavoritesPage onTracksHydrated={hydrateTracks} onToggleLike={(track) => { void toggleLike(track); }} onToggleDislike={(track) => { void toggleDislike(track); }} />;
    if (pathname === "/playlists/my") return <MyPlaylistsPage onOpenPlaylist={(id) => navigate(`/playlists/${id}`)} />;
    if (pathname === "/playlists/public") return <PublicPlaylistsPage onOpenPlaylist={(id) => navigate(`/playlists/${id}`)} />;
    if (pathname.startsWith("/playlists/")) return <PlaylistPage playlistId={playlistIdFromPath} />;
    if (pathname === "/artists") return <ArtistsPage onOpenArtist={(id) => navigate(`/artists/${id}`)} />;
    if (pathname.startsWith("/artists/")) return <ArtistPage artistId={artistIdFromPath} onOpenAlbum={(id) => navigate(`/albums/${id}`)} onToggleLike={(track) => { void toggleLike(track); }} onToggleDislike={(track) => { void toggleDislike(track); }} />;
    if (pathname === "/albums") return <AlbumsPage onOpenAlbum={(id) => navigate(`/albums/${id}`)} />;
    if (pathname.startsWith("/albums/")) return <AlbumPage albumId={albumIdFromPath} onToggleLike={(track) => { void toggleLike(track); }} onToggleDislike={(track) => { void toggleDislike(track); }} />;
    return <NotFoundPage />;
  }, [pathname, route, hydrateTracks, user]);

  if (isLoading) return <div data-theme={theme}><div className="app-shell"><div className="page-content">Восстановление сессии...</div></div></div>;

  return (
    <div data-theme={theme}>
      <AppLayout
        pathname={pathname}
        onNavigate={navigate}
        isDark={theme === "dark"}
        isAuthorized={isAuthorized}
        currentLogin={user?.login || ""}
        loginError={loginError}
        likedTrackIds={user?.likedTrackIds || []}
        dislikedTrackIds={user?.dislikedTrackIds || []}
        onToggleLike={(track) => { void toggleLike(track); }}
        onToggleDislike={(track) => { void toggleDislike(track); }}
        onLogin={async (loginValue) => {
          try { await login(loginValue); showToast(`Вы вошли как ${loginValue.trim()}`, "success"); }
          catch { showToast(loginError || "Пользователь не найден", "error"); }
        }}
        onLogout={() => { logout(); showToast("Вы вышли из аккаунта", "info"); }}
        onClearLoginError={clearLoginError}
        onToggleTheme={toggleTheme}
        warningDismissed={warningDismissed || width >= 768}
        onDismissWarning={() => setWarningDismissed(true)}
      >
        {page}
      </AppLayout>
    </div>
  );
}

export default App;










