import React, { useMemo, useState } from "react";
import { api } from "../api/adminApi";
import type { AnyEntity } from "../types";
import styles from "./SmartPage.module.css";

function summary(kind: string, obj: AnyEntity) {
  if (kind === "tracks") return [`${obj.title || ""}`, `${(obj.artistNames || []).join(", ")}`, `album: ${obj.albumTitle || "-"}`, `duration: ${obj.duration || 0}s`];
  if (kind === "albums") return [`${obj.title || ""}`, `${(obj.artistNames || []).join(", ")}`, `cover: ${obj.coverUrl || "-"}`];
  return [`${obj.name || ""}`, `cover: ${obj.coverUrl || "-"}`];
}

function renderValue(value: any): string {
  if (value == null) return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ObjectView({ obj }: { obj: AnyEntity }) {
  const entries = Object.entries(obj).filter(([k]) => !["lyrics"].includes(k));
  return <div className={styles.entityView}>{entries.map(([k, v]) => <div key={k} className={styles.fieldRow}><span className={styles.fieldKey}>{k}</span><span>{renderValue(v)}</span></div>)}</div>;
}

export function SmartPage() {
  const [kind, setKind] = useState("tracks");
  const [pair, setPair] = useState<AnyEntity[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [statusText, setStatusText] = useState("");

  const load = async () => {
    setIsLoading(true);
    setStopRequested(false);
    setStatusText("");
    try {
      const res = await api(`/smart-search/${kind}/next`);
      setPair(res.pair);
      setScore(res.score ?? null);
      if (res.stopped) {
        setStatusText("Поиск безопасно остановлен.");
      }
    } finally {
      setIsLoading(false);
      setStopRequested(false);
    }
  };

  const stop = async () => {
    if (!isLoading) return;
    setStopRequested(true);
    await api(`/smart-search/${kind}/stop`, { method: "POST" });
    setStatusText("Остановка запрошена. Ждем завершения текущего шага...");
  };

  const ignore = async () => {
    if (!pair) return;
    await api(`/smart-search/${kind}/ignore-pair`, { method: "POST", body: JSON.stringify({ leftId: pair[0].id, rightId: pair[1].id }) });
    setPair(null);
  };

  const exclude = async (sourceId: string, targetId: string) => {
    await api(`/smart-search/${kind}/safe-remove`, { method: "POST", body: JSON.stringify({ sourceId, targetId }) });
    setPair(null);
  };

  const compact = useMemo(() => pair ? [summary(kind, pair[0]), summary(kind, pair[1])] : null, [pair, kind]);

  return (
    <section className={styles.page}>
      <header className={styles.head}>
        <div>
          <h3>Умный поиск дублей</h3>
          <p>Модуль подбирает похожие сущности, чтобы вы быстро чистили дубликаты.</p>
        </div>
        <div className={styles.controls}>
          <select className={styles.input} value={kind} onChange={(e) => setKind(e.target.value)} disabled={isLoading}>
            <option value="tracks">Треки</option>
            <option value="albums">Альбомы</option>
            <option value="artists">Авторы</option>
          </select>
          <button className={styles.button} onClick={load} disabled={isLoading}>{isLoading ? "Ищем..." : "Подобрать пару"}</button>
          {isLoading && <button className={styles.danger} onClick={stop} disabled={stopRequested}>{stopRequested ? "Останавливаем..." : "Остановить поиск"}</button>}
        </div>
      </header>

      {statusText && <p className={styles.info}>{statusText}</p>}

      {!pair ? (
        <div className={styles.empty}>Пара не найдена или уже обработана.</div>
      ) : (
        <>
          <div className={styles.summaryGrid}>
            <article className={styles.summaryCard}>{compact?.[0].map((line) => <p key={line}>{line}</p>)}</article>
            <article className={styles.summaryCard}>{compact?.[1].map((line) => <p key={line}>{line}</p>)}</article>
          </div>

          <div className={styles.compareGrid}>
            <section className={styles.card}><ObjectView obj={pair[0]} /></section>
            <section className={styles.card}><ObjectView obj={pair[1]} /></section>
          </div>

          <div className={styles.actions}>
            <button className={styles.danger} onClick={() => exclude(pair[0].id, pair[1].id)}>Удалить левый в пользу правого</button>
            <button className={styles.danger} onClick={() => exclude(pair[1].id, pair[0].id)}>Удалить правый в пользу левого</button>
            <button className={styles.button} onClick={ignore}>Игнорировать пару</button>
            {score != null && <span className={styles.score}>Score: {score}</span>}
          </div>
        </>
      )}
    </section>
  );
}
