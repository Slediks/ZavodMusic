import styles from './QueuePanel.module.css';
import { useState } from "react";
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type Modifier } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { usePlayer } from "../../context/PlayerContext";
import { ConfirmModal } from "../ConfirmModal/ConfirmModal";
import { UiIcon } from "../UiIcon/UiIcon";

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type QueuePanelProps = {
  dislikedTrackIds: string[];
};

const makeQueueDndId = (index: number) => `queue-item-${index}`;
const parseQueueDndIndex = (id: string | number) => {
  const value = String(id);
  if (!value.startsWith("queue-item-")) return -1;
  const parsed = Number(value.slice("queue-item-".length));
  return Number.isInteger(parsed) ? parsed : -1;
};

type QueueItemProps = {
  id: string;
  title: string;
  subtitle: string;
  coverUrl: string;
  isActive: boolean;
  isDisabled: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onRemove: () => void;
};

function QueueSortableItem({
  id,
  title,
  subtitle,
  coverUrl,
  isActive,
  isDisabled,
  isPlaying,
  onPlay,
  onRemove,
}: QueueItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id, disabled: isDisabled });
  const [coverFailed, setCoverFailed] = useState(false);
  const style = { transform: CSS.Transform.toString(transform), transition };

  const canInteract = !isDisabled;
  const showCoverOverlay = canInteract && isActive;
  const coverIconName = isActive && isPlaying ? "pause" : "play";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${'{'}styles["queue-item"]} ${isActive ? "is-active" : ""} ${isDisabled ? "is-disabled" : ""}`}
      onDoubleClick={() => {
        if (!isDisabled) onPlay();
      }}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        className={styles["queue-cover-wrap"]}
        onClick={(event) => {
          event.stopPropagation();
          if (!canInteract) return;
          onPlay();
        }}
        disabled={!canInteract}
        aria-label={`Воспроизвести ${title}`}
      >
        {!coverFailed && coverUrl ? (
          <img src={coverUrl} alt={title} className={styles["queue-cover"]} onError={() => setCoverFailed(true)} />
        ) : (
          <span className={styles["queue-cover-fallback"]}><UiIcon name="musicTwo" /></span>
        )}
        <span className={`${'{'}styles["queue-cover-overlay"]} ${showCoverOverlay ? "queue-cover-overlay-visible" : ""}`}>
          <UiIcon name={coverIconName} className={styles["queue-cover-play-icon"]} />
        </span>
      </button>

      <div className={styles["queue-meta"]}>
        <div className={styles["queue-title"]}>{title}</div>
        <small className={styles["queue-subtitle"]}>{subtitle}</small>
      </div>

      <button
        type="button"
        className={styles["ui-icon-btn"] + " " + styles["queue-remove-btn"]}
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        aria-label={`Удалить ${title} из очереди`}
      >
        <UiIcon name="trash" />
      </button>
    </div>
  );
}

export function QueuePanel({ dislikedTrackIds }: QueuePanelProps) {
  const {
    queue,
    queueIndex,
    isQueueOpen,
    isPlaying,
    currentTrack,
    togglePlay,
    toggleQueuePanel,
    reorderQueue,
    clearQueue,
    playTrack,
    removeTrackAndSkip,
  } = usePlayer();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!isQueueOpen) return null;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = parseQueueDndIndex(active.id);
    const toIndex = parseQueueDndIndex(over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    reorderQueue(fromIndex, toIndex);
  };

  return (
    <div className={styles["queue-panel-backdrop"]} onClick={toggleQueuePanel} role="button" tabIndex={-1} aria-label="Закрыть очередь">
      <aside className={styles["queue-panel"]} aria-label="Очередь" onClick={(event) => event.stopPropagation()}>
        <div className={styles["queue-panel-header"]}>
          <h3>Очередь</h3>
          <div className={styles["queue-panel-actions"]}>
            <button
              type="button"
              className={styles["ui-icon-btn"] + " " + styles["queue-header-btn"] + " " + styles["queue-header-btn-danger"]}
              onClick={() => setConfirmOpen(true)}
              aria-label="Очистить очередь"
            >
              <UiIcon name="trash" />
            </button>
            <button
              type="button"
              className={styles["ui-icon-btn"] + " " + styles["queue-header-btn"]}
              onClick={toggleQueuePanel}
              aria-label="Закрыть"
            >
              <UiIcon name="close" />
            </button>
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
          <SortableContext items={queue.map((_, index) => makeQueueDndId(index))} strategy={verticalListSortingStrategy}>
            <div className={styles["queue-list"]}>
              {queue.map((track, index) => {
                const disabled = dislikedTrackIds.includes(track.id);
                return (
                  <QueueSortableItem
                    key={`${track.id}-${index}`}
                    id={makeQueueDndId(index)}
                    title={track.title}
                    subtitle={track.artistNames.join(", ")}
                    coverUrl={track.coverUrl}
                    isActive={index === queueIndex}
                    isDisabled={disabled}
                    isPlaying={isPlaying}
                    onPlay={() => {
                      if (currentTrack?.id === track.id) {
                        togglePlay();
                        return;
                      }
                      playTrack(track, queue);
                    }}
                    onRemove={() => removeTrackAndSkip(track.id)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        <ConfirmModal
          isOpen={confirmOpen}
          title="Очистить очередь?"
          text="Очистить очередь?"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => {
            clearQueue();
            setConfirmOpen(false);
          }}
        />
      </aside>
    </div>
  );
}





