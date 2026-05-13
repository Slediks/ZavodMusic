import { useEffect, useMemo, useRef, useState } from "react";
import { api, buildTrackAudioUrl } from "../../../api/adminApi";
import type { AnyEntity, PagedResponse } from "../../../types";

type AssignMode = {
  artistTrackAssignMode: "add" | "replace";
  albumTrackAssignMode: "move" | "add";
};

type UseCrudPageParams = {
  type: string;
};

export function useCrudPage({ type }: UseCrudPageParams) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<PagedResponse>({ items: [], total: 0, pages: 0 });
  const [selectedId, setSelectedId] = useState("");
  const [entity, setEntity] = useState<AnyEntity | null>(null);
  const [draft, setDraft] = useState<AnyEntity | null>(null);
  const [isEditMode, setEditMode] = useState(false);
  const [err, setErr] = useState("");
  const [deleteForm, setDeleteForm] = useState<AnyEntity>({});
  const [assignMode, setAssignMode] = useState<AssignMode>({ artistTrackAssignMode: "add", albumTrackAssignMode: "move" });
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const hiddenEditKeys = useMemo(() => new Set(["id", "audioUrl", "missingFile", "tracks", "albums", "likedTracks", "dislikedTracks", "likedPlaylists", "createdPlaylists"]), []);

  const loadList = () => api(`/${type}?search=${encodeURIComponent(search)}&page=${page}`)
    .then((payload) => {
      setList(payload);
      setErr("");
    })
    .catch((e) => setErr(e.message));

  useEffect(() => { loadList(); }, [type, search, page]);

  useEffect(() => {
    if (!selectedId) return;
    api(`/${type}/${selectedId}`).then((data) => {
      setEntity(data);
      setDraft(structuredClone(data));
      setEditMode(false);
      setErr("");
    }).catch((e) => setErr(e.message));
  }, [selectedId, type]);

  const createNew = async () => {
    const body = type === "users"
      ? { login: prompt("Логин", "new-user") || "new-user" }
      : type === "artists"
        ? { name: prompt("Имя автора", "New Artist") || "New Artist" }
        : { title: prompt("Название", "New") || "New" };

    const created = await api(`/${type}`, { method: "POST", body: JSON.stringify(body) });
    await loadList();
    setSelectedId(created.id);
  };

  const save = async () => {
    const payload = structuredClone(draft || {});
    if (type === "artists") payload.trackAssignMode = assignMode.artistTrackAssignMode;
    if (type === "albums") payload.trackAssignMode = assignMode.albumTrackAssignMode;
    await api(`/${type}/${selectedId}`, { method: "PUT", body: JSON.stringify(payload) });
    setEditMode(false);
    await loadList();
    const fresh = await api(`/${type}/${selectedId}`);
    setEntity(fresh);
    setDraft(structuredClone(fresh));
  };

  const remove = async () => {
    if (!confirm("Подтвердите удаление")) return;
    const payload: AnyEntity = {};
    if (type === "albums") {
      payload.reassignAlbumId = deleteForm.reassignAlbumId || null;
      payload.reassignAlbumTitle = (deleteForm.reassignAlbumTitle || "").trim() || null;
      payload.newAlbumArtistId = deleteForm.newAlbumArtistId || null;
      payload.newAlbumArtistName = (deleteForm.newAlbumArtistName || "").trim() || null;
    }
    if (type === "artists") {
      payload.reassignArtistId = deleteForm.reassignArtistId || null;
      payload.reassignArtistName = (deleteForm.reassignArtistName || "").trim() || null;
    }
    if (type === "users") {
      payload.reassignPlaylistOwnerId = deleteForm.reassignPlaylistOwnerId || null;
      payload.reassignPlaylistOwnerLogin = (deleteForm.reassignPlaylistOwnerLogin || "").trim() || null;
    }
    await api(`/${type}/${selectedId}`, { method: "DELETE", body: JSON.stringify(payload) });
    setSelectedId("");
    setEntity(null);
    setDraft(null);
    setEditMode(false);
    await loadList();
  };

  const toggleTrack = async (item: AnyEntity) => {
    const src = buildTrackAudioUrl(item.id);
    if (previewAudioRef.current && previewAudioRef.current.src === src && !previewAudioRef.current.paused) {
      previewAudioRef.current.pause();
      setPlayingTrackId(null);
      return;
    }
    if (previewAudioRef.current) previewAudioRef.current.pause();
    const audio = new Audio(src);
    previewAudioRef.current = audio;
    setPlayingTrackId(item.id);
    void audio.play().catch(() => setPlayingTrackId(null));
    audio.onended = () => setPlayingTrackId(null);
    audio.onpause = () => setPlayingTrackId((id) => (id === item.id ? null : id));
  };

  const quickDisable = async () => {
    if (!entity) return;
    await api(`/tracks/${entity.id}/quick-disable`, { method: "PATCH", body: JSON.stringify({ disabledManually: !entity.disabledManually }) });
    const fresh = await api(`/tracks/${entity.id}`);
    setEntity(fresh);
    setDraft(structuredClone(fresh));
    await loadList();
  };

  const cancelEdit = () => {
    setDraft(structuredClone(entity));
    setEditMode(false);
  };

  return {
    search,
    setSearch,
    page,
    setPage,
    list,
    selectedId,
    setSelectedId,
    entity,
    draft,
    setDraft,
    isEditMode,
    setEditMode,
    err,
    deleteForm,
    setDeleteForm,
    assignMode,
    setAssignMode,
    playingTrackId,
    hiddenEditKeys,
    createNew,
    save,
    remove,
    toggleTrack,
    quickDisable,
    cancelEdit,
  };
}
