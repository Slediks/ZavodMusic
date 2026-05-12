import type { Track } from "../types/track";

type TrackPlaybackDeps = {
  tracks: Track[];
  dislikedTrackIds: string[];
  playTrack: (track: Track, queue?: Track[]) => void;
  addToQueue: (track: Track) => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
};

export function buildTrackPlaybackHandlers(deps: TrackPlaybackDeps) {
  const { tracks, dislikedTrackIds, playTrack, addToQueue, showToast } = deps;

  const onPlay = (track: Track) => {
    if (dislikedTrackIds.includes(track.id)) {
      showToast("Дизлайкнутый трек нельзя воспроизвести", "error");
      return;
    }
    const playableQueue = tracks.filter((item) => !dislikedTrackIds.includes(item.id));
    playTrack(track, playableQueue);
  };

  const onAddToQueue = (track: Track) => {
    if (dislikedTrackIds.includes(track.id)) {
      showToast("Дизлайкнутый трек нельзя добавить в очередь", "error");
      return;
    }
    addToQueue(track);
    showToast("Трек добавлен в очередь", "info");
  };

  return { onPlay, onAddToQueue };
}
