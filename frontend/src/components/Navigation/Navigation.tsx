import styles from './Navigation.module.css';
import { AppLink } from "./AppLink/AppLink";

type NavItem = { path: string; label: string };

type NavigationProps = {
  items: NavItem[];
  pathname: string;
  onNavigate: (to: string) => void;
};

export function Navigation({ items, pathname, onNavigate }: NavigationProps) {
  return (
    <nav className={styles["top-nav"]} aria-label="Навигация">
      {items.map((item) => (
        <AppLink key={item.path} to={item.path} currentPath={pathname} onNavigate={onNavigate} className={styles["nav-link"]}>
          {item.label}
        </AppLink>
      ))}
    </nav>
  );
}















