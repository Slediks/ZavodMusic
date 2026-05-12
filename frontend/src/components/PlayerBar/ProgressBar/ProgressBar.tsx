import styles from './ProgressBar.module.css';
import { useEffect, useRef } from "react";
import { formatDuration } from "../../../utils/formatDuration";

type ProgressBarProps = {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
};

export function ProgressBar({ currentTime, duration, onSeek }: ProgressBarProps) {
  const max = duration > 0 ? duration : 0;
  const value = Math.min(currentTime, max);

  const rangeRef = useRef<HTMLInputElement | null>(null);
  const valueRef = useRef(value);

  valueRef.current = value;

  useEffect(() => {
    const el = rangeRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (max <= 0) return;

      const step = 2;
      const direction = e.deltaY > 0 ? -1 : 1;
      const next = Math.max(0, Math.min(max, valueRef.current + direction * step));
      onSeek(next);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [max, onSeek]);

  return (
    <div className={styles["progress-wrap"]}>
      <input
        ref={rangeRef}
        type="range"
        min={0}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Прогресс"
      />

      <div className={styles["progress-time-row"]}>
        <span className={styles["progress-time"] + " " + styles["progress-time-left"]}>{formatDuration(currentTime)}</span>
        <span className={styles["progress-time"] + " " + styles["progress-time-right"]}>{formatDuration(duration)}</span>
      </div>
    </div>
  );
}







