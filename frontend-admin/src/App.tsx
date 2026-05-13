import React, { useEffect, useState } from "react";
import { parseHash } from "./api/adminApi";
import { CrudPage } from "./components/crud/CrudPage";
import { AppLayout } from "./components/layout/AppLayout";
import { Login } from "./components/ui/Login";
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
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("admin-unauthorized", onUnauthorized);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("admin-unauthorized", onUnauthorized);
    };
  }, []);

  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const page =
    path === "/tracks" ? <CrudPage type="tracks" title="Треки" createEnabled={false} quickDisable /> :
    path === "/albums" ? <CrudPage type="albums" title="Альбомы" /> :
    path === "/artists" ? <CrudPage type="artists" title="Авторы" /> :
    path === "/playlists" ? <CrudPage type="playlists" title="Плейлисты" createEnabled={false} readonlyTrackIds /> :
    path === "/users" ? <CrudPage type="users" title="Пользователи" /> :
    path === "/smart" ? <SmartPage /> :
    <ScanPage />;

  return <AppLayout nav={NAV} path={path} onLogout={() => { localStorage.removeItem("admin_token"); setAuthed(false); }}>{page}</AppLayout>;
}

