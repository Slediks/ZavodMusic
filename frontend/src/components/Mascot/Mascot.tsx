import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./Mascot.module.css";

const STATIC_SRC = "/mascot/mascot.png";
const IDLE_ANIMATIONS = [
  "/mascot/idle_anim/anim1.gif",
  "/mascot/idle_anim/anim2.gif",
  "/mascot/idle_anim/anim3.gif",
  "/mascot/idle_anim/anim4.gif",
] as const;

const MINUTE_MS = 60_000;
const FALLBACK_ANIMATION_MS = 4_000;

function readGifCycleDurationMs(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 13) return FALLBACK_ANIMATION_MS;

  const header = String.fromCharCode(...bytes.slice(0, 6));
  if (header !== "GIF87a" && header !== "GIF89a") return FALLBACK_ANIMATION_MS;

  let offset = 6;
  const packed = bytes[offset + 4];
  offset += 7;

  if (packed & 0x80) {
    const gctSize = 3 * (1 << ((packed & 0x07) + 1));
    offset += gctSize;
  }

  let lastDelayCs = 0;
  let totalDelayMs = 0;

  while (offset < bytes.length) {
    const blockId = bytes[offset];
    offset += 1;

    if (blockId === 0x3b) break;

    if (blockId === 0x21) {
      if (offset >= bytes.length) break;
      const label = bytes[offset];
      offset += 1;

      if (label === 0xf9) {
        if (offset + 5 > bytes.length) break;
        const blockSize = bytes[offset];
        if (blockSize !== 4) {
          offset += 1;
        } else {
          offset += 1;
          offset += 1;
          lastDelayCs = bytes[offset] | (bytes[offset + 1] << 8);
          offset += 2;
          offset += 1;
          offset += 1;
        }
      } else {
        while (offset < bytes.length) {
          const subSize = bytes[offset];
          offset += 1;
          if (subSize === 0) break;
          offset += subSize;
        }
      }
      continue;
    }

    if (blockId === 0x2c) {
      if (offset + 9 > bytes.length) break;
      offset += 8;
      const localPacked = bytes[offset];
      offset += 1;

      if (localPacked & 0x80) {
        const lctSize = 3 * (1 << ((localPacked & 0x07) + 1));
        offset += lctSize;
      }

      if (offset >= bytes.length) break;
      offset += 1;

      while (offset < bytes.length) {
        const subSize = bytes[offset];
        offset += 1;
        if (subSize === 0) break;
        offset += subSize;
      }

      const frameDelayCs = lastDelayCs > 0 ? lastDelayCs : 10;
      totalDelayMs += frameDelayCs * 10;
      continue;
    }

    break;
  }

  return totalDelayMs > 0 ? totalDelayMs : FALLBACK_ANIMATION_MS;
}

export function Mascot() {
  const [src, setSrc] = useState(STATIC_SRC);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const timeoutRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const durationsRef = useRef<Record<string, number>>({});

  const animations = useMemo(() => [...IDLE_ANIMATIONS], []);

  useEffect(() => {
    let cancelled = false;

    const loadDurations = async () => {
      const entries = await Promise.all(
        animations.map(async (animationSrc) => {
          try {
            const response = await fetch(animationSrc, { cache: "force-cache" });
            const buffer = await response.arrayBuffer();
            return [animationSrc, readGifCycleDurationMs(buffer)] as const;
          } catch {
            return [animationSrc, FALLBACK_ANIMATION_MS] as const;
          }
        }),
      );

      if (cancelled) return;
      setDurations(Object.fromEntries(entries));
    };

    void loadDurations();

    return () => {
      cancelled = true;
    };
  }, [animations]);

  useEffect(() => {
    durationsRef.current = durations;
  }, [durations]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (isAnimatingRef.current) return;
      const pick = animations[Math.floor(Math.random() * animations.length)];
      const animationDuration = durationsRef.current[pick] ?? FALLBACK_ANIMATION_MS;

      isAnimatingRef.current = true;
      setSrc(`${pick}?t=${Date.now()}`);

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setSrc(STATIC_SRC);
        isAnimatingRef.current = false;
      }, animationDuration);
    }, MINUTE_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [animations]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className={styles.mascotWrap} aria-hidden="true">
      <img className={styles.mascotImage} src={src} alt="" draggable={false} />
    </div>
  );
}
