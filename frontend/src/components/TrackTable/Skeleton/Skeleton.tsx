import styles from './Skeleton.module.css';

export function Skeleton({ height = 16 }: { height?: number }) {
  return <div className={styles['ui-skeleton']} style={{ height }} aria-hidden="true" />;
}


