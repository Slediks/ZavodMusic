import { request } from "./client";
import type { PaginatedResponse } from "../types/pagination";
import type { MyPlaylistsResponse, Playlist, PlaylistDetail } from "../types/playlist";
import type { User } from "../types/user";

const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return search.toString() ? `?${search.toString()}` : "";
};

export const playlistsApi = {
  getMy: async (params: { search?: string; page?: number; limit?: number }) => {
    return request<MyPlaylistsResponse>(`/api/playlists/my${q(params)}`);
  },
  getPublic: async (params: { search?: string; page?: number; limit?: number }) => {
    return request<PaginatedResponse<Playlist>>(`/api/playlists/public${q(params)}`);
  },
  getById: async (id: string) => {
    return request<PlaylistDetail>(`/api/playlists/${id}`);
  },
  create: (body: { title: string; description: string; isPublic: boolean }) =>
    request<Playlist>(`/api/playlists`, { method: "POST", body }),
  update: (id: string, body: Partial<{ title: string; description: string; isPublic: boolean }>) =>
    request<Playlist>(`/api/playlists/${id}`, { method: "PATCH", body }),
  remove: (id: string) => request<{ ok: true }>(`/api/playlists/${id}`, { method: "DELETE" }),
  addTrack: (id: string, trackId: string) =>
    request<Playlist>(`/api/playlists/${id}/tracks`, { method: "POST", body: { trackId } }),
  removeTrack: (id: string, trackId: string) =>
    request<Playlist>(`/api/playlists/${id}/tracks/${trackId}`, { method: "DELETE" }),
  reorderTracks: (id: string, trackIds: string[]) =>
    request<Playlist>(`/api/playlists/${id}/tracks/reorder`, {
      method: "PATCH",
      body: { trackIds }
    }),
  like: (id: string) => request<User>(`/api/playlists/${id}/like`, { method: "POST" }),
  unlike: (id: string) => request<User>(`/api/playlists/${id}/like`, { method: "DELETE" }),
};


