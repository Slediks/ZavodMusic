import React from "react";
import { buildCoverUrl, buildTrackAudioUrl } from "../../../api/adminApi";
import type { AnyEntity } from "../../../types";
import { renderValue } from "../shared/crudHelpers";
import styles from "../CrudPage.module.css";

type Props = {
  type: string;
  entity: AnyEntity | null;
  quickDisable: boolean;
  onEdit: () => void;
  onQuickDisable: () => void;
};

export function DetailsPane({ type, entity, quickDisable, onEdit, onQuickDisable }: Props) {
  if (!entity) return <div className={styles.columnDetails}><div className={styles.emptyState}>Выберите объект слева, чтобы посмотреть детали.</div></div>;

  return (
    <div className={styles.columnDetails}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.title}>Карточка объекта</h3>
          <p className={styles.meta}>ID: {entity.id}</p>
        </div>
        <div className={styles.actionRow}>
          <button className={styles.btnPrimary} onClick={onEdit}>Редактировать</button>
          {quickDisable && <button className={styles.btn} onClick={onQuickDisable}>{entity.disabledManually ? "Включить" : "Отключить"}</button>}
        </div>
      </div>

      {entity.coverUrl && <img className={styles.coverLarge} src={buildCoverUrl(entity.coverUrl)} alt="cover" />}
      {type === "tracks" && entity.id && <audio className={styles.player} controls src={buildTrackAudioUrl(entity.id)} />}

      <div className={styles.fieldsGrid}>
        {Object.entries(entity).map(([k, v]) => (
          <div className={styles.fieldRow} key={k}>
            <span className={styles.fieldKey}>{k}</span>
            <span className={styles.fieldVal}>{renderValue(v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
