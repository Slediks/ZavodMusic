from __future__ import annotations

import json
import os
import threading
import time
import uuid
from difflib import SequenceMatcher
from functools import wraps
import logging
from pathlib import Path
from typing import Any, Callable

from flask import Flask, jsonify, make_response, request, send_file

from scripts.admin_scan import run_scan

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

TRACKS_PATH = DATA_DIR / "tracks.json"
ALBUMS_PATH = DATA_DIR / "albums.json"
ARTISTS_PATH = DATA_DIR / "artists.json"
PLAYLISTS_PATH = DATA_DIR / "playlists.json"
USERS_PATH = DATA_DIR / "users.json"

SMART_EXCLUSION_PATHS = {
    "tracks": DATA_DIR / "smart_exclusions_tracks.json",
    "albums": DATA_DIR / "smart_exclusions_albums.json",
    "artists": DATA_DIR / "smart_exclusions_artists.json",
}

ADMIN_LOGIN = "admin"
ADMIN_PASSWORD = "zavod-admin"
PAGE_LIMIT = 100
SELECT_LIMIT = 100

app = Flask(__name__)
logger = logging.getLogger(__name__)

TOKENS: set[str] = set()
file_lock = threading.Lock()
scan_lock = threading.Lock()
smart_lock = threading.Lock()

scan_state: dict[str, Any] = {
    "running": False,
    "startedAt": None,
    "elapsedSec": 0,
    "totalFiles": 0,
    "processedFiles": 0,
    "etaSec": None,
    "result": None,
    "error": None,
    "stopRequested": False,
    "stopped": False,
}

smart_state: dict[str, Any] = {
    "running": False,
    "kind": None,
    "stopRequested": False,
    "stopped": False,
    "lastScore": None,
    "error": None,
}


TRANSLIT_MAP = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e", "ж": "zh", "з": "z", "и": "i", "й": "i",
    "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f",
    "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sh", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def read_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    try:
        with path.open("r", encoding="utf-8-sig") as f:
            raw = f.read().strip()
            if not raw:
                logger.warning("JSON file is empty, using fallback: %s", path)
                return fallback
            return json.loads(raw)
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Failed to read JSON from %s (%s), using fallback", path, exc)
        return fallback


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def read_all() -> dict[str, list[dict[str, Any]]]:
    return {
        "tracks": read_json(TRACKS_PATH, []),
        "albums": read_json(ALBUMS_PATH, []),
        "artists": read_json(ARTISTS_PATH, []),
        "playlists": read_json(PLAYLISTS_PATH, []),
        "users": read_json(USERS_PATH, []),
    }


def write_all(data: dict[str, list[dict[str, Any]]]) -> None:
    with file_lock:
        write_json(TRACKS_PATH, data["tracks"])
        write_json(ALBUMS_PATH, data["albums"])
        write_json(ARTISTS_PATH, data["artists"])
        write_json(PLAYLISTS_PATH, data["playlists"])
        write_json(USERS_PATH, data["users"])


def normalize_text(value: str | None) -> str:
    text = (value or "").lower().strip()
    translit = "".join(TRANSLIT_MAP.get(ch, ch) for ch in text)
    return "".join(ch for ch in translit if ch.isalnum())


def tokens(value: str | None) -> set[str]:
    src = normalize_text(value)
    if len(src) <= 2:
        return {src} if src else set()
    return {src[i:i + 3] for i in range(len(src) - 2)}


def similarity(a: str | None, b: str | None) -> float:
    na = normalize_text(a)
    nb = normalize_text(b)
    if not na or not nb:
        return 0.0
    seq = SequenceMatcher(None, na, nb).ratio()
    ta = tokens(a)
    tb = tokens(b)
    jac = (len(ta & tb) / len(ta | tb)) if (ta and tb) else 0.0
    prefix = 1.0 if na[:8] == nb[:8] else 0.0
    return 0.55 * seq + 0.35 * jac + 0.1 * prefix


def search_filter(items: list[dict[str, Any]], search: str, fields: list[str]) -> list[dict[str, Any]]:
    q = search.strip().lower()
    if not q:
        return items
    out: list[dict[str, Any]] = []
    for item in items:
        for field in fields:
            value = item.get(field)
            if isinstance(value, list):
                if any(q in str(v).lower() for v in value):
                    out.append(item)
                    break
            elif q in str(value or "").lower():
                out.append(item)
                break
    return out


def paginate(items: list[dict[str, Any]], page: int) -> dict[str, Any]:
    total = len(items)
    pages = 0 if total == 0 else (total + PAGE_LIMIT - 1) // PAGE_LIMIT
    safe_page = max(1, page)
    start = (safe_page - 1) * PAGE_LIMIT
    end = start + PAGE_LIMIT
    return {
        "items": items[start:end],
        "page": safe_page,
        "limit": PAGE_LIMIT,
        "total": total,
        "pages": pages,
    }


