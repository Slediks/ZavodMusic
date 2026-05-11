import type { Track } from "../types/track";
import { API_URL } from "./client";

type BackendTrack = Omit<Track, "coverUrl" | "audioUrl">;

export function enrichTrackMedia(track: BackendTrack): Track {
  const encodedId = encodeURIComponent(track.id);
  return {
    ...track,
    coverUrl: `${API_URL}/api/tracks/${encodedId}/cover`,
    audioUrl: `${API_URL}/api/tracks/${encodedId}/audio`,
  };
}

export function enrichTrackListMedia(tracks: BackendTrack[]): Track[] {
  return tracks.map(enrichTrackMedia);
}

