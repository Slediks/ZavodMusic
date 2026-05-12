export async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("admin_token") || "";
  const headers = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
    ...(token ? { "X-Admin-Token": token } : {}),
  };
  const res = await fetch(`http://localhost:5051/admin/api${path}`, { ...options, headers });
  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/tracks";
  return raw.startsWith("/") ? raw : `/${raw}`;
}

export function toLabel(item: Record<string, any>, type: string) {
  if (!item) return "";
  if (type === "tracks") return `${item.title} (${(item.artistNames || []).join(", ")})`;
  if (type === "albums") return `${item.title} (${(item.artistNames || []).join(", ")})`;
  if (type === "artists") return item.name;
  if (type === "playlists") return item.title;
  if (type === "users") return item.login;
  return item.id;
}
