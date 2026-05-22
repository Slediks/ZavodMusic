import type { ReactNode } from "react";
import type { Track } from "../../types/track";
import styles from '../AppLayout/AppLayout.module.css';
import { FullscreenPlayer } from "../FullscreenPlayer/FullscreenPlayer";
import { Header } from "../Header/Header";
import { PlayerBar } from "../PlayerBar/PlayerBar";
import { QueuePanel } from "../QueuePanel/QueuePanel";
import { ToastContainer } from "../ToastContainer/ToastContainer";
import { UiIcon } from "../UiIcon/UiIcon";

type AppLayoutProps = {
  pathname: string;
  onNavigate: (to: string) => void;
  isDark: boolean;
  isAuthorized: boolean;
  currentLogin: string;
  loginError: string;
  likedTrackIds: string[];
  dislikedTrackIds: string[];
  onToggleLike: (track: Track) => void;
  onToggleDislike: (track: Track) => void;
  onLogin: (login: string) => Promise<void>;
  onLogout: () => void;
  onClearLoginError: () => void;
  onToggleTheme: () => void;
  warningDismissed: boolean;
  onDismissWarning: () => void;
  children: ReactNode;
};

export function AppLayout({ pathname, onNavigate, isDark, isAuthorized, currentLogin, loginError, likedTrackIds, dislikedTrackIds, onToggleLike, onToggleDislike, onLogin, onLogout, onClearLoginError, onToggleTheme, warningDismissed, onDismissWarning, children }: AppLayoutProps) {
  return (
    <div className={styles["app-shell"]}>
      {!warningDismissed && (
        <div className={styles["mobile-warning"]} role="alert">
          <span>Интерфейс рассчитан на ширину от 768px.</span>
          <button type="button" onClick={onDismissWarning} aria-label="Закрыть предупреждение"><UiIcon name="close" /></button>
        </div>
      )}
      <Header
        pathname={pathname}
        onNavigate={onNavigate}
        isDark={isDark}
        isAuthorized={isAuthorized}
        currentLogin={currentLogin}
        loginError={loginError}
        onLogin={onLogin}
        onLogout={onLogout}
        onClearLoginError={onClearLoginError}
        onToggleTheme={onToggleTheme}
      />
      <main className={styles["page-content"]}>{children}</main>
      <PlayerBar isAuthorized={isAuthorized} likedTrackIds={likedTrackIds} dislikedTrackIds={dislikedTrackIds} onToggleLike={onToggleLike} onToggleDislike={onToggleDislike} />
      <FullscreenPlayer
        isAuthorized={isAuthorized}
        likedTrackIds={likedTrackIds}
        dislikedTrackIds={dislikedTrackIds}
        onToggleLike={onToggleLike}
        onToggleDislike={onToggleDislike}
      />
      <QueuePanel dislikedTrackIds={dislikedTrackIds} />
      <ToastContainer />
    </div>
  );
}







