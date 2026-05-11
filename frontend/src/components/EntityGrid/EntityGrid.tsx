import styles from './EntityGrid.module.css';
type EntityGridProps = {
  children: React.ReactNode;
};

export function EntityGrid({ children }: EntityGridProps) {
  return <div className={styles["entity-grid"]}>{children}</div>;
}












