import { request } from "./client";
import type { PaginatedResponse } from "../types/pagination";
import type { Album, AlbumDetail } from "../types/album";
import type { Track } from "../types/track";

const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return search.toString() ? `?${search.toString()}` : "";
};

export const albumsApi = {
  getAll: async (params: { search?: string; page?: number; limit?: number }) => {
    return request<PaginatedResponse<Album>>(`/api/albums${q(params)}`);
  },
  getById: async (id: string) => {
    return request<AlbumDetail>(`/api/albums/${id}`);
  },
  getTracks: async (id: string, params: { search?: string; page?: number; limit?: number }) => {
    return request<PaginatedResponse<Track>>(`/api/albums/${id}/tracks${q(params)}`);
  },
};


