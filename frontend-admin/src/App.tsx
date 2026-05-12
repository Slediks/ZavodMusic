import React, { useEffect, useState } from "react";
import { parseHash } from "./api/adminApi";
import { CrudPage } from "./components/CrudPage";
import { Login } from "./components/Login";
import { ScanPage } from "./pages/ScanPage";
import { SmartPage } from "./pages/SmartPage";

const NAV: [string, string][] = [
  ["/tracks", "Треки"],
  ["/albums", "Альбомы"],
  ["/artists", "Авторы"],
  ["/playlists", "Плейлисты"],
  ["/users", "Пользователи"],
  ["/smart", "Умный поиск"],
  ["/scan", "Сканирование"],
];

export default function App() {
  const [authed, setAuthed] = useState(Boolean(localStorage.getItem("admin_token")));
  const [path, setPath] = useState(parseHash());

  useEffect(() => {
    const onHash = () => setPath(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  return <div className="app"><aside className="sidebar"><h1>Zavod Admin</h1>{NAV.map(([href,label])=><a key={href} href={`#${href}`} className={path===href?"nav active":"nav"}>{label}</a>)}<button onClick={()=>{ localStorage.removeItem("admin_token"); setAuthed(false); }}>Выйти</button></aside>
    <main className="content">
      {path === "/tracks" && <CrudPage type="tracks" title="Треки" createEnabled={false} quickDisable />}
      {path === "/albums" && <CrudPage type="albums" title="Альбомы" />}
      {path === "/artists" && <CrudPage type="artists" title="Авторы" />}
      {path === "/playlists" && <CrudPage type="playlists" title="Плейлисты" createEnabled={false} readonlyTrackIds />}
      {path === "/users" && <CrudPage type="users" title="Пользователи" />}
      {path === "/smart" && <SmartPage />}
      {path === "/scan" && <ScanPage />}
    </main>
  </div>;
}
