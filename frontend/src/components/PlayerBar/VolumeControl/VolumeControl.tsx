import styles from './VolumeControl.module.css';
import { useEffect, useRef } from "react";
import { UiIcon } from "../../UiIcon/UiIcon";

type VolumeControlProps = {
  volume: number;
  isMuted: boolean;
  onSetVolume: (value: number) => void;
  onToggleMute: () => void;
};

export function VolumeControl({ volume, isMuted, onSetVolume, onToggleMute }: VolumeControlProps) {
  const safeValue = isMuted ? 0 : volume;

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const valueRef = useRef(safeValue);

  valueRef.current = safeValue;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const step = 0.02;
      const direction = e.deltaY > 0 ? -1 : 1;
      const next = Math.max(0, Math.min(1, valueRef.current + direction * step));
      onSetVolume(Number(next.toFixed(2)));
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onSetVolume]);

  return (
    <div className={styles["volume-wrap"]} ref={wrapRef}>
      <button type="button" className={styles["ui-icon-btn"] + " " + styles["player-action"]} onClick={onToggleMute} aria-label="Звук">
        <UiIcon name={isMuted || volume === 0 ? "volumeOff" : "volumeOn"} />
      </button>

      <div className={styles["volume-popover"]} aria-hidden="true">
        <div className={styles["volume-popover-inner"]}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={safeValue}
            onChange={(e) => onSetVolume(Number(e.target.value))}
            aria-label="Громкость"
          />
        </div>
      </div>
    </div>
  );
}





