import React from "react";
import type { AnyEntity } from "../../../types";
import { deleteHint } from "../shared/crudHelpers";
import { SelectorField } from "../shared/SelectorField";
import styles from "../CrudPage.module.css";

type AssignMode = {
  artistTrackAssignMode: "add" | "replace";
  albumTrackAssignMode: "move" | "add";
};

type Props = {
  type: string;
  draft: AnyEntity | null;
  entity: AnyEntity | null;
  readonlyTrackIds: boolean;
  deleteForm: AnyEntity;
  assignMode: AssignMode;
  hiddenEditKeys: Set<string>;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  setDraft: (v: AnyEntity) => void;
  setDeleteForm: (v: AnyEntity) => void;
  setAssignMode: (v: AssignMode) => void;
};

export function EditorPane({
  type,
  draft,
  entity,
  readonlyTrackIds,
  deleteForm,
  assignMode,
  hiddenEditKeys,
  onSave,
  onCancel,
  onDelete,
  setDraft,
  setDeleteForm,
  setAssignMode,
}: Props) {
  if (!draft) return <div className={styles.columnEditor}><div className={styles.emptyState}>Режим редактирования выключен.</div></div>;

  const readonlyDerivedFields = new Set(["albumTitle", "artistNames"]);

  return (
    <div className={styles.columnEditor}>
      <div className={styles.panelHead}>
        <div>
          <h3 className={styles.title}>Редактор</h3>
          <p className={styles.meta}>{deleteHint(type)}</p>
        </div>
        <div className={styles.actionRow}>
          <button className={styles.btnPrimary} onClick={onSave}>Сохранить</button>
          <button className={styles.btn} onClick={onCancel}>Отмена</button>
          <button className={styles.btnDanger} onClick={onDelete}>Удалить</button>
        </div>
      </div>

      <div className={styles.editorFields}>
        {type === "artists" && (
          <div className={styles.optionBox}>
            <label>Режим назначения треков автору</label>
            <select className={styles.input} value={assignMode.artistTrackAssignMode} onChange={(e) => setAssignMode({ ...assignMode, artistTrackAssignMode: e.target.value as "add" | "replace" })}>
              <option value="add">add: добавить автора к треку</option>
              <option value="replace">replace: заменить авторов у трека</option>
            </select>
          </div>
        )}

        {type === "albums" && (
          <div className={styles.optionBox}>
            <label>Режим назначения треков альбому</label>
            <select className={styles.input} value={assignMode.albumTrackAssignMode} onChange={(e) => setAssignMode({ ...assignMode, albumTrackAssignMode: e.target.value as "move" | "add" })}>
              <option value="move">move: перенести трек в этот альбом</option>
              <option value="add">add: добавить треки без альбома</option>
            </select>
          </div>
        )}

        {Object.entries(draft).filter(([k, v]) => {
          if (hiddenEditKeys.has(k)) return false;
          if (v && typeof v === "object" && !Array.isArray(v)) return false;
          if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object") return false;
          return true;
        }).map(([k, v]) => {
          if (Array.isArray(v) && (k === "artistIds" || k === "trackIds" || k === "albumIds")) {
            const endpoint = k === "artistIds" ? "artists" : k === "albumIds" ? "albums" : "tracks";
            if (readonlyTrackIds && k === "trackIds") return null;
            return <div key={k}><label className={styles.label}>{k}</label><SelectorField endpoint={endpoint} values={v} onChange={(next) => setDraft({ ...draft, [k]: next })} multiple /></div>;
          }
          if (k === "albumId") return <div key={k}><label className={styles.label}>{k}</label><SelectorField endpoint="albums" values={v || ""} onChange={(next) => setDraft({ ...draft, [k]: next })} /></div>;
          if (k === "disabledManually") {
            return (
              <div key={k}>
                <label className={styles.label}>{k}</label>
                <button
                  type="button"
                  className={v ? styles.switchOn : styles.switchOff}
                  onClick={() => setDraft({ ...draft, [k]: !Boolean(v) })}
                >
                  <span className={styles.switchKnob} />
                  <span>{v ? "Включено" : "Выключено"}</span>
                </button>
              </div>
            );
          }

          if (k === "lyrics") {
            return (
              <div key={k}>
                <label className={styles.label}>{k}</label>
                <textarea
                  className={styles.textarea}
                  value={v == null ? "" : String(v)}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                  rows={5}
                />
              </div>
            );
          }

          if (readonlyDerivedFields.has(k)) {
            return (
              <div key={k}>
                <label className={styles.label}>{k}</label>
                <input className={`${styles.input} ${styles.inputReadonly}`} value={v == null ? "" : String(v)} readOnly />
              </div>
            );
          }

          return <div key={k}><label className={styles.label}>{k}</label><input className={styles.input} value={v == null ? "" : String(v)} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} /></div>;
        })}
        {type === "albums" && (
          <div className={styles.dangerBox}>
            <h4>Переназначение при удалении альбома</h4>
            <SelectorField endpoint="albums" values={deleteForm.reassignAlbumId || ""} onChange={(v) => setDeleteForm({ ...deleteForm, reassignAlbumId: v })} />
            <input className={styles.input} placeholder="или новый альбом (название)" value={deleteForm.reassignAlbumTitle || ""} onChange={(e) => setDeleteForm({ ...deleteForm, reassignAlbumTitle: e.target.value })} />
            <SelectorField endpoint="artists" values={deleteForm.newAlbumArtistId || ""} onChange={(v) => setDeleteForm({ ...deleteForm, newAlbumArtistId: v })} />
            <input className={styles.input} placeholder="или новый автор для нового альбома" value={deleteForm.newAlbumArtistName || ""} onChange={(e) => setDeleteForm({ ...deleteForm, newAlbumArtistName: e.target.value })} />
          </div>
        )}

        {type === "artists" && (
          <div className={styles.dangerBox}>
            <h4>Переназначение при удалении автора</h4>
            <SelectorField endpoint="artists" values={deleteForm.reassignArtistId || ""} onChange={(v) => setDeleteForm({ ...deleteForm, reassignArtistId: v })} />
            <input className={styles.input} placeholder="или новый автор (имя)" value={deleteForm.reassignArtistName || ""} onChange={(e) => setDeleteForm({ ...deleteForm, reassignArtistName: e.target.value })} />
          </div>
        )}

        {type === "users" && (
          <div className={styles.dangerBox}>
            <h4>Переназначение при удалении пользователя</h4>
            <SelectorField endpoint="users" values={deleteForm.reassignPlaylistOwnerId || ""} onChange={(v) => setDeleteForm({ ...deleteForm, reassignPlaylistOwnerId: v })} />
            <input className={styles.input} placeholder="или новый пользователь (логин)" value={deleteForm.reassignPlaylistOwnerLogin || ""} onChange={(e) => setDeleteForm({ ...deleteForm, reassignPlaylistOwnerLogin: e.target.value })} />
          </div>
        )}
      </div>
    </div>
  );
}