def parse_page() -> int:
    try:
        return max(1, int(request.args.get("page", "1")))
    except ValueError:
        return 1


def next_id(prefix: str, items: list[dict[str, Any]]) -> str:
    max_num = 0
    for item in items:
        sid = str(item.get("id", ""))
        if sid.startswith(prefix) and sid[len(prefix):].isdigit():
            max_num = max(max_num, int(sid[len(prefix):]))
    return f"{prefix}{max_num + 1}"


def error(status: int, message: str):
    return jsonify({"error": message}), status


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-Admin-Token", "").strip()
        if token not in TOKENS:
            return error(401, "Unauthorized")
        return fn(*args, **kwargs)
    return wrapper


def is_valid_token(token: str | None) -> bool:
    return bool(token and token in TOKENS)


def media_auth_ok() -> bool:
    header_token = request.headers.get("X-Admin-Token", "").strip()
    query_token = request.args.get("token", "").strip()
    return is_valid_token(header_token) or is_valid_token(query_token)


def resolve_static_file(static_url: str | None) -> Path | None:
    if not static_url:
        return None
    url = str(static_url).strip()
    if not url.startswith("/static/"):
        return None
    candidate = (BASE_DIR / url.lstrip("/")).resolve()
    static_root = (BASE_DIR / "static").resolve()
    try:
        candidate.relative_to(static_root)
    except ValueError:
        return None
    return candidate if candidate.exists() and candidate.is_file() else None


def apply_cors(response):
    origin = request.headers.get("Origin", "*")
    requested_headers = request.headers.get("Access-Control-Request-Headers", "")
    allow_headers = requested_headers or "Content-Type, X-Admin-Token, Authorization, Accept"

    response.headers["Access-Control-Allow-Origin"] = origin
    response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,PUT,DELETE,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = allow_headers
    response.headers["Access-Control-Max-Age"] = "86400"
    return response


@app.after_request
def after_request(response):
    return apply_cors(response)


@app.route("/admin/api/<path:_>", methods=["OPTIONS"])
@app.route("/admin/api", methods=["OPTIONS"])
def options_preflight(_: str | None = None):
    return apply_cors(make_response("", 204))


