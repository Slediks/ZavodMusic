import { API_URL } from "./client";

export function getArtistCoverUrl(id: string): string {
  return `${API_URL}/api/artists/${encodeURIComponent(id)}/cover`;
}

export function getAlbumCoverUrl(id: string): string {
  return `${API_URL}/api/albums/${encodeURIComponent(id)}/cover`;
}

export function getPlaylistCoverUrl(id: string): string {
  return `${API_URL}/api/playlists/${encodeURIComponent(id)}/cover`;
}


