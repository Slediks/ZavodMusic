import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/adminApi";
import type { AnyEntity } from "../types";
import styles from "./ScanPage.module.css";

function renderValue(value: any): string {
  if (value == null) return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ScanPage() {
  const [state, setState] = useState<AnyEntity | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const load = () => api("/scan/status").then(setState).catch(() => {});

  useEffect(() => {
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, []);

  const start = async () => {
    await api("/scan/start", { method: "POST" });
    load();
  };

  const stop = async () => {
    setIsStopping(true);
    try {
      await api("/scan/stop", { method: "POST" });
      await load();
    } finally {
      setIsStopping(false);
    }
  };

  const pct = useMemo(() => !state?.totalFiles ? 0 : Math.round((state.processedFiles / state.totalFiles) * 100), [state]);

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <div>
          <h3>Индексация медиатеки</h3>
          <p>Фоновая операция сканирует файлы и обновляет данные каталога.</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.button} onClick={start} disabled={state?.running}>Запустить</button>
          {state?.running && <button className={styles.danger} onClick={stop} disabled={isStopping || state?.stopRequested}>{state?.stopRequested ? "Останавливаем..." : isStopping ? "Останавливаем..." : "Безопасно остановить"}</button>}
        </div>
      </header>

      <div className={styles.statsGrid}>
        <article className={styles.stat}><span>Статус</span><strong>{state?.running ? "Выполняется" : state?.stopped ? "Остановлено" : "Ожидание"}</strong></article>
        <article className={styles.stat}><span>Обработано</span><strong>{state?.processedFiles || 0} / {state?.totalFiles || 0}</strong></article>
        <article className={styles.stat}><span>Время</span><strong>{state?.elapsedSec || 0} сек</strong></article>
        <article className={styles.stat}><span>ETA</span><strong>{state?.etaSec ?? "-"} сек</strong></article>
      </div>

      {state?.stopRequested && state?.running && <p className={styles.info}>Остановка запрошена. Завершаем текущий шаг и сохраняем уже обработанные данные.</p>}
      {state?.stopped && !state?.running && <p className={styles.info}>Сканирование безопасно остановлено. Уже обработанные данные сохранены.</p>}

      <div className={styles.progressWrap}><div className={styles.progress} style={{ width: `${pct}%` }} /></div>

      {state?.result && (
        <div className={styles.resultGrid}>
          {Object.entries(state.result).map(([k, v]) => (
            <div key={k} className={styles.row}><span>{k}</span><strong>{renderValue(v)}</strong></div>
          ))}
        </div>
      )}
      {state?.error && <p className={styles.error}>{state.error}</p>}
    </section>
  );
}
