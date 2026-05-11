import styles from './ErrorBlock.module.css';
export function ErrorBlock({ message }: { message: string }) {
  return <div className={styles["ui-error"]}>{message}</div>;
}












