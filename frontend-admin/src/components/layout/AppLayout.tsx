import React from "react";
import styles from "./AppLayout.module.css";

type AppLayoutProps = {
  nav: [string, string][];
  path: string;
  onLogout: () => void;
  children: React.ReactNode;
};

function sectionName(path: string) {
  const map: Record<string, string> = {
    "/tracks": "Треки",
    "/albums": "Альбомы",
    "/artists": "Авторы",
    "/playlists": "Плейлисты",
    "/users": "Пользователи",
    "/smart": "Умный поиск дублей",
    "/scan": "Сканирование медиатеки",
  };
  return map[path] || "Админка";
}

export function AppLayout({ nav, path, onLogout, children }: AppLayoutProps) {
  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandWrap}>
          <div className={styles.brandBadge}>ZM</div>
          <div>
            <h1 className={styles.title}>Zavod Admin</h1>
            <p className={styles.subtitle}>Control Center</p>
          </div>
        </div>

        <nav className={styles.navList}>
          {nav.map(([href, label]) => (
            <a key={href} href={`#${href}`} className={path === href ? `${styles.navItem} ${styles.active}` : styles.navItem}>
              <span className={styles.dot} />
              {label}
            </a>
          ))}
        </nav>

        <button className={styles.logout} onClick={onLogout}>Выйти</button>
      </aside>

      <div className={styles.mainWrap}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.kicker}>Раздел</p>
            <h2 className={styles.pageTitle}>{sectionName(path)}</h2>
          </div>
          <div className={styles.statusPill}>Backend: online</div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
