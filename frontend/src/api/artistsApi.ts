import { request } from "./client";
import type { PaginatedResponse } from "../types/pagination";
import type { Artist, ArtistDetail } from "../types/artist";
import type { Album } from "../types/album";
import type { Track } from "../types/track";

const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return search.toString() ? `?${search.toString()}` : "";
};

export const artistsApi = {
  getAll: async (params: { search?: string; page?: number; limit?: number }) => {
    return request<PaginatedResponse<Artist>>(`/api/artists${q(params)}`);
  },
  getById: async (id: string) => {
    return request<ArtistDetail>(`/api/artists/${id}`);
  },
  getTracks: async (id: string, params: { search?: string; page?: number; limit?: number }) => {
    return request<PaginatedResponse<Track>>(`/api/artists/${id}/tracks${q(params)}`);
  },
  getAlbums: async (id: string, params: { page?: number; limit?: number }) => {
    return request<PaginatedResponse<Album>>(`/api/artists/${id}/albums${q(params)}`);
  },
};


