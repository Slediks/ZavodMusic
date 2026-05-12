import styles from "./Header.module.css";
import { useCallback, useRef, useState } from "react";
import { useClickOutside } from "../../hooks/useClickOutside";
import { AppLink } from "../Navigation/AppLink/AppLink";
import { Navigation } from "../Navigation/Navigation";
import { AUTH_NAV_LINKS, PUBLIC_NAV_LINKS } from "../../utils/routes";
import { UiIcon } from "../UiIcon/UiIcon";

type HeaderProps = {
  pathname: string;
  onNavigate: (to: string) => void;
  isDark: boolean;
  isAuthorized: boolean;
  currentLogin: string;
  loginError: string;
  onLogin: (login: string) => Promise<void>;
  onLogout: () => void;
  onToggleTheme: () => void;
  onClearLoginError: () => void;
};

export function Header({ pathname, onNavigate, isDark, isAuthorized, currentLogin, loginError, onLogin, onLogout, onToggleTheme, onClearLoginError }: HeaderProps) {
  const navItems = isAuthorized ? AUTH_NAV_LINKS : PUBLIC_NAV_LINKS;
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginValue, setLoginValue] = useState("");
  const [isShake, setIsShake] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(wrapRef, () => {
    setIsLoginOpen(false);
    onClearLoginError();
  }, isLoginOpen);

  const submitLogin = useCallback(async () => {
    try {
      await onLogin(loginValue);
      setLoginValue("");
      setIsLoginOpen(false);
    } catch {
      setIsShake(true);
      window.setTimeout(() => setIsShake(false), 260);
    }
  }, [loginValue, onLogin]);

  return (
    <header className={styles.header}>
      <div className={styles["header-row"]}>
        <div className={styles["brand-block"]}>
          <div className={styles["brand-logo"]} aria-hidden="true" />
          <div className={styles["brand-divider"]} aria-hidden="true" />
          <AppLink to="/" currentPath={pathname} onNavigate={onNavigate} className={styles["brand-link"]}>
            <span className={styles["brand-title"]}>ZAVOD MUSIC</span>
            <span className={styles["brand-subtitle"]}>Работай с удовольствием</span>
          </AppLink>
        </div>

        <div className={styles["header-controls"]}>
          {!isAuthorized ? (
            <div className={styles["login-wrap"]} ref={wrapRef}>
              {!isLoginOpen ? (
                <button type="button" className={styles["login-button"]} onClick={() => setIsLoginOpen(true)}>
                  Войти
                </button>
              ) : (
                <div className={styles["login-inline"]}>
                  <div className={styles["login-input-wrap"]}>
                    <input
                      className={[
                        styles["login-input"],
                        loginError ? styles["is-error"] : "",
                        isShake ? styles["is-shake"] : ""
                      ].filter(Boolean).join(" ")}
                      placeholder="Логин"
                      value={loginValue}
                      onChange={(e) => setLoginValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void submitLogin();
                        }
                      }}
                    />
                    <div className={styles["login-actions"]}>
                      <button
                        type="button"
                        className={styles["login-action-btn"]}
                        onClick={() => {
                          setIsLoginOpen(false);
                          onClearLoginError();
                        }}
                        aria-label="Отмена"
                      >
                        <UiIcon name="close" />
                      </button>
                      <button
                        type="button"
                        className={[styles["login-action-btn"], styles["login-action-btn-submit"]].join(" ")}
                        onClick={() => void submitLogin()}
                        aria-label="Подтвердить"
                      >
                        <UiIcon name="check" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {loginError ? <div className={styles["login-error-text"]}>{loginError}</div> : null}
            </div>
          ) : (
            <div className={styles["login-inline"]}>
              <div className={styles["user-chip"]}>
                <span className={styles["user-chip-name"]}>{currentLogin}</span>
                <button
                  type="button"
                  className={styles["user-chip-logout"]}
                  onClick={onLogout}
                  aria-label="Выйти"
                >
                  <UiIcon name="logout" className={styles["user-chip-logout-icon"]} />
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            className={styles["theme-toggle"]}
            onClick={onToggleTheme}
            aria-label={isDark ? "Светлая тема" : "Темная тема"}
          >
            <UiIcon name={isDark ? "themeDark" : "themeLight"} className={styles["theme-toggle-icon"]} />
          </button>
        </div>
      </div>

      <div className={styles["nav-container"]}>
        <Navigation
          items={navItems}
          pathname={pathname}
          onNavigate={(to) => {
            onNavigate(to);
          }}
        />
      </div>
    </header>
  );
}



