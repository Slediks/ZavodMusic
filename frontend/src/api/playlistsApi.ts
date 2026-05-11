import { request } from "./client";
import type { PaginatedResponse } from "../types/pagination";
import type { MyPlaylistsResponse, Playlist, PlaylistDetail } from "../types/playlist";
import type { User } from "../types/user";
import { enrichTrackListMedia } from "./trackMedia";
import { enrichPlaylistListMedia, enrichPlaylistMedia } from "./entityMedia";

const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return search.toString() ? `?${search.toString()}` : "";
};

export const playlistsApi = {
  getMy: async (params: { search?: string; page?: number; limit?: number }) => {
    const response = await request<MyPlaylistsResponse>(`/api/playlists/my${q(params)}`);
    return {
      own: { ...response.own, items: enrichPlaylistListMedia(response.own.items) },
      liked: { ...response.liked, items: enrichPlaylistListMedia(response.liked.items) },
    };
  },
  getPublic: async (params: { search?: string; page?: number; limit?: number }) => {
    const response = await request<PaginatedResponse<Playlist>>(`/api/playlists/public${q(params)}`);
    return { ...response, items: enrichPlaylistListMedia(response.items) };
  },
  getById: async (id: string) => {
    const response = await request<PlaylistDetail>(`/api/playlists/${id}`);
    return { ...enrichPlaylistMedia(response), tracks: enrichTrackListMedia(response.tracks) };
  },
  create: (body: { title: string; description: string; isPublic: boolean }) =>
    request<Playlist>(`/api/playlists`, { method: "POST", body }).then(enrichPlaylistMedia),
  update: (id: string, body: Partial<{ title: string; description: string; isPublic: boolean }>) =>
    request<Playlist>(`/api/playlists/${id}`, { method: "PATCH", body }).then(enrichPlaylistMedia),
  remove: (id: string) => request<{ ok: true }>(`/api/playlists/${id}`, { method: "DELETE" }),
  addTrack: (id: string, trackId: string) =>
    request<Playlist>(`/api/playlists/${id}/tracks`, { method: "POST", body: { trackId } }).then(enrichPlaylistMedia),
  removeTrack: (id: string, trackId: string) =>
    request<Playlist>(`/api/playlists/${id}/tracks/${trackId}`, { method: "DELETE" }).then(enrichPlaylistMedia),
  reorderTracks: (id: string, trackIds: string[]) =>
    request<Playlist>(`/api/playlists/${id}/tracks/reorder`, { method: "PATCH", body: { trackIds } }).then(enrichPlaylistMedia),
  like: (id: string) => request<User>(`/api/playlists/${id}/like`, { method: "POST" }),
  unlike: (id: string) => request<User>(`/api/playlists/${id}/like`, { method: "DELETE" }),
};


