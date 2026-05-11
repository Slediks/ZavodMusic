import './Header.module.css';
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

  useClickOutside(wrapRef, () => { setIsLoginOpen(false); onClearLoginError(); }, isLoginOpen);

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
    <header className="header">
      <div className="header-row">
        <div className="brand-block">
          <div className="brand-logo" aria-hidden="true" />
          <div className="brand-divider" aria-hidden="true" />
          <AppLink to="/" currentPath={pathname} onNavigate={onNavigate} className="brand-link">
            <span className="brand-title">ZAVOD MUSIC</span>
            <span className="brand-subtitle">Работай с удовольствием</span>
          </AppLink>
        </div>

        <div className="header-controls">
          {!isAuthorized ? (
            <div className="login-wrap" ref={wrapRef}>
              {!isLoginOpen ? (
                <button type="button" className="login-button" onClick={() => setIsLoginOpen(true)}>Войти</button>
              ) : (
                <div className="login-inline">
                  <div className="login-input-wrap">
                    <input
                      className={`login-input ${loginError ? "is-error" : ""} ${isShake ? "is-shake" : ""}`}
                      placeholder="Логин"
                      value={loginValue}
                      onChange={(e) => setLoginValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void submitLogin(); }}
                    />
                    <div className="login-actions">
                      <button
                        type="button"
                        className="ui-icon-btn login-action-btn"
                        onClick={() => { setIsLoginOpen(false); onClearLoginError(); }}
                        aria-label="Отмена"
                      >
                        <UiIcon name="close" />
                      </button>
                      <button
                        type="button"
                        className="ui-icon-btn login-action-btn login-action-btn-submit"
                        onClick={() => void submitLogin()}
                        aria-label="Подтвердить"
                      >
                        <UiIcon name="check" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {loginError ? <div className="login-error-text">{loginError}</div> : null}
            </div>
          ) : (
            <div className="login-inline">
              <div className="user-chip">
                <span className="user-chip-name">{currentLogin}</span>
                <button type="button" className="ui-icon-btn user-chip-logout" onClick={onLogout} aria-label="Выйти"><UiIcon name="logout" /></button>
              </div>
            </div>
          )}
          <button type="button" className="theme-toggle" onClick={onToggleTheme} aria-label={isDark ? "Светлая тема" : "Темная тема"}>
            <UiIcon name={isDark ? "themeDark" : "themeLight"} />
          </button>
        </div>
      </div>

      <div className="nav-container">
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
