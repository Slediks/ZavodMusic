import React from "react";
import type { AnyEntity } from "../../types";
import styles from "./CrudPage.module.css";
import { useCrudPage } from "./hooks/useCrudPage";
import { DetailsPane } from "./panes/DetailsPane";
import { EditorPane } from "./panes/EditorPane";
import { ListPane } from "./panes/ListPane";

type CrudPageProps = {
  type: string;
  title: string;
  createEnabled?: boolean;
  quickDisable?: boolean;
  readonlyTrackIds?: boolean;
};

export function CrudPage({ type, title, createEnabled = true, quickDisable = false, readonlyTrackIds = false }: CrudPageProps) {
  const crud = useCrudPage({ type });

  return (
    <section className={styles.workspace}>
      <ListPane
        type={type}
        title={title}
        createEnabled={createEnabled}
        list={crud.list}
        search={crud.search}
        page={crud.page}
        selectedId={crud.selectedId}
        err={crud.err}
        playingTrackId={crud.playingTrackId}
        onSearchChange={crud.setSearch}
        onSearchSubmit={() => crud.setPage(1)}
        onCreate={crud.createNew}
        onSelect={crud.setSelectedId}
        onToggleTrack={crud.toggleTrack}
        onPrevPage={() => crud.setPage((p) => p - 1)}
        onNextPage={() => crud.setPage((p) => p + 1)}
      />

      <DetailsPane
        type={type}
        entity={crud.entity}
        quickDisable={quickDisable}
        onEdit={() => crud.setEditMode(true)}
        onQuickDisable={crud.quickDisable}
      />

      <EditorPane
        type={type}
        draft={crud.isEditMode ? crud.draft : null}
        entity={crud.entity}
        readonlyTrackIds={readonlyTrackIds}
        deleteForm={crud.deleteForm}
        assignMode={crud.assignMode}
        hiddenEditKeys={crud.hiddenEditKeys}
        onSave={crud.save}
        onCancel={crud.cancelEdit}
        onDelete={crud.remove}
        setDraft={crud.setDraft as (v: AnyEntity) => void}
        setDeleteForm={crud.setDeleteForm}
        setAssignMode={crud.setAssignMode}
      />
    </section>
  );
}
