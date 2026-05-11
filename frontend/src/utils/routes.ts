import type { AppRoute } from "../types/router";

export const ROUTES: AppRoute[] = [
  { path: "/", title: "Все треки", protected: false },
  { path: "/favorites", title: "Избранные треки", protected: true },
  { path: "/playlists/my", title: "Мои плейлисты", protected: true },
  { path: "/playlists/public", title: "Публичные плейлисты", protected: true },
  { path: "/playlists/:id", title: "Плейлист", protected: true },
  { path: "/artists", title: "Исполнители", protected: false },
  { path: "/artists/:id", title: "Исполнитель", protected: false },
  { path: "/albums", title: "Альбомы", protected: false },
  { path: "/albums/:id", title: "Альбом", protected: false },
];

export const PUBLIC_NAV_LINKS = [
  { path: "/", label: "Все треки" },
  { path: "/artists", label: "Исполнители" },
  { path: "/albums", label: "Альбомы" },
];

export const AUTH_NAV_LINKS = [
  ...PUBLIC_NAV_LINKS,
  { path: "/favorites", label: "Избранные" },
  { path: "/playlists/my", label: "Мои плейлисты" },
  { path: "/playlists/public", label: "Публичные плейлисты" },
];

const normalize = (path: string): string => {
  if (!path) return "/";
  const clean = path.split("?")[0].split("#")[0] || "/";
  return clean !== "/" && clean.endsWith("/") ? clean.slice(0, -1) : clean;
};

export const matchRoute = (pathname: string): AppRoute | null => {
  const normalizedPath = normalize(pathname);
  for (const route of ROUTES) {
    const pattern = "^" + route.path.replace(/:[^/]+/g, "[^/]+") + "$";
    if (new RegExp(pattern).test(normalizedPath)) {
      return route;
    }
  }
  return null;
};


