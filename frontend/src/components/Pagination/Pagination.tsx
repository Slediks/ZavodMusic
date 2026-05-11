import styles from './Pagination.module.css';
import { UiIcon } from "../UiIcon/UiIcon";

type PaginationProps = {
  total: number;
  page: number;
  pages: number;
  onChange: (next: number) => void;
};

export function Pagination({ total, page, pages, onChange }: PaginationProps) {
  const safePage = pages === 0 ? 0 : page;
  const dotsCount = Math.min(3, Math.max(1, pages || 1));
  const activeDot = pages === 0
    ? -1
    : pages <= dotsCount
      ? page - 1
      : page <= 1
        ? 0
        : page >= pages
          ? dotsCount - 1
          : 1;

  return (
    <div className={styles.pagination}>
      <span className={styles.leftPart}>Найдено: <strong>{total}</strong></span>
      <div className={styles.center}>
        <button type="button" className={`ui-icon-btn ${styles.pageBtn}`} disabled={page <= 1 || pages === 0} onClick={() => onChange(page - 1)} aria-label="Предыдущая страница"><UiIcon name="arrowLeft" /></button>
        <div className={styles.dots}>
          {Array.from({ length: dotsCount }).map((_, index) => (
            <span key={index} className={`${styles.dot} ${activeDot === index ? styles.dotActive : ""}`} />
          ))}
        </div>
        <button type="button" className={`ui-icon-btn ${styles.pageBtn}`} disabled={pages === 0 || page >= pages} onClick={() => onChange(page + 1)} aria-label="Следующая страница"><UiIcon name="arrowLeft" className={styles.nextIcon} /></button>
      </div>
      <span className={styles.rightPart}><strong>{safePage}</strong> из <strong>{pages}</strong></span>
    </div>
  );
}




