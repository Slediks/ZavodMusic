import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Track } from "../types/track";
import type { RepeatMode } from "../types/player";
import { authStorage } from "../utils/authStorage";
import { useToast } from "./ToastContext";
import { getTrackAudioUrl } from "../api/trackMedia";

type FullscreenMode = "closed" | "player" | "lyrics";

type PlayerStateSnapshot = {
  lastTrackId?: string | null;
  queueTrackIds?: string[];
  currentIndex?: number;
  volume?: number;
  muted?: boolean;
  repeat?: RepeatMode;
  shuffle?: boolean;
};

type PlayerContextValue = {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isShuffled: boolean;
  repeatMode: RepeatMode;
  isQueueOpen: boolean;
  fullscreenMode: FullscreenMode;
  playTrack: (track: Track, queue?: Track[]) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  addToQueue: (track: Track) => void;
  clearQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  removeTrackAndSkip: (trackId: string) => void;
  seekTo: (seconds: number) => void;
  setVolumeLevel: (value: number) => void;
  toggleMute: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  toggleQueuePanel: () => void;
  openFullscreen: () => void;
  openLyrics: () => void;
  closeFullscreen: () => void;
  hydrateTracks: (tracks: Track[]) => void;
};

const PLAYER_STATE_KEY = "zavod_music_player";
const PlayerContext = createContext<PlayerContextValue | null>(null);

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function parseSavedState(): PlayerStateSnapshot | null {
  const raw = localStorage.getItem(PLAYER_STATE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as PlayerStateSnapshot; } catch { return null; }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { showToast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const trackMapRef = useRef<Map<string, Track>>(new Map());
  const showToastRef = useRef(showToast);

  const [queue, setQueue] = useState<Track[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [repeatMode, setRepeatModeState] = useState<RepeatMode>("off");
  const [isShuffled, setIsShuffled] = useState(false);
  const [originalQueueTrackIds, setOriginalQueueTrackIds] = useState<string[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [restoredTime, setRestoredTime] = useState(0);
  const [fullscreenMode, setFullscreenMode] = useState<FullscreenMode>("closed");

  const currentTrack = queueIndex >= 0 ? queue[queueIndex] ?? null : null;
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const repeatModeRef = useRef(repeatMode);
  const restoredTimeRef = useRef(restoredTime);

  useEffect(() => { showToastRef.current = showToast; }, [showToast]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { queueIndexRef.current = queueIndex; }, [queueIndex]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { restoredTimeRef.current = restoredTime; }, [restoredTime]);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = 0.9;
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      if (restoredTimeRef.current > 0 && audio.duration > 0) {
        audio.currentTime = Math.min(restoredTimeRef.current, audio.duration);
        setCurrentTime(audio.currentTime);
        setRestoredTime(0);
      }
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => {
      const repeat = repeatModeRef.current;
      const activeQueue = queueRef.current;
      const activeIndex = queueIndexRef.current;

      if (repeat === "one") {
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
        return;
      }
      if (activeQueue.length === 0) {
        setIsPlaying(false);
      } else if (activeIndex < activeQueue.length - 1) {
        setQueueIndex((prev) => prev + 1);
      } else if (repeat === "queue") {
        setQueueIndex(0);
      } else {
        setIsPlaying(false);
      }
    };
    const onError = () => {
      const activeQueue = queueRef.current;
      const activeIndex = queueIndexRef.current;
      const activeAudioSrc = audioRef.current?.src ?? "";

      // Queue was intentionally cleared or source was reset: no user-facing playback error.
      if (activeQueue.length === 0 || activeIndex < 0 || !activeAudioSrc) {
        setIsPlaying(false);
        return;
      }

      showToastRef.current("Ошибка воспроизведения, переключаем следующий трек", "error");
      if (activeIndex < activeQueue.length - 1) {
        setQueueIndex((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    const audioUrl = getTrackAudioUrl(currentTrack.id);
    if (audio.src !== audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }
    if (isPlaying) {
      void audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { if (audioRef.current) audioRef.current.muted = isMuted; }, [isMuted]);

  const hydrateTracks = useCallback((tracks: Track[]) => {
    for (const track of tracks) trackMapRef.current.set(track.id, track);
  }, []);

  useEffect(() => {
    const saved = parseSavedState();
    if (!saved) return;
    setVolume(saved.volume ?? 0.9);
    setIsMuted(Boolean(saved.muted));
    setRepeatModeState(saved.repeat ?? "off");
    setIsShuffled(Boolean(saved.shuffle));
    setOriginalQueueTrackIds(saved.queueTrackIds ?? []);
    setRestoredTime(0);

    const restoredQueue = (saved.queueTrackIds || [])
      .map((id) => trackMapRef.current.get(id))
      .filter((item): item is Track => Boolean(item));
    if (restoredQueue.length > 0) {
      setQueue(restoredQueue);
      const idx = Math.min(Math.max(0, saved.currentIndex ?? 0), restoredQueue.length - 1);
      setQueueIndex(idx);
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const login = authStorage.getLogin();
    if (!login) {
      localStorage.removeItem(PLAYER_STATE_KEY);
      return;
    }
    localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify({
      lastTrackId: currentTrack?.id ?? null,
      queueTrackIds: queue.map((t) => t.id),
      currentIndex: queueIndex,
      volume,
      muted: isMuted,
      repeat: repeatMode,
      shuffle: isShuffled,
    } as PlayerStateSnapshot));
  }, [currentTrack?.id, queue, queueIndex, volume, isMuted, repeatMode, isShuffled]);

  const playTrack = useCallback((track: Track, nextQueue?: Track[]) => {
    const prepared = nextQueue && nextQueue.length > 0 ? nextQueue : [track];
    const index = prepared.findIndex((t) => t.id === track.id);
    setQueue(prepared);
    setQueueIndex(index >= 0 ? index : 0);
    setOriginalQueueTrackIds(prepared.map((t) => t.id));
    setIsShuffled(false);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(true);
  }, []);

  const togglePlay = useCallback(() => {
    if (!currentTrack) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      setIsPlaying(true);
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  }, [currentTrack]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    if (queueIndex < queue.length - 1) {
      setQueueIndex((prev) => prev + 1);
      setIsPlaying(true);
    } else if (repeatMode === "queue") {
      setQueueIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [queue.length, queueIndex, repeatMode]);

  const previous = useCallback(() => {
    if (queue.length === 0) return;
    if (queueIndex > 0) {
      setQueueIndex((prev) => prev - 1);
      setIsPlaying(true);
    } else if (repeatMode === "queue") {
      setQueueIndex(queue.length - 1);
      setIsPlaying(true);
    }
  }, [queue.length, queueIndex, repeatMode]);

  const addToQueue = useCallback((track: Track) => {
    setQueue((prev) => {
      if (prev.some((x) => x.id === track.id)) return prev;
      const nextQueue = [...prev, track];
      if (prev.length === 0) setQueueIndex(0);
      return nextQueue;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setQueueIndex(-1);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    const currentQueue = queueRef.current;
    const currentIndex = queueIndexRef.current;
    if (
      fromIndex === toIndex
      || fromIndex < 0
      || toIndex < 0
      || fromIndex >= currentQueue.length
      || toIndex >= currentQueue.length
    ) {
      return;
    }

    const nextQueue = [...currentQueue];
    const [moved] = nextQueue.splice(fromIndex, 1);
    nextQueue.splice(toIndex, 0, moved);

    let nextIndex = currentIndex;
    if (currentIndex === fromIndex) {
      nextIndex = toIndex;
    } else if (currentIndex > fromIndex && currentIndex <= toIndex) {
      nextIndex = currentIndex - 1;
    } else if (currentIndex < fromIndex && currentIndex >= toIndex) {
      nextIndex = currentIndex + 1;
    }

    setQueue(nextQueue);
    setQueueIndex(nextIndex);
  }, []);

  const removeTrackAndSkip = useCallback((trackId: string) => {
    setQueue((prev) => {
      const idx = prev.findIndex((t) => t.id === trackId);
      if (idx < 0) return prev;
      const nextQueue = prev.filter((t) => t.id !== trackId);
      setOriginalQueueTrackIds((orig) => orig.filter((id) => id !== trackId));
      setQueueIndex((current) => {
        if (nextQueue.length === 0) {
          setIsPlaying(false);
          setCurrentTime(0);
          setDuration(0);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = "";
          }
          return -1;
        }
        if (current === idx) {
          const nextIndex = Math.min(idx, nextQueue.length - 1);
          setIsPlaying(true);
          return nextIndex;
        }
        if (current > idx) return current - 1;
        return current;
      });
      return nextQueue;
    });
  }, []);

  const seekTo = useCallback((seconds: number) => {
    if (!audioRef.current || !Number.isFinite(seconds)) return;
    audioRef.current.currentTime = Math.max(0, Math.min(seconds, duration || seconds));
    setCurrentTime(audioRef.current.currentTime);
  }, [duration]);

  const setVolumeLevel = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolume(clamped);
    if (clamped > 0 && isMuted) setIsMuted(false);
  }, [isMuted]);

  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);
  const setRepeatMode = useCallback((mode: RepeatMode) => setRepeatModeState(mode), []);

  const toggleShuffle = useCallback(() => {
    setQueue((prev) => {
      if (prev.length <= 1) return prev;
      if (!isShuffled) {
        const current = queueIndex >= 0 ? prev[queueIndex] : prev[0];
        const rest = prev.filter((t) => t.id !== current.id);
        const shuffled = [current, ...shuffleArray(rest)];
        setOriginalQueueTrackIds(prev.map((t) => t.id));
        setQueueIndex(0);
        setIsShuffled(true);
        return shuffled;
      }
      const restored = originalQueueTrackIds.map((id) => prev.find((t) => t.id === id)).filter((x): x is Track => Boolean(x));
      const activeId = prev[queueIndex]?.id;
      const nextIndex = restored.findIndex((t) => t.id === activeId);
      setQueueIndex(nextIndex >= 0 ? nextIndex : 0);
      setIsShuffled(false);
      return restored.length > 0 ? restored : prev;
    });
  }, [isShuffled, originalQueueTrackIds, queueIndex]);

  const toggleQueuePanel = useCallback(() => setIsQueueOpen((prev) => !prev), []);
  const openFullscreen = useCallback(() => setFullscreenMode("player"), []);
  const openLyrics = useCallback(() => setFullscreenMode("lyrics"), []);
  const closeFullscreen = useCallback(() => setFullscreenMode("closed"), []);

  const value = useMemo<PlayerContextValue>(() => ({
    currentTrack, queue, queueIndex, isPlaying, currentTime, duration, volume, isMuted, isShuffled, repeatMode, isQueueOpen, fullscreenMode,
    playTrack, togglePlay, next, previous, addToQueue, clearQueue, reorderQueue, removeTrackAndSkip, seekTo,
    setVolumeLevel, toggleMute, setRepeatMode, toggleShuffle, toggleQueuePanel, openFullscreen, openLyrics, closeFullscreen, hydrateTracks,
  }), [currentTrack, queue, queueIndex, isPlaying, currentTime, duration, volume, isMuted, isShuffled, repeatMode, isQueueOpen, fullscreenMode,
    playTrack, togglePlay, next, previous, addToQueue, clearQueue, reorderQueue, removeTrackAndSkip, seekTo,
    setVolumeLevel, toggleMute, setRepeatMode, toggleShuffle, toggleQueuePanel, openFullscreen, openLyrics, closeFullscreen, hydrateTracks]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error("usePlayer must be used inside PlayerProvider");
  return value;
}








