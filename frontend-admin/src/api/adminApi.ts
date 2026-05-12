export const ADMIN_API_BASE = "http://localhost:5051/admin/api";

export async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("admin_token") || "";
  const headers = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
    ...(token ? { "X-Admin-Token": token } : {}),
  };
  const res = await fetch(`${ADMIN_API_BASE}${path}`, { ...options, headers });
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

export function getAdminToken() {
  return localStorage.getItem("admin_token") || "";
}

export function buildTrackAudioUrl(trackId: string) {
  const token = encodeURIComponent(getAdminToken());
  return `${ADMIN_API_BASE}/media/track/${encodeURIComponent(trackId)}/audio?token=${token}`;
}

export function buildCoverUrl(staticPath: string | null | undefined) {
  if (!staticPath) return "";
  const token = encodeURIComponent(getAdminToken());
  return `${ADMIN_API_BASE}/media/cover?path=${encodeURIComponent(staticPath)}&token=${token}`;
}
