import React, { useEffect, useState } from "react";
import { api } from "../../../api/adminApi";
import styles from "../CrudPage.module.css";

export function SelectorField({ endpoint, values, onChange, multiple = false }: { endpoint: string; values: any; onChange: (v: any) => void; multiple?: boolean }) {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<any[]>([]);

  useEffect(() => {
    api(`/select/${endpoint}?q=${encodeURIComponent(q)}`).then(setOptions).catch(() => {});
  }, [endpoint, q]);

  const add = (id: string) => {
    if (!id) return;
    if (multiple) onChange(Array.from(new Set([...(values || []), id])));
    else onChange(id);
  };

  return (
    <div className={styles.selectorField}>
      <input className={styles.input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по ID / названию" />
      <select className={styles.input} value="" onChange={(e) => add(e.target.value)}>
        <option value="">Выбрать</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
      {multiple ? (
        <div className={styles.tagsWrap}>
          {(values || []).map((v: string) => (
            <span key={v} className={styles.tag}>
              {v}
              <button type="button" className={styles.tagRemove} onClick={() => onChange((values || []).filter((x: string) => x !== v))}>x</button>
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.smallMeta}>{values || ""}</div>
      )}
    </div>
  );
}
