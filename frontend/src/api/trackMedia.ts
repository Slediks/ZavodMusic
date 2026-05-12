import { API_URL } from "./client";

export function getTrackCoverUrl(id: string): string {
  return `${API_URL}/api/tracks/${encodeURIComponent(id)}/cover`;
}

export function getTrackAudioUrl(id: string): string {
  return `${API_URL}/api/tracks/${encodeURIComponent(id)}/audio`;
}