@app.route("/admin/api/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    login_value = str(payload.get("login", "")).strip()
    password = str(payload.get("password", "")).strip()
    if login_value != ADMIN_LOGIN or password != ADMIN_PASSWORD:
        return error(401, "Invalid credentials")
    token = str(uuid.uuid4())
    TOKENS.add(token)
    return jsonify({"token": token, "login": ADMIN_LOGIN})


def enrich_relations(data: dict[str, list[dict[str, Any]]]) -> None:
    artists_by_id = {a["id"]: a for a in data["artists"] if a.get("id")}
    albums_by_id = {a["id"]: a for a in data["albums"] if a.get("id")}

    for t in data["tracks"]:
        t["missingFile"] = bool(t.get("missingFile", False))
        t["disabledManually"] = bool(t.get("disabledManually", False))
        t["artistIds"] = [aid for aid in (t.get("artistIds") or []) if aid in artists_by_id]
        t["artistNames"] = [artists_by_id[aid]["name"] for aid in t["artistIds"]]
        album_id = t.get("albumId")
        if album_id and album_id in albums_by_id:
            t["albumTitle"] = albums_by_id[album_id].get("title", "")
        elif not album_id:
            t["albumTitle"] = ""

    tracks_by_id = {t["id"]: t for t in data["tracks"] if t.get("id")}
    for album in data["albums"]:
        album["trackIds"] = [tid for tid in (album.get("trackIds") or []) if tid in tracks_by_id]
        if not album["trackIds"]:
            album["trackIds"] = [t["id"] for t in data["tracks"] if t.get("albumId") == album.get("id")]
        album["artistIds"] = [aid for aid in (album.get("artistIds") or []) if aid in artists_by_id][:1]
        album["artistNames"] = [artists_by_id[aid]["name"] for aid in album["artistIds"]]

    albums_by_artist: dict[str, list[str]] = {}
    tracks_by_artist: dict[str, list[str]] = {}
    for album in data["albums"]:
        for aid in album.get("artistIds", []):
            albums_by_artist.setdefault(aid, []).append(album["id"])
    for track in data["tracks"]:
        for aid in track.get("artistIds", []):
            tracks_by_artist.setdefault(aid, []).append(track["id"])

    for artist in data["artists"]:
        aid = artist.get("id")
        artist["trackIds"] = sorted(set(tracks_by_artist.get(aid, [])))
        artist["albumIds"] = sorted(set(albums_by_artist.get(aid, [])))


def persist(data: dict[str, list[dict[str, Any]]]) -> None:
    enrich_relations(data)
    write_all(data)


def resolve_or_create_artist_id(data: dict[str, list[dict[str, Any]]], payload: dict[str, Any], id_key: str, name_key: str) -> str | None:
    artist_id = payload.get(id_key)
    if isinstance(artist_id, str) and artist_id:
        exists = next((a for a in data["artists"] if a.get("id") == artist_id), None)
        if exists:
            return artist_id
    new_name = str(payload.get(name_key, "")).strip()
    if not new_name:
        return None
    artist = {
        "id": next_id("a", data["artists"]),
        "name": new_name,
        "coverUrl": "",
        "trackIds": [],
        "albumIds": [],
    }
    data["artists"].append(artist)
    return artist["id"]


def resolve_or_create_album_id(data: dict[str, list[dict[str, Any]]], payload: dict[str, Any], id_key: str, title_key: str) -> str | None:
    album_id = payload.get(id_key)
    if isinstance(album_id, str) and album_id:
        exists = next((a for a in data["albums"] if a.get("id") == album_id), None)
        if exists:
            return album_id
    new_title = str(payload.get(title_key, "")).strip()
    if not new_title:
        return None
    artist_id = resolve_or_create_artist_id(data, payload, "newAlbumArtistId", "newAlbumArtistName")
    artist_name = next((a.get("name") for a in data["artists"] if a.get("id") == artist_id), None)
    album = {
        "id": next_id("al", data["albums"]),
        "title": new_title,
        "artistIds": [artist_id] if artist_id else [],
        "artistNames": [artist_name] if artist_name else [],
        "coverUrl": "",
        "trackIds": [],
    }
    data["albums"].append(album)
    return album["id"]


def resolve_or_create_user_id(data: dict[str, list[dict[str, Any]]], payload: dict[str, Any], id_key: str, login_key: str) -> str | None:
    user_id = payload.get(id_key)
    if isinstance(user_id, str) and user_id:
        exists = next((u for u in data["users"] if u.get("id") == user_id), None)
        if exists:
            return user_id
    login = str(payload.get(login_key, "")).strip()
    if not login:
        return None
    user = {
        "id": next_id("u", data["users"]),
        "login": login,
        "likedTrackIds": [],
        "dislikedTrackIds": [],
        "likedPlaylistIds": [],
        "blocked": False,
    }
    data["users"].append(user)
    return user["id"]


@app.route("/admin/api/select/<kind>", methods=["GET"])
@require_auth
def select_options(kind: str):
    q = request.args.get("q", "")
    data = read_all()
    if kind == "artists":
        items = search_filter(data["artists"], q, ["name"])
        return jsonify([{"id": a["id"], "label": a.get("name", "")} for a in items[:SELECT_LIMIT]])
    if kind == "albums":
        items = search_filter(data["albums"], q, ["title", "artistNames"])
        return jsonify([{"id": a["id"], "label": a.get("title", "")} for a in items[:SELECT_LIMIT]])
    if kind == "tracks":
        items = search_filter(data["tracks"], q, ["title", "artistNames", "albumTitle"])
        return jsonify([{"id": t["id"], "label": t.get("title", "")} for t in items[:SELECT_LIMIT]])
    if kind == "playlists":
        items = search_filter(data["playlists"], q, ["title", "ownerLogin"])
        return jsonify([{"id": p["id"], "label": p.get("title", "")} for p in items[:SELECT_LIMIT]])
    if kind == "users":
        items = search_filter(data["users"], q, ["login"])
        return jsonify([{"id": u["id"], "label": u.get("login", "")} for u in items[:SELECT_LIMIT]])
    return error(404, "Unknown selector")


@app.route("/admin/api/tracks", methods=["GET"])
@require_auth
def tracks_list():
    data = read_all()
    items = search_filter(data["tracks"], request.args.get("search", ""), ["title", "artistNames", "albumTitle"])
    return jsonify(paginate(items, parse_page()))


@app.route("/admin/api/tracks/<track_id>", methods=["GET", "PUT"])
@require_auth
def track_detail(track_id: str):
    data = read_all()
    track = next((t for t in data["tracks"] if t.get("id") == track_id), None)
    if not track:
        return error(404, "Track not found")
    if request.method == "GET":
        return jsonify(track)

    payload = request.get_json(silent=True) or {}
    for key in ["id", "audioUrl", "missingFile"]:
        payload.pop(key, None)
    if "artistIds" in payload and isinstance(payload["artistIds"], list):
        payload["artistIds"] = [aid for aid in payload["artistIds"] if isinstance(aid, str)]
    if "albumId" in payload and payload["albumId"] is not None and not isinstance(payload["albumId"], str):
        payload["albumId"] = None
    track.update(payload)
    persist(data)
    return jsonify(track)


@app.route("/admin/api/tracks/<track_id>/quick-disable", methods=["PATCH"])
@require_auth
def track_quick_disable(track_id: str):
    data = read_all()
    track = next((t for t in data["tracks"] if t.get("id") == track_id), None)
    if not track:
        return error(404, "Track not found")
    payload = request.get_json(silent=True) or {}
    track["disabledManually"] = bool(payload.get("disabledManually", True))
    persist(data)
    return jsonify(track)


@app.route("/admin/api/albums", methods=["GET", "POST"])
@require_auth
def albums_list_create():
    data = read_all()
    if request.method == "GET":
        items = search_filter(data["albums"], request.args.get("search", ""), ["title", "artistNames"])
        return jsonify(paginate(items, parse_page()))

    payload = request.get_json(silent=True) or {}
    album = {
        "id": next_id("al", data["albums"]),
        "title": str(payload.get("title", "")).strip() or "Untitled Album",
        "artistIds": [aid for aid in payload.get("artistIds", []) if isinstance(aid, str)][:1],
        "artistNames": [],
        "coverUrl": str(payload.get("coverUrl", "")).strip(),
        "trackIds": [tid for tid in payload.get("trackIds", []) if isinstance(tid, str)],
    }
    data["albums"].append(album)
    for t in data["tracks"]:
        if t.get("id") in album["trackIds"]:
            t["albumId"] = album["id"]
    persist(data)
    return jsonify(album), 201


@app.route("/admin/api/albums/<album_id>", methods=["GET", "PUT", "DELETE"])
@require_auth
def album_detail(album_id: str):
    data = read_all()
    album = next((a for a in data["albums"] if a.get("id") == album_id), None)
    if not album:
        return error(404, "Album not found")

    if request.method == "GET":
        tracks = [t for t in data["tracks"] if t.get("albumId") == album_id]
        return jsonify({**album, "tracks": tracks})

    if request.method == "PUT":
        payload = request.get_json(silent=True) or {}
        payload.pop("id", None)
        track_assign_mode = str(payload.get("trackAssignMode", "move")).strip().lower()
        if track_assign_mode not in {"move", "add"}:
            track_assign_mode = "move"
        old_track_ids = {t["id"] for t in data["tracks"] if t.get("albumId") == album_id}
        new_track_ids = set(payload.get("trackIds", old_track_ids))
        album.update({k: v for k, v in payload.items() if k != "trackIds"})
        for t in data["tracks"]:
            tid = t.get("id")
            if tid in old_track_ids and tid not in new_track_ids:
                t["albumId"] = None
                t["albumTitle"] = ""
            if tid in new_track_ids:
                if track_assign_mode == "add":
                    if not t.get("albumId"):
                        t["albumId"] = album_id
                else:
                    t["albumId"] = album_id
        persist(data)
        return jsonify(album)

    payload = request.get_json(silent=True) or {}
    reassign_album_id = resolve_or_create_album_id(data, payload, "reassignAlbumId", "reassignAlbumTitle")
    if reassign_album_id == album_id:
        reassign_album_id = None
    for t in data["tracks"]:
        if t.get("albumId") == album_id:
            t["albumId"] = reassign_album_id if isinstance(reassign_album_id, str) and reassign_album_id else None
            if not t["albumId"]:
                t["albumTitle"] = ""
    data["albums"] = [a for a in data["albums"] if a.get("id") != album_id]
    persist(data)
    return jsonify({"ok": True})


@app.route("/admin/api/artists", methods=["GET", "POST"])
@require_auth
def artists_list_create():
    data = read_all()
    if request.method == "GET":
        items = search_filter(data["artists"], request.args.get("search", ""), ["name"])
        return jsonify(paginate(items, parse_page()))

    payload = request.get_json(silent=True) or {}
    artist = {
        "id": next_id("a", data["artists"]),
        "name": str(payload.get("name", "")).strip() or "Unknown Artist",
        "coverUrl": str(payload.get("coverUrl", "")).strip(),
        "trackIds": [],
        "albumIds": [],
    }
    data["artists"].append(artist)
    persist(data)
    return jsonify(artist), 201


@app.route("/admin/api/artists/<artist_id>", methods=["GET", "PUT", "DELETE"])
@require_auth
def artist_detail(artist_id: str):
    data = read_all()
    artist = next((a for a in data["artists"] if a.get("id") == artist_id), None)
    if not artist:
        return error(404, "Artist not found")

    if request.method == "GET":
        tracks = [t for t in data["tracks"] if artist_id in (t.get("artistIds") or [])]
        albums = [a for a in data["albums"] if artist_id in (a.get("artistIds") or [])]
        return jsonify({**artist, "tracks": tracks, "albums": albums})

    if request.method == "PUT":
        payload = request.get_json(silent=True) or {}
        payload.pop("id", None)
        artist.update({k: v for k, v in payload.items() if k not in {"trackIds", "albumIds"}})
        track_assign_mode = str(payload.get("trackAssignMode", "add")).strip().lower()
        if track_assign_mode not in {"add", "replace"}:
            track_assign_mode = "add"

        if "trackIds" in payload:
            requested = set(payload.get("trackIds") or [])
            for t in data["tracks"]:
                ids = list(t.get("artistIds") or [])
                tid = t.get("id")
                if tid in requested and artist_id not in ids:
                    if track_assign_mode == "replace":
                        ids = [artist_id]
                    else:
                        ids.append(artist_id)
                if tid not in requested and artist_id in ids:
                    ids = [i for i in ids if i != artist_id]
                t["artistIds"] = ids

        if "albumIds" in payload:
            requested_albums = set(payload.get("albumIds") or [])
            for album in data["albums"]:
                aid = album.get("id")
                prev_album_artist = (album.get("artistIds") or [None])[0]
                if aid in requested_albums:
                    album["artistIds"] = [artist_id]
                    for t in data["tracks"]:
                        if t.get("albumId") == aid:
                            ids = list(t.get("artistIds") or [])
                            if prev_album_artist and prev_album_artist in ids:
                                changed = False
                                next_ids: list[str] = []
                                for current in ids:
                                    if not changed and current == prev_album_artist:
                                        next_ids.append(artist_id)
                                        changed = True
                                    else:
                                        next_ids.append(current)
                                ids = next_ids
                            elif artist_id not in ids:
                                ids.append(artist_id)
                            t["artistIds"] = ids
                elif artist_id in (album.get("artistIds") or []):
                    album["artistIds"] = []
                    for t in data["tracks"]:
                        if t.get("albumId") == aid:
                            t["artistIds"] = [i for i in (t.get("artistIds") or []) if i != artist_id]

        persist(data)
        return jsonify(artist)

    payload = request.get_json(silent=True) or {}
    reassign_artist_id = resolve_or_create_artist_id(data, payload, "reassignArtistId", "reassignArtistName")
    if reassign_artist_id == artist_id:
        reassign_artist_id = None

    for t in data["tracks"]:
        ids = [i for i in (t.get("artistIds") or []) if i != artist_id]
        if reassign_artist_id and reassign_artist_id not in ids:
            ids.append(reassign_artist_id)
        t["artistIds"] = ids

    for album in data["albums"]:
        if artist_id in (album.get("artistIds") or []):
            album["artistIds"] = [reassign_artist_id] if reassign_artist_id else []

    data["artists"] = [a for a in data["artists"] if a.get("id") != artist_id]
    persist(data)
    return jsonify({"ok": True})


@app.route("/admin/api/playlists", methods=["GET"])
@require_auth
def playlists_list():
    data = read_all()
    items = search_filter(data["playlists"], request.args.get("search", ""), ["title", "ownerLogin"])
    return jsonify(paginate(items, parse_page()))


@app.route("/admin/api/playlists/<playlist_id>", methods=["GET", "PUT", "DELETE"])
@require_auth
def playlist_detail(playlist_id: str):
    data = read_all()
    playlist = next((p for p in data["playlists"] if p.get("id") == playlist_id), None)
    if not playlist:
        return error(404, "Playlist not found")

    if request.method == "GET":
        tracks = [t for t in data["tracks"] if t.get("id") in (playlist.get("trackIds") or [])]
        return jsonify({**playlist, "tracks": tracks})

    if request.method == "PUT":
        payload = request.get_json(silent=True) or {}
        for key in ["id", "trackIds"]:
            payload.pop(key, None)
        playlist.update(payload)
        persist(data)
        return jsonify(playlist)

    data["playlists"] = [p for p in data["playlists"] if p.get("id") != playlist_id]
    for u in data["users"]:
        u["likedPlaylistIds"] = [pid for pid in (u.get("likedPlaylistIds") or []) if pid != playlist_id]
    persist(data)
    return jsonify({"ok": True})


@app.route("/admin/api/users", methods=["GET", "POST"])
@require_auth
def users_list_create():
    data = read_all()
    if request.method == "GET":
        items = search_filter(data["users"], request.args.get("search", ""), ["login"])
        return jsonify(paginate(items, parse_page()))

    payload = request.get_json(silent=True) or {}
    user = {
        "id": next_id("u", data["users"]),
        "login": str(payload.get("login", "")).strip() or "user",
        "likedTrackIds": [],
        "dislikedTrackIds": [],
        "likedPlaylistIds": [],
        "blocked": False,
    }
    data["users"].append(user)
    persist(data)
    return jsonify(user), 201


@app.route("/admin/api/users/<user_id>", methods=["GET", "PUT", "DELETE"])
@require_auth
def user_detail(user_id: str):
    data = read_all()
    user = next((u for u in data["users"] if u.get("id") == user_id), None)
    if not user:
        return error(404, "User not found")

    if request.method == "GET":
        liked_tracks = [t for t in data["tracks"] if t.get("id") in (user.get("likedTrackIds") or [])]
        disliked_tracks = [t for t in data["tracks"] if t.get("id") in (user.get("dislikedTrackIds") or [])]
        liked_playlists = [p for p in data["playlists"] if p.get("id") in (user.get("likedPlaylistIds") or [])]
        created_playlists = [p for p in data["playlists"] if p.get("ownerId") == user_id]
        return jsonify({
            **user,
            "likedTracks": liked_tracks,
            "dislikedTracks": disliked_tracks,
            "likedPlaylists": liked_playlists,
            "createdPlaylists": created_playlists,
        })

    if request.method == "PUT":
        payload = request.get_json(silent=True) or {}
        if "login" in payload:
            user["login"] = str(payload.get("login", "")).strip() or user["login"]
            for p in data["playlists"]:
                if p.get("ownerId") == user_id:
                    p["ownerLogin"] = user["login"]
        if "blocked" in payload:
            user["blocked"] = bool(payload.get("blocked"))
        persist(data)
        return jsonify(user)

    payload = request.get_json(silent=True) or {}
    new_owner_id = resolve_or_create_user_id(data, payload, "reassignPlaylistOwnerId", "reassignPlaylistOwnerLogin")
    if new_owner_id == user_id:
        return error(400, "New playlist owner must be different user")
    new_owner = next((u for u in data["users"] if u.get("id") == new_owner_id), None)
    if not new_owner:
        return error(400, "Need reassignPlaylistOwnerId")
    for p in data["playlists"]:
        if p.get("ownerId") == user_id:
            p["ownerId"] = new_owner_id
            p["ownerLogin"] = new_owner.get("login", "")
    data["users"] = [u for u in data["users"] if u.get("id") != user_id]
    persist(data)
    return jsonify({"ok": True})


def get_smart_exclusions(kind: str) -> dict[str, Any]:
    path = SMART_EXCLUSION_PATHS[kind]
    data = read_json(path, {"pairs": [], "excludedIds": []})
    data.setdefault("pairs", [])
    data.setdefault("excludedIds", [])
    return data


def write_smart_exclusions(kind: str, payload: dict[str, Any]) -> None:
    write_json(SMART_EXCLUSION_PATHS[kind], payload)


def sort_pair(a: str, b: str) -> tuple[str, str]:
    return (a, b) if a <= b else (b, a)


def smart_pair_score(kind: str, left: dict[str, Any], right: dict[str, Any]) -> float | None:
    if kind == "tracks":
        dur_l = int(left.get("duration", 0) or 0)
        dur_r = int(right.get("duration", 0) or 0)
        dur_diff = abs(dur_l - dur_r)
        if dur_diff > 5:
            return None
        dur_score = 1.0 if dur_diff <= 2 else 0.8

        score_title = similarity(left.get("title"), right.get("title"))
        if 0.45 * score_title + 0.25 + 0.2 * dur_score + 0.1 < 0.84:
            return None

        score_artist = similarity(" ".join(left.get("artistNames", [])), " ".join(right.get("artistNames", [])))
        if 0.45 * score_title + 0.25 * score_artist + 0.2 * dur_score + 0.1 < 0.84:
            return None

        file_score = similarity(str(left.get("audioUrl", "")).split("/")[-1], str(right.get("audioUrl", "")).split("/")[-1])
        score = 0.45 * score_title + 0.25 * score_artist + 0.2 * dur_score + 0.1 * file_score
        return score if score >= 0.84 else None

    if kind == "albums":
        score_title = similarity(left.get("title"), right.get("title"))
        if 0.68 * score_title + 0.32 < 0.87:
            return None
        score_artist = similarity(" ".join(left.get("artistNames", [])), " ".join(right.get("artistNames", [])))
        score = 0.68 * score_title + 0.32 * score_artist
        return score if score >= 0.87 else None

    score = similarity(left.get("name"), right.get("name"))
    return score if score >= 0.9 else None


@app.route("/admin/api/smart-search/<kind>/next", methods=["GET"])
@require_auth
def smart_next(kind: str):
    if kind not in {"tracks", "albums", "artists"}:
        return error(404, "Unknown smart-search kind")
    with smart_lock:
        if smart_state["running"]:
            return error(409, "Smart search already running")
        smart_state.update({
            "running": True,
            "kind": kind,
            "stopRequested": False,
            "stopped": False,
            "lastScore": None,
            "error": None,
        })

    data = read_all()
    exclusions = get_smart_exclusions(kind)
    excluded_ids = set(exclusions.get("excludedIds", []))
    excluded_pairs = {
        sort_pair(str(p[0]), str(p[1]))
        for p in exclusions.get("pairs", [])
        if isinstance(p, list) and len(p) == 2
    }

    try:
        items = data[kind]
        for left in items:
            if smart_state.get("stopRequested"):
                smart_state["stopped"] = True
                return jsonify({"pair": None, "stopped": True})

            left_id = str(left.get("id") or "")
            if not left_id or left_id in excluded_ids:
                continue

            best_right: dict[str, Any] | None = None
            best_score: float | None = None
            for right in items:
                right_id = str(right.get("id") or "")
                if not right_id or right_id == left_id or right_id in excluded_ids:
                    continue
                pair = sort_pair(left_id, right_id)
                if pair in excluded_pairs:
                    continue

                score = smart_pair_score(kind, left, right)
                if score is None:
                    continue
                if best_score is None or score > best_score:
                    best_score = score
                    best_right = right

            if best_right is not None and best_score is not None:
                smart_state["lastScore"] = round(best_score, 4)
                return jsonify({"pair": [left, best_right], "score": round(best_score, 4), "stopped": False})

            # Автоматически исключаем объект без совпадений.
            excluded_ids.add(left_id)
            exclusions["excludedIds"] = sorted(excluded_ids)
            exclusions["pairs"] = [p for p in exclusions.get("pairs", []) if left_id not in p]
            write_smart_exclusions(kind, exclusions)

        return jsonify({"pair": None, "stopped": False})
    except Exception as exc:
        smart_state["error"] = str(exc)
        raise
    finally:
        smart_state["running"] = False


@app.route("/admin/api/smart-search/<kind>/stop", methods=["POST"])
@require_auth
def smart_stop(kind: str):
    if kind not in {"tracks", "albums", "artists"}:
        return error(404, "Unknown smart-search kind")
    with smart_lock:
        if smart_state.get("running") and smart_state.get("kind") == kind:
            smart_state["stopRequested"] = True
            return jsonify({"ok": True, "requested": True})
    return jsonify({"ok": True, "requested": False})


@app.route("/admin/api/smart-search/status", methods=["GET"])
@require_auth
def smart_status():
    return jsonify(smart_state)


@app.route("/admin/api/smart-search/<kind>/ignore-pair", methods=["POST"])
@require_auth
def smart_ignore_pair(kind: str):
    if kind not in {"tracks", "albums", "artists"}:
        return error(404, "Unknown smart-search kind")
    payload = request.get_json(silent=True) or {}
    left_id = str(payload.get("leftId", ""))
    right_id = str(payload.get("rightId", ""))
    if not left_id or not right_id:
        return error(400, "Need leftId and rightId")

    exclusions = get_smart_exclusions(kind)
    pair = sort_pair(left_id, right_id)
    if pair not in exclusions["pairs"]:
        exclusions["pairs"].append(pair)
    write_smart_exclusions(kind, exclusions)
    return jsonify({"ok": True})


@app.route("/admin/api/smart-search/<kind>/exclude-id", methods=["POST"])
@require_auth
def smart_exclude_id(kind: str):
    if kind not in {"tracks", "albums", "artists"}:
        return error(404, "Unknown smart-search kind")
    payload = request.get_json(silent=True) or {}
    item_id = str(payload.get("id", ""))
    if not item_id:
        return error(400, "Need id")
    exclusions = get_smart_exclusions(kind)
    ids = set(exclusions.get("excludedIds", []))
    ids.add(item_id)
    exclusions["excludedIds"] = sorted(ids)
    exclusions["pairs"] = [p for p in exclusions.get("pairs", []) if item_id not in p]
    write_smart_exclusions(kind, exclusions)
    return jsonify({"ok": True})


@app.route("/admin/api/smart-search/<kind>/safe-remove", methods=["POST"])
@require_auth
def smart_safe_remove(kind: str):
    if kind not in {"tracks", "albums", "artists"}:
        return error(404, "Unknown smart-search kind")
    payload = request.get_json(silent=True) or {}
    source_id = str(payload.get("sourceId", ""))
    target_id = str(payload.get("targetId", ""))
    if not source_id or not target_id or source_id == target_id:
        return error(400, "Need distinct sourceId and targetId")

    data = read_all()
    if kind == "tracks":
        source = next((t for t in data["tracks"] if t.get("id") == source_id), None)
        target = next((t for t in data["tracks"] if t.get("id") == target_id), None)
        if not source or not target:
            return error(404, "Track not found")
        source["disabledManually"] = True
        persist(data)
    elif kind == "albums":
        source = next((a for a in data["albums"] if a.get("id") == source_id), None)
        target = next((a for a in data["albums"] if a.get("id") == target_id), None)
        if not source or not target:
            return error(404, "Album not found")
        for track in data["tracks"]:
            if track.get("albumId") == source_id:
                track["albumId"] = target_id
        data["albums"] = [a for a in data["albums"] if a.get("id") != source_id]
        persist(data)
    else:
        source = next((a for a in data["artists"] if a.get("id") == source_id), None)
        target = next((a for a in data["artists"] if a.get("id") == target_id), None)
        if not source or not target:
            return error(404, "Artist not found")
        for track in data["tracks"]:
            ids = list(track.get("artistIds") or [])
            if source_id in ids:
                ids = [target_id if i == source_id else i for i in ids]
                # remove duplicates preserving order
                dedup: list[str] = []
                for i in ids:
                    if i not in dedup:
                        dedup.append(i)
                track["artistIds"] = dedup
        for album in data["albums"]:
            ids = list(album.get("artistIds") or [])
            if source_id in ids:
                ids = [target_id if i == source_id else i for i in ids]
                dedup: list[str] = []
                for i in ids:
                    if i not in dedup:
                        dedup.append(i)
                album["artistIds"] = dedup[:1]
        data["artists"] = [a for a in data["artists"] if a.get("id") != source_id]
        persist(data)

    exclusions = get_smart_exclusions(kind)
    ids = set(exclusions.get("excludedIds", []))
    ids.add(source_id)
    exclusions["excludedIds"] = sorted(ids)
    exclusions["pairs"] = [p for p in exclusions.get("pairs", []) if source_id not in p]
    write_smart_exclusions(kind, exclusions)
    return jsonify({"ok": True})


@app.route("/admin/api/scan/status", methods=["GET"])
@require_auth
def scan_status():
    return jsonify(scan_state)


@app.route("/admin/api/scan/start", methods=["POST"])
@require_auth
def scan_start():
    with scan_lock:
        if scan_state["running"]:
            return error(409, "Scan already running")
        scan_state.update({
            "running": True,
            "startedAt": time.time(),
            "elapsedSec": 0,
            "totalFiles": 0,
            "processedFiles": 0,
            "etaSec": None,
            "result": None,
            "error": None,
            "stopRequested": False,
            "stopped": False,
        })

    def progress_cb(progress: dict[str, Any]) -> None:
        scan_state.update(progress)
        if scan_state.get("startedAt"):
            scan_state["elapsedSec"] = int(time.time() - float(scan_state["startedAt"]))

    def worker() -> None:
        try:
            result = run_scan(progress_cb, should_stop=lambda: bool(scan_state.get("stopRequested")))
            scan_state["result"] = result
            scan_state["stopped"] = bool(result.get("stopped", False))
        except Exception as exc:
            scan_state["error"] = str(exc)
        finally:
            scan_state["running"] = False
            if scan_state.get("startedAt"):
                scan_state["elapsedSec"] = int(time.time() - float(scan_state["startedAt"]))

    threading.Thread(target=worker, daemon=True).start()
    return jsonify({"ok": True})


@app.route("/admin/api/scan/stop", methods=["POST"])
@require_auth
def scan_stop():
    with scan_lock:
        if not scan_state["running"]:
            return jsonify({"ok": True, "requested": False})
        scan_state["stopRequested"] = True
    return jsonify({"ok": True, "requested": True})


@app.route("/admin/api/media/track/<track_id>/audio", methods=["GET"])
def media_track_audio(track_id: str):
    if not media_auth_ok():
        return error(401, "Unauthorized")
    data = read_all()
    track = next((t for t in data["tracks"] if t.get("id") == track_id), None)
    if not track:
        return error(404, "Track not found")
    file_path = resolve_static_file(track.get("audioUrl"))
    if not file_path:
        return error(404, "Audio file not found")
    return send_file(file_path, conditional=True)


@app.route("/admin/api/media/cover", methods=["GET"])
def media_cover():
    if not media_auth_ok():
        return error(401, "Unauthorized")
    static_url = request.args.get("path", "")
    file_path = resolve_static_file(static_url)
    if not file_path:
        return error(404, "Cover not found")
    return send_file(file_path, conditional=True)


if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("APP_PORT", "5051")),
        debug=os.getenv("APP_DEBUG", "1") == "1",
    )
