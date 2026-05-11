import { request } from "./client";
import type { PaginatedResponse } from "../types/pagination";
import type { Album, AlbumDetail } from "../types/album";
import type { Track } from "../types/track";
import { enrichTrackListMedia } from "./trackMedia";
import { enrichAlbumListMedia, enrichAlbumMedia } from "./entityMedia";

const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return search.toString() ? `?${search.toString()}` : "";
};

export const albumsApi = {
  getAll: async (params: { search?: string; page?: number; limit?: number }) => {
    const response = await request<PaginatedResponse<Album>>(`/api/albums${q(params)}`);
    return { ...response, items: enrichAlbumListMedia(response.items) };
  },
  getById: async (id: string) => {
    const response = await request<AlbumDetail>(`/api/albums/${id}`);
    return enrichAlbumMedia(response);
  },
  getTracks: async (id: string, params: { search?: string; page?: number; limit?: number }) => {
    const response = await request<PaginatedResponse<Track>>(`/api/albums/${id}/tracks${q(params)}`);
    return { ...response, items: enrichTrackListMedia(response.items) };
  },
};


