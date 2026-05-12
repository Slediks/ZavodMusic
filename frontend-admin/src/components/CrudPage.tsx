import React, { useEffect, useRef, useState } from "react";
import { api, buildCoverUrl, buildTrackAudioUrl } from "../api/adminApi";
import type { AnyEntity, PagedResponse } from "../types";

function Selector({ endpoint, values, onChange, multiple = false }: { endpoint: string; values: any; onChange: (v: any) => void; multiple?: boolean }) {
  const [q, setQ] = useState("");
  const [options, setOptions] = useState<any[]>([]);
  useEffect(() => { api(`/select/${endpoint}?q=${encodeURIComponent(q)}`).then(setOptions).catch(()=>{}); }, [q, endpoint]);

  const add = (id: string) => {
    if (!id) return;
    if (multiple) onChange(Array.from(new Set([...(values || []), id])));
    else onChange(id);
  };

  return <div className="selector"><input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Поиск..."/>
    <select onChange={(e)=>add(e.target.value)} value=""><option value="">Выбрать</option>{options.map((o)=><option key={o.id} value={o.id}>{o.label}</option>)}</select>
    {multiple ? <div className="chips">{(values || []).map((v: string)=><span key={v} className="chip">{v}<button type="button" onClick={()=>onChange((values||[]).filter((x: string)=>x!==v))}>x</button></span>)}</div> : <small>{values || "-"}</small>}
  </div>;
}

function quickPreviewText(type: string, item: AnyEntity): string[] {
  if (type === "tracks") return [`ID: ${item.id}`, `Title: ${item.title || ""}`, `Artists: ${(item.artistNames || []).join(", ")}`, `Album: ${item.albumTitle || ""}`, `Duration: ${item.duration || 0}s`, `Missing: ${item.missingFile ? "yes" : "no"}`, `Disabled: ${item.disabledManually ? "yes" : "no"}`];
  if (type === "albums") return [`ID: ${item.id}`, `Title: ${item.title || ""}`, `Authors: ${(item.artistNames || []).join(", ")}`, `Cover: ${item.coverUrl || "-"}`];
  if (type === "artists") return [`ID: ${item.id}`, `Name: ${item.name || ""}`, `Cover: ${item.coverUrl || "-"}`];
  if (type === "playlists") return [`ID: ${item.id}`, `Title: ${item.title || ""}`, `Owner: ${item.ownerLogin || "-"}`, `Public: ${item.isPublic ? "yes" : "no"}`, `Tracks: ${(item.trackIds || []).length}`];
  return [`ID: ${item.id}`, `Login: ${item.login || ""}`, `Liked tracks: ${(item.likedTrackIds || []).length}`, `Disliked tracks: ${(item.dislikedTrackIds || []).length}`, `Liked playlists: ${(item.likedPlaylistIds || []).length}`];
}

function renderEntityLabel(entity: AnyEntity): string {
  if (!entity || typeof entity !== "object") return String(entity ?? "-");
  const id = entity.id ? String(entity.id) : "?";
  const title = entity.title || entity.name || entity.login || entity.albumTitle || entity.trackTitle || "";
  return title ? `${id} · ${title}` : id;
}

function renderValue(value: any): string {
  if (value == null) return "-";
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    if (value.every((item) => item && typeof item === "object")) {
      return value.map((item) => renderEntityLabel(item)).join(", ");
    }
    return value.join(", ");
  }
  if (typeof value === "object") return renderEntityLabel(value);
  return String(value);
}

function trackLineTitle(item: AnyEntity): string {
  const badges: string[] = [];
  if (item.missingFile) badges.push("[missing]");
  if (item.disabledManually) badges.push("[disabled]");
  const prefix = badges.length > 0 ? `${badges.join(" ")} ` : "";
  return `${prefix}${item.id} · ${item.title || item.name || item.login}`;
}

