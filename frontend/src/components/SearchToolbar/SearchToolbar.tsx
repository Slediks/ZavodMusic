import styles from "./SearchToolbar.module.css";
import { UiIcon } from "../UiIcon/UiIcon";

type SearchToolbarProps = {
  hint: string;
  value: string;
  onValueChange: (next: string) => void;
  onEnter?: () => void;
  onClear?: () => void;
  placeholder?: string;
  limit?: number;
  limitOptions?: number[];
  onLimitChange?: (next: number) => void;
};

export function SearchToolbar({
  hint,
  value,
  onValueChange,
  onEnter,
  onClear,
  placeholder = "Начать поиск...",
  limit,
  limitOptions,
  onLimitChange
}: SearchToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.searchBox}>
        <p className={styles.searchHint}>{hint}</p>
        <div className={styles.searchInputWrap}>
          <input
            className={styles.searchInput}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === "Enter") onEnter?.();
            }}
          />
          {value && onClear ? (
            <button type="button" className={`ui-icon-btn ${styles.clearBtn}`} onClick={onClear} aria-label="Очистить">
              <UiIcon name="backspace" />
            </button>
          ) : null}
        </div>
      </div>

      {typeof limit === "number" && limitOptions?.length && onLimitChange ? (
        <label className={styles.toolbarLabel}>
          Показывать:
          <select
            className={styles.toolbarSelect}
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
          >
            {limitOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}




