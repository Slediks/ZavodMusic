import { request } from "./client";
import type { PaginatedResponse } from "../types/pagination";
import type { Track } from "../types/track";
import type { User } from "../types/user";
import { enrichTrackListMedia } from "./trackMedia";

type TrackQuery = {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

const q = (params: TrackQuery) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return search.toString() ? `?${search.toString()}` : "";
};

export const tracksApi = {
  getAll: async (params: TrackQuery) => {
    const response = await request<PaginatedResponse<Track>>(`/api/tracks${q(params)}`);
    return { ...response, items: enrichTrackListMedia(response.items) };
  },
  getFavorites: async (params: TrackQuery) => {
    const response = await request<PaginatedResponse<Track>>(`/api/tracks/favorites${q(params)}`);
    return { ...response, items: enrichTrackListMedia(response.items) };
  },
  like: (id: string) => request<User>(`/api/tracks/${id}/like`, { method: "POST" }),
  unlike: (id: string) => request<User>(`/api/tracks/${id}/like`, { method: "DELETE" }),
  dislike: (id: string) => request<User>(`/api/tracks/${id}/dislike`, { method: "POST" }),
  undislike: (id: string) => request<User>(`/api/tracks/${id}/dislike`, { method: "DELETE" }),
};


