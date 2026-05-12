import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/adminApi";
import type { AnyEntity } from "../types";

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
  return <div className="entity-view">{entries.map(([k, v]) => <div key={k} className="field-row"><span className="field-key">{k}</span><span className="field-val">{renderValue(v)}</span></div>)}</div>;
}

export function SmartPage() {
  const [kind, setKind] = useState("tracks");
  const [pair, setPair] = useState<AnyEntity[] | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await api(`/smart-search/${kind}/next`);
      setPair(res.pair);
      setScore(res.score ?? null);
    } finally {
      setIsLoading(false);
    }
  };

  const ignore = async () => { if (pair) { await api(`/smart-search/${kind}/ignore-pair`, { method: "POST", body: JSON.stringify({ leftId: pair[0].id, rightId: pair[1].id }) }); setPair(null); } };
  const exclude = async (id: string) => { await api(`/smart-search/${kind}/exclude-id`, { method: "POST", body: JSON.stringify({ id }) }); setPair(null); };

  const compact = useMemo(() => pair ? [summary(kind, pair[0]), summary(kind, pair[1])] : null, [pair, kind]);

  return <section className="card"><h2>Умный поиск</h2><div className="row"><select value={kind} onChange={(e)=>setKind(e.target.value)}><option value="tracks">Треки</option><option value="albums">Альбомы</option><option value="artists">Авторы</option></select><button onClick={load} disabled={isLoading}>{isLoading ? "Загрузка..." : "Загрузить дубликаты"}</button>{isLoading && <span className="loader" />}</div>
    {!pair ? <p>{isLoading ? "Ищем дубликаты..." : "Пара не найдена или уже обработана"}</p> : <>
      <div className="grid2">
        <div className="card subcard">{compact?.[0].map((line)=> <div key={line}>{line}</div>)}</div>
        <div className="card subcard">{compact?.[1].map((line)=> <div key={line}>{line}</div>)}</div>
      </div>
      <div className="grid2">
        <div className="card subcard"><ObjectView obj={pair[0]} /></div>
        <div className="card subcard"><ObjectView obj={pair[1]} /></div>
      </div>
    </>}
    {score != null && <p>Score: {score}</p>}
    {pair && <div className="row"><button onClick={()=>exclude(pair[1].id)}>Удалить дубликат (исключить ID)</button><button onClick={ignore}>Игнорировать пару</button></div>}
  </section>;
}
