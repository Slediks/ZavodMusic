import styles from './TrackTable.module.css';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type Modifier } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EmptyState } from "../EmptyState/EmptyState";
import { UiIcon } from "../UiIcon/UiIcon";
import { Skeleton } from "./Skeleton/Skeleton";
import { TrackRow } from "./TrackRow/TrackRow";
import type { Track } from "../../types/track";

const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });

type SortBy = "title" | "albumTitle" | "duration";
type SortDirection = "asc" | "desc";

type TrackTableProps = {
  tracks: Track[];
  loading: boolean;
  sortBy: SortBy;
  sortDirection: SortDirection;
  dislikedTrackIds: string[];
  likedTrackIds: string[];
  onSort: (sortBy: SortBy) => void;
  onToggleLike: (track: Track) => void;
  onToggleDislike: (track: Track) => void;
  onInfo: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  showRemoveButton?: boolean;
  onRemoveTrack?: (track: Track) => void;
  emptyText?: string;
  showHeader?: boolean;
  sortable?: boolean;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  showQueueButton?: boolean;
  menuIncludeQueue?: boolean;
  showDragHandle?: boolean;
};

function SortHeader({ label, field, sortBy, sortDirection, onSort }: { label: string; field: SortBy; sortBy: SortBy; sortDirection: SortDirection; onSort: (sortBy: SortBy) => void }) {
  const isActive = sortBy === field;
  const isDesc = isActive && sortDirection === "desc";

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.sortBtn} ${styles.sortBtnHeader}`}
      onClick={() => onSort(field)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(field);
        }
      }}
      aria-label={`Сортировать по полю ${label}`}
    >
      <span>{label}</span>
      {isActive ? <UiIcon name="sortingRight" className={`${styles.sortIcon} ${styles.sortIconActive} ${isDesc ? styles.sortIconDesc : ""}`} /> : null}
    </div>
  );
}

function SortableTrackRow({
  track,
  isLiked,
  isDisliked,
  onToggleLike,
  onToggleDislike,
  onInfo,
  onPlay,
  onAddToPlaylist,
  onAddToQueue,
  showRemoveButton,
  onRemoveTrack,
  showQueueButton,
  menuIncludeQueue,
  showDragHandle,
}: {
  track: Track;
  isLiked: boolean;
  isDisliked: boolean;
  onToggleLike: (track: Track) => void;
  onToggleDislike: (track: Track) => void;
  onInfo: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onPlay: (track: Track) => void;
  onAddToQueue: (track: Track) => void;
  showRemoveButton?: boolean;
  onRemoveTrack?: (track: Track) => void;
  showQueueButton: boolean;
  menuIncludeQueue: boolean;
  showDragHandle: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: track.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style}>
      <TrackRow
        track={track}
        isLiked={isLiked}
        isDisliked={isDisliked}
        onToggleLike={onToggleLike}
        onToggleDislike={onToggleDislike}
        onInfo={onInfo}
        onPlay={onPlay}
        onAddToPlaylist={onAddToPlaylist}
        onAddToQueue={onAddToQueue}
        showRemoveButton={showRemoveButton}
        onRemoveTrack={onRemoveTrack}
        showQueueButton={showQueueButton}
        menuIncludeQueue={menuIncludeQueue}
        showDragHandle={showDragHandle}
        dragHandleAttributes={attributes as unknown as Record<string, unknown>}
        dragHandleListeners={listeners as unknown as Record<string, unknown>}
      />
    </div>
  );
}

export function TrackTable({
  tracks,
  loading,
  sortBy,
  sortDirection,
  dislikedTrackIds,
  likedTrackIds,
  onSort,
  onToggleLike,
  onToggleDislike,
  onInfo,
  onAddToPlaylist,
  onPlay,
  onAddToQueue,
  showRemoveButton = false,
  onRemoveTrack,
  emptyText = "Ничего не нашли, но мы старались",
  showHeader = true,
  sortable = false,
  onReorder,
  showQueueButton = true,
  menuIncludeQueue = false,
  showDragHandle = false,
}: TrackTableProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    if (!sortable || !onReorder) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = tracks.findIndex((t) => t.id === active.id);
    const toIndex = tracks.findIndex((t) => t.id === over.id);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorder(fromIndex, toIndex);
  };

  return (
    <div className={styles.trackTableWrap}>
      {showHeader ? (
        <div className={styles.headerRow}>
          <div className={styles.headerCell}><SortHeader label="Название" field="title" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></div>
          <div className={styles.headerCell}><SortHeader label="Альбом" field="albumTitle" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></div>
          <div className={`${styles.headerCell} ${styles.timeHead}`}><SortHeader label="Время" field="duration" sortBy={sortBy} sortDirection={sortDirection} onSort={onSort} /></div>
        </div>
      ) : null}

      <div className={styles.bodyList}>
        {loading
          ? Array.from({ length: 8 }).map((_, idx) => (
              <div key={`sk-${idx}`} className={styles.skeletonRow}><Skeleton height={56} /></div>
            ))
          : tracks.length === 0
            ? <div className={styles.emptyWrap}><EmptyState text={emptyText} /></div>
            : sortable
              ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={handleDragEnd}>
                    <SortableContext items={tracks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                      {tracks.map((track) => (
                        <SortableTrackRow
                          key={track.id}
                          track={track}
                          isLiked={likedTrackIds.includes(track.id)}
                          isDisliked={dislikedTrackIds.includes(track.id)}
                          onToggleLike={onToggleLike}
                          onToggleDislike={onToggleDislike}
                          onInfo={onInfo}
                          onPlay={onPlay}
                          onAddToPlaylist={onAddToPlaylist}
                          onAddToQueue={onAddToQueue}
                          showRemoveButton={showRemoveButton}
                          onRemoveTrack={onRemoveTrack}
                          showQueueButton={showQueueButton}
                          menuIncludeQueue={menuIncludeQueue}
                          showDragHandle={showDragHandle}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )
              : tracks.map((track) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    isLiked={likedTrackIds.includes(track.id)}
                    isDisliked={dislikedTrackIds.includes(track.id)}
                    onToggleLike={onToggleLike}
                    onToggleDislike={onToggleDislike}
                    onInfo={onInfo}
                    onPlay={onPlay}
                    onAddToPlaylist={onAddToPlaylist}
                    onAddToQueue={onAddToQueue}
                    showRemoveButton={showRemoveButton}
                    onRemoveTrack={onRemoveTrack}
                    showQueueButton={showQueueButton}
                    menuIncludeQueue={menuIncludeQueue}
                    showDragHandle={showDragHandle}
                  />
                ))}
      </div>
    </div>
  );
}









