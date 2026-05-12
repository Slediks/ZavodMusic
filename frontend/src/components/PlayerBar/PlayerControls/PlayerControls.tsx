import styles from "./PlayerControls.module.css";
import { UiIcon } from "../../UiIcon/UiIcon";

type PlayerControlsProps = {
  isPlaying: boolean;
  isPreviousDisabled: boolean;
  isNextDisabled: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

export function PlayerControls({ isPlaying, isPreviousDisabled, isNextDisabled, onTogglePlay, onNext, onPrevious }: PlayerControlsProps) {
  const playButtonLabel = isPlaying ? "Пауза" : "Воспроизвести";
  const playIcon = isPlaying ? "pause" : "play";

  return (
    <div className={styles["player-controls"]}>
      <button type="button" className={styles["player-action"]} onClick={onPrevious} aria-label="Предыдущий" disabled={isPreviousDisabled}>
        <UiIcon name="previous" className={styles["player-action-icon"]} />
      </button>

      <button type="button" className={[styles["player-action"], styles["player-action-primary"]].join(" ")} onClick={onTogglePlay} aria-label={playButtonLabel}>
        <UiIcon name={playIcon} className={styles["player-action-primary-icon"]} />
      </button>

      <button type="button" className={styles["player-action"]} onClick={onNext} aria-label="Следующий" disabled={isNextDisabled}>
        <UiIcon name="next" className={styles["player-action-icon"]} />
      </button>
    </div>
  );
}


