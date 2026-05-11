import { request } from "./client";
import type { PaginatedResponse } from "../types/pagination";
import type { Artist, ArtistDetail } from "../types/artist";
import type { Album } from "../types/album";
import type { Track } from "../types/track";
import { enrichTrackListMedia } from "./trackMedia";
import { enrichAlbumListMedia, enrichArtistListMedia, enrichArtistMedia } from "./entityMedia";

const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  return search.toString() ? `?${search.toString()}` : "";
};

export const artistsApi = {
  getAll: async (params: { search?: string; page?: number; limit?: number }) => {
    const response = await request<PaginatedResponse<Artist>>(`/api/artists${q(params)}`);
    return { ...response, items: enrichArtistListMedia(response.items) };
  },
  getById: async (id: string) => {
    const response = await request<ArtistDetail>(`/api/artists/${id}`);
    return enrichArtistMedia(response);
  },
  getTracks: async (id: string, params: { search?: string; page?: number; limit?: number }) => {
    const response = await request<PaginatedResponse<Track>>(`/api/artists/${id}/tracks${q(params)}`);
    return { ...response, items: enrichTrackListMedia(response.items) };
  },
  getAlbums: async (id: string, params: { page?: number; limit?: number }) => {
    const response = await request<PaginatedResponse<Album>>(`/api/artists/${id}/albums${q(params)}`);
    return { ...response, items: enrichAlbumListMedia(response.items) };
  },
};