export function CrudPage({ type, title, createEnabled = true, quickDisable = false, readonlyTrackIds = false }: { type: string; title: string; createEnabled?: boolean; quickDisable?: boolean; readonlyTrackIds?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<PagedResponse>({ items: [], total: 0, pages: 0 });
  const [selectedId, setSelectedId] = useState("");
  const [entity, setEntity] = useState<AnyEntity | null>(null);
  const [draft, setDraft] = useState<AnyEntity | null>(null);
  const [edit, setEdit] = useState(false);
  const [err, setErr] = useState("");
  const [hovered, setHovered] = useState<AnyEntity | null>(null);
  const [popover, setPopover] = useState<{ x: number; y: number; lines: string[] } | null>(null);
  const [deleteForm, setDeleteForm] = useState<AnyEntity>({});
  const [artistTrackAssignMode, setArtistTrackAssignMode] = useState<"add" | "replace">("add");
  const [albumTrackAssignMode, setAlbumTrackAssignMode] = useState<"move" | "add">("move");
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const loadList = () => api(`/${type}?search=${encodeURIComponent(search)}&page=${page}`).then(setList).catch((e)=>setErr(e.message));
  useEffect(() => { loadList(); }, [type, search, page]);
  useEffect(() => { if (selectedId) api(`/${type}/${selectedId}`).then((d) => { setEntity(d); setDraft(structuredClone(d)); setEdit(false); }).catch((e)=>setErr(e.message)); }, [type, selectedId]);

  const save = async () => {
    const payload = structuredClone(draft || {});
    if (type === "artists") payload.trackAssignMode = artistTrackAssignMode;
    if (type === "albums") payload.trackAssignMode = albumTrackAssignMode;
    await api(`/${type}/${selectedId}`, { method: "PUT", body: JSON.stringify(payload) });
    setEdit(false);
    await loadList();
    const d = await api(`/${type}/${selectedId}`);
    setEntity(d); setDraft(structuredClone(d));
  };

  const saveArtistWithMode = async (mode: "add" | "replace") => {
    const payload = structuredClone(draft || {});
    payload.trackAssignMode = mode;
    await api(`/artists/${selectedId}`, { method: "PUT", body: JSON.stringify(payload) });
    setEdit(false);
    await loadList();
    const d = await api(`/artists/${selectedId}`);
    setEntity(d); setDraft(structuredClone(d));
  };

  const saveAlbumWithMode = async (mode: "move" | "add") => {
    const payload = structuredClone(draft || {});
    payload.trackAssignMode = mode;
    await api(`/albums/${selectedId}`, { method: "PUT", body: JSON.stringify(payload) });
    setEdit(false);
    await loadList();
    const d = await api(`/albums/${selectedId}`);
    setEntity(d); setDraft(structuredClone(d));
  };

  const remove = async () => {
    if (!confirm("Подтвердите удаление")) return;
    const payload: AnyEntity = {};
    if (type === "albums") { payload.reassignAlbumId = deleteForm.reassignAlbumId || null; payload.reassignAlbumTitle = (deleteForm.reassignAlbumTitle || "").trim() || null; payload.newAlbumArtistId = deleteForm.newAlbumArtistId || null; payload.newAlbumArtistName = (deleteForm.newAlbumArtistName || "").trim() || null; }
    if (type === "artists") { payload.reassignArtistId = deleteForm.reassignArtistId || null; payload.reassignArtistName = (deleteForm.reassignArtistName || "").trim() || null; }
    if (type === "users") { payload.reassignPlaylistOwnerId = deleteForm.reassignPlaylistOwnerId || null; payload.reassignPlaylistOwnerLogin = (deleteForm.reassignPlaylistOwnerLogin || "").trim() || null; }
    await api(`/${type}/${selectedId}`, { method: "DELETE", body: JSON.stringify(payload) });
    setSelectedId(""); setEntity(null); setDraft(null); await loadList();
  };

  const createNew = async () => {
    const body = type === "users" ? { login: prompt("Логин", "new-user") || "new-user" } : type === "artists" ? { name: prompt("Имя автора", "New Artist") || "New Artist" } : { title: prompt("Название", "New") || "New" };
    const created = await api(`/${type}`, { method: "POST", body: JSON.stringify(body) });
    await loadList();
    setSelectedId(created.id);
  };

  const playTrackFromList = (track: AnyEntity) => {
    if (type !== "tracks" || !track?.audioUrl) return;
    const src = buildTrackAudioUrl(track.id);
    if (previewAudioRef.current && previewAudioRef.current.src === src && !previewAudioRef.current.paused) {
      previewAudioRef.current.pause();
      setPlayingTrackId(null);
      return;
    }
    if (previewAudioRef.current) previewAudioRef.current.pause();
    const audio = new Audio(src);
    previewAudioRef.current = audio;
    setPlayingTrackId(track.id);
    void audio.play().catch(() => setPlayingTrackId(null));
    audio.onended = () => setPlayingTrackId(null);
    audio.onpause = () => setPlayingTrackId((current) => (current === track.id ? null : current));
  };

  const active = edit ? draft : entity;
  const hiddenEditKeys = new Set([
    "tracks",
    "albums",
    "likedTracks",
    "dislikedTracks",
    "likedPlaylists",
    "createdPlaylists",
  ]);

  return <div className="grid2">
    <section className="card"><h2>{title}</h2><div className="row"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Поиск"/><button onClick={()=>setPage(1)}>Найти</button>{createEnabled && <button onClick={createNew}>Создать</button>}</div>
      <div className="list">{list.items.map((i)=><div key={i.id} className={selectedId===i.id?"item active item-row":"item item-row"} onMouseEnter={(e)=>{ setHovered(i); const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); setPopover({ x: rect.right + 8, y: rect.top, lines: quickPreviewText(type, i) }); }} onMouseLeave={()=>{ setHovered((old)=>old?.id===i.id?null:old); setPopover(null); }}><button className="item-main" onClick={()=>setSelectedId(i.id)}>{i.coverUrl ? <img className="thumb" src={buildCoverUrl(i.coverUrl)} alt="" /> : <span className="thumb empty" />}<span>{type === "tracks" ? trackLineTitle(i) : `${i.id} · ${i.title || i.name || i.login}`}</span></button>{type === "tracks" && <button className="item-play" onClick={()=>playTrackFromList(i)}>{playingTrackId===i.id?"⏸":"▶"}</button>}</div>)}</div>
      {hovered && popover && <div className="popover floating" style={{ left: `${popover.x}px`, top: `${popover.y}px` }}>{popover.lines.map((line) => <div key={line}>{line}</div>)}</div>}
      <div className="row"><button disabled={page<=1} onClick={()=>setPage((p)=>p-1)}>Назад</button><span>{page}/{Math.max(1, list.pages||1)} · всего {list.total}</span><button disabled={page>=(list.pages||1)} onClick={()=>setPage((p)=>p+1)}>Вперед</button></div>
      {err && <p className="error">{err}</p>}
    </section>

    <section className="card">{!active ? <p>Выберите объект</p> : <>
      <div className="row"><h3>{active.id}</h3><button onClick={()=>setEdit((x)=>!x)}>{edit?"Отмена ред." : "Редактировать"}</button>{quickDisable && <button onClick={async()=>{await api(`/tracks/${active.id}/quick-disable`,{method:"PATCH", body: JSON.stringify({disabledManually: !active.disabledManually})}); const d=await api(`/tracks/${active.id}`);setEntity(d);setDraft(structuredClone(d)); await loadList();}}>{active.disabledManually?"Включить":"Отключить"}</button>}{edit && <button onClick={save}>Сохранить</button>}{edit && type === "artists" && <button onClick={()=>saveArtistWithMode("add")}>Сохранить как add</button>}{edit && type === "artists" && <button onClick={()=>saveArtistWithMode("replace")}>Сохранить как replace</button>}{edit && type === "albums" && <button onClick={()=>saveAlbumWithMode("move")}>Сохранить как перенести</button>}{edit && type === "albums" && <button onClick={()=>saveAlbumWithMode("add")}>Сохранить как добавить</button>}{edit && <button onClick={()=>{setDraft(structuredClone(entity));setEdit(false);}}>Отмена</button>}{edit && <button onClick={remove}>Удалить</button>}</div>
      {active.coverUrl && <img className="cover-preview" src={buildCoverUrl(active.coverUrl)} alt="cover" />}
      <div className="entity-view">
        {Object.entries(active).map(([k, v]) => <div key={k} className="field-row"><span className="field-key">{k}</span><span className="field-val">{renderValue(v)}</span></div>)}
      </div>
      {type === "tracks" && active.id && <audio controls src={buildTrackAudioUrl(active.id)} />}
      {edit && type === "artists" && <div className="row"><label>Режим добавления треков автору:</label><select value={artistTrackAssignMode} onChange={(e)=>setArtistTrackAssignMode(e.target.value as "add" | "replace")}><option value="add">add (добавить автора к треку)</option><option value="replace">replace (заменить всех авторов у трека)</option></select></div>}
      {edit && type === "albums" && <div className="row"><label>Режим назначения треков альбому:</label><select value={albumTrackAssignMode} onChange={(e)=>setAlbumTrackAssignMode(e.target.value as "move" | "add")}><option value="move">move (перенести трек в этот альбом)</option><option value="add">add (добавить только треки без альбома)</option></select></div>}
      {edit && <div className="edit-grid">
        {Object.entries(draft || {}).filter(([k, v])=>{
          if (["id","audioUrl","missingFile"].includes(k)) return false;
          if (hiddenEditKeys.has(k)) return false;
          if (v && typeof v === "object" && !Array.isArray(v)) return false;
          if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") return false;
          return true;
        }).map(([k,v]) => {
          if (Array.isArray(v) && (k === "artistIds" || k === "trackIds" || k === "albumIds")) {
            const endpoint = k === "artistIds" ? "artists" : k === "albumIds" ? "albums" : "tracks";
            if (readonlyTrackIds && k === "trackIds") return null;
            return <div key={k}><label>{k}</label><Selector endpoint={endpoint} values={v} onChange={(next)=>setDraft({...draft,[k]:next})} multiple /></div>;
          }
          if (k === "albumId") return <div key={k}><label>{k}</label><Selector endpoint="albums" values={v || ""} onChange={(next)=>setDraft({...draft,[k]:next})} /></div>;
          return <div key={k}><label>{k}</label><input value={v==null?"":String(v)} onChange={(e)=>setDraft({...draft,[k]: e.target.value})} /></div>;
        })}
      </div>}
      {edit && type === "albums" && <div className="card subcard"><h4>Удаление альбома: переназначение треков</h4><Selector endpoint="albums" values={deleteForm.reassignAlbumId || ""} onChange={(v)=>setDeleteForm({...deleteForm,reassignAlbumId:v})} /><input placeholder="или новый альбом (название)" value={deleteForm.reassignAlbumTitle || ""} onChange={(e)=>setDeleteForm({...deleteForm,reassignAlbumTitle:e.target.value})} /><Selector endpoint="artists" values={deleteForm.newAlbumArtistId || ""} onChange={(v)=>setDeleteForm({...deleteForm,newAlbumArtistId:v})} /><input placeholder="или новый автор для нового альбома" value={deleteForm.newAlbumArtistName || ""} onChange={(e)=>setDeleteForm({...deleteForm,newAlbumArtistName:e.target.value})} /></div>}
      {edit && type === "artists" && <div className="card subcard"><h4>Удаление автора: переназначение</h4><Selector endpoint="artists" values={deleteForm.reassignArtistId || ""} onChange={(v)=>setDeleteForm({...deleteForm,reassignArtistId:v})} /><input placeholder="или новый автор (имя)" value={deleteForm.reassignArtistName || ""} onChange={(e)=>setDeleteForm({...deleteForm,reassignArtistName:e.target.value})} /></div>}
      {edit && type === "users" && <div className="card subcard"><h4>Удаление пользователя: новый владелец плейлистов</h4><Selector endpoint="users" values={deleteForm.reassignPlaylistOwnerId || ""} onChange={(v)=>setDeleteForm({...deleteForm,reassignPlaylistOwnerId:v})} /><input placeholder="или новый пользователь (логин)" value={deleteForm.reassignPlaylistOwnerLogin || ""} onChange={(e)=>setDeleteForm({...deleteForm,reassignPlaylistOwnerLogin:e.target.value})} /></div>}
    </>}</section>
  </div>;
}
