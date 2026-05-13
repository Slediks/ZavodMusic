import React from "react";
import { buildCoverUrl } from "../../../api/adminApi";
import type { AnyEntity, PagedResponse } from "../../../types";
import { listLine } from "../shared/crudHelpers";
import styles from "../CrudPage.module.css";

type Props = {
  type: string;
  title: string;
  createEnabled: boolean;
  list: PagedResponse;
  search: string;
  page: number;
  selectedId: string;
  err: string;
  playingTrackId: string | null;
  onSearchChange: (v: string) => void;
  onSearchSubmit: () => void;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onToggleTrack: (item: AnyEntity) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
};

export function ListPane(props: Props) {
  const {
    type,
    title,
    createEnabled,
    list,
    search,
    page,
    selectedId,
    err,
    playingTrackId,
    onSearchChange,
    onSearchSubmit,
    onCreate,
    onSelect,
    onToggleTrack,
    onPrevPage,
    onNextPage,
  } = props;

  return (
    <div className={styles.columnList}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          <p className={styles.meta}>Всего: {list.total}</p>
        </div>
        {createEnabled && <button className={styles.btnPrimary} onClick={onCreate}>+ Создать</button>}
      </div>

      <div className={styles.searchBar}>
        <input className={styles.input} value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="Поиск по ID / названию" />
        <button className={styles.btn} onClick={onSearchSubmit}>Найти</button>
      </div>

      <div className={styles.listWrap}>
        {list.items.map((item) => (
          <article key={item.id} className={selectedId === item.id ? `${styles.listItem} ${styles.listItemActive}` : styles.listItem}>
            <button className={styles.listMain} onClick={() => onSelect(item.id)}>
              {item.coverUrl ? <img className={styles.coverMini} src={buildCoverUrl(item.coverUrl)} alt="cover" /> : <span className={`${styles.coverMini} ${styles.coverStub}`} />}
              <span>{listLine(type, item)}</span>
            </button>
            {type === "tracks" && item.audioUrl && <button className={styles.btn} onClick={() => onToggleTrack(item)}>{playingTrackId === item.id ? "Пауза" : "Плей"}</button>}
          </article>
        ))}
      </div>

      <footer className={styles.pagination}>
        <button className={styles.btn} disabled={page <= 1} onClick={onPrevPage}>Назад</button>
        <span className={styles.pageText}>{page} / {Math.max(1, list.pages || 1)}</span>
        <button className={styles.btn} disabled={page >= (list.pages || 1)} onClick={onNextPage}>Вперед</button>
      </footer>

      {err && <p className={styles.error}>{err}</p>}
    </div>
  );
}
