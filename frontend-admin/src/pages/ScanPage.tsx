import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api/adminApi";
import type { AnyEntity } from "../types";

function renderValue(value: any): string {
  if (value == null) return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ScanPage() {
  const [state, setState] = useState<AnyEntity | null>(null);
  const load = () => api("/scan/status").then(setState).catch(()=>{});
  useEffect(() => { load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, []);

  const start = async () => { await api("/scan/start", { method: "POST" }); load(); };
  const pct = useMemo(() => !state?.totalFiles ? 0 : Math.round((state.processedFiles / state.totalFiles) * 100), [state]);

  return <section className="card"><h2>Сканирование</h2><button onClick={start} disabled={state?.running}>Запустить сканирование</button>
    <p>Статус: {state?.running ? "выполняется" : "ожидание"}</p>
    <p>Файлы: {state?.processedFiles || 0} / {state?.totalFiles || 0}</p>
    <p>Прошло: {state?.elapsedSec || 0} сек | ETA: {state?.etaSec ?? "-"} сек</p>
    <div className="progress"><div style={{ width: `${pct}%` }} /></div>
    {state?.result && <div className="entity-view" style={{ marginTop: 10 }}>{Object.entries(state.result).map(([k, v]) => <div key={k} className="field-row"><span className="field-key">{k}</span><span className="field-val">{renderValue(v)}</span></div>)}</div>}
    {state?.error && <p className="error">{state.error}</p>}
  </section>;
}
