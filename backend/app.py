from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

from flask import Flask, jsonify, make_response, request, send_file

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

USERS_PATH = DATA_DIR / "users.json"
TRACKS_PATH = DATA_DIR / "tracks.json"
PLAYLISTS_PATH = DATA_DIR / "playlists.json"
ARTISTS_PATH = DATA_DIR / "artists.json"
ALBUMS_PATH = DATA_DIR / "albums.json"

ALLOWED_TRACK_SORT_FIELDS = {"title", "albumTitle", "duration"}
ALLOWED_LIMITS = {20, 24, 48, 50, 100}
DEFAULT_LIMIT = 20

users_lock = threading.Lock()
playlists_lock = threading.Lock()

app = Flask(__name__)


def read_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def write_json(path: Path, payload: Any) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def write_users(payload: Any) -> None:
    with users_lock:
        write_json(USERS_PATH, payload)


def write_playlists(payload: Any) -> None:
    with playlists_lock:
        write_json(PLAYLISTS_PATH, payload)


def error_response(status_code: int, error: str, message: str):
    return jsonify({"error": error, "message": message}), status_code


def parse_positive_int(raw_value: str | None, fallback: int) -> int:
    try:
        parsed = int(raw_value) if raw_value is not None else fallback
    except (TypeError, ValueError):
        return fallback
    return parsed if parsed > 0 else fallback


def parse_pagination_params() -> tuple[int, int]:
    page = parse_positive_int(request.args.get("page"), 1)
    limit = parse_positive_int(request.args.get("limit"), DEFAULT_LIMIT)
    if limit not in ALLOWED_LIMITS:
        limit = DEFAULT_LIMIT
    return page, limit


def paginate(items: list[Any], page: int, limit: int) -> dict[str, Any]:
    total = len(items)
    pages = 0 if total == 0 else (total + limit - 1) // limit
    start = (page - 1) * limit
    end = start + limit
    return {
        "items": items[start:end],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


def apply_manual_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,PATCH,DELETE,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type,X-User-Login"
    return response


@app.after_request
def after_request(response):
    return apply_manual_cors(response)


@app.route("/api/<path:_any>", methods=["OPTIONS"])
@app.route("/api", methods=["OPTIONS"])
def options_preflight(_any: str | None = None):
    return apply_manual_cors(make_response("", 204))


def get_authenticated_user() -> dict[str, Any] | None:
    login = request.headers.get("X-User-Login", "").strip()
    if not login:
        return None
    users = read_json(USERS_PATH)
    return next((u for u in users if str(u.get("login", "")).lower() == login.lower()), None)


def get_authenticated_user_or_error():
    user = get_authenticated_user()
    if not user:
        return None, error_response(401, "UNAUTHORIZED", "Требуется заголовок X-User-Login")
    return user, None


def is_track_available(track: dict[str, Any]) -> bool:
    return not bool(track.get("missingFile", False)) and not bool(track.get("disabledManually", False))


def public_track(track: dict[str, Any]) -> dict[str, Any]:
    return {
        key: value
        for key, value in track.items()
        if key not in {"missingFile", "disabledManually", "coverUrl", "audioUrl"}
    }


def get_all_available_tracks() -> list[dict[str, Any]]:
    return [track for track in read_json(TRACKS_PATH) if is_track_available(track)]


def get_available_track_by_id(track_id: str) -> dict[str, Any] | None:
    return next((t for t in get_all_available_tracks() if t.get("id") == track_id), None)


def resolve_static_path(static_url: str | None) -> Path | None:
    if not static_url:
        return None
    clean = str(static_url).strip()
    if not clean.startswith("/static/"):
        return None
    abs_path = (BASE_DIR / clean.lstrip("/")).resolve()
    static_root = (BASE_DIR / "static").resolve()
    try:
        abs_path.relative_to(static_root)
    except ValueError:
        return None
    return abs_path if abs_path.exists() and abs_path.is_file() else None


def build_available_track_map() -> dict[str, dict[str, Any]]:
    return {track["id"]: track for track in get_all_available_tracks()}


def summarize_playlist(playlist: dict[str, Any], available_track_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    available_tracks = [available_track_map[tid] for tid in playlist.get("trackIds", []) if tid in available_track_map]
    own_cover_url = playlist.get("coverUrl")
    cover_url = own_cover_url if resolve_static_path(own_cover_url) else next((t.get("coverUrl") for t in available_tracks if t.get("coverUrl")), None)
    public_playlist = {key: value for key, value in playlist.items() if key not in {"coverTrackId", "coverUrl"}}
    return {
        **public_playlist,
        "trackIds": [t["id"] for t in available_tracks],
        "tracksCount": len(available_tracks),
        "duration": sum(int(t.get("duration", 0) or 0) for t in available_tracks),
        "coverExists": bool(resolve_static_path(cover_url)),
    }


def filter_by_search(items: list[dict[str, Any]], fields: list[str], query: str) -> list[dict[str, Any]]:
    q = query.strip().lower()
    if not q:
        return items

    filtered: list[dict[str, Any]] = []
    for item in items:
        for field in fields:
            value = item.get(field)
            if isinstance(value, list):
                if any(q in str(v).lower() for v in value):
                    filtered.append(item)
                    break
            elif q in str(value or "").lower():
                filtered.append(item)
                break
    return filtered


def get_playlist_or_404(playlists: list[dict[str, Any]], playlist_id: str) -> dict[str, Any] | None:
    return next((p for p in playlists if p.get("id") == playlist_id), None)


def build_next_playlist_id(playlists: list[dict[str, Any]]) -> str:
    max_num = 0
    for playlist in playlists:
        pid = str(playlist.get("id", ""))
        if pid.startswith("p") and pid[1:].isdigit():
            max_num = max(max_num, int(pid[1:]))
    return f"p{max_num + 1}"


def get_artist_by_id(artist_id: str) -> dict[str, Any] | None:
    artists = read_json(ARTISTS_PATH)
    return next((a for a in artists if a.get("id") == artist_id), None)


def get_album_by_id(album_id: str) -> dict[str, Any] | None:
    albums = read_json(ALBUMS_PATH)
    return next((a for a in albums if a.get("id") == album_id), None)


@app.route("/api/auth/login", methods=["POST"])
def login():
    payload = request.get_json(silent=True) or {}
    login_value = str(payload.get("login", "")).strip()

    if not login_value:
        return error_response(400, "VALIDATION_ERROR", "Login is required")

    users = read_json(USERS_PATH)
    match = next((u for u in users if str(u.get("login", "")).lower() == login_value.lower()), None)
    if not match:
        return error_response(404, "USER_NOT_FOUND", "Пользователь не найден")

    return jsonify(match)


@app.route("/api/tracks", methods=["GET"])
def get_tracks():
    tracks = get_all_available_tracks()
    tracks = filter_by_search(tracks, ["title", "artistNames", "albumTitle"], request.args.get("search", ""))

    sort_by = request.args.get("sortBy", "title")
    sort_direction = request.args.get("sortDirection", "asc").lower()
    if sort_by not in ALLOWED_TRACK_SORT_FIELDS:
        sort_by = "title"
    reverse = sort_direction == "desc"

    def sort_key(track: dict[str, Any]):
        value = track.get(sort_by)
        if isinstance(value, str):
            return value.lower()
        return value

    tracks.sort(key=sort_key, reverse=reverse)
    page, limit = parse_pagination_params()
    return jsonify(paginate([public_track(t) for t in tracks], page, limit))


@app.route("/api/tracks/favorites", methods=["GET"])
def get_favorite_tracks():
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    tracks = get_all_available_tracks()
    tracks_by_id = {t.get("id"): t for t in tracks}
    liked_ids = [tid for tid in user.get("likedTrackIds", []) if tid in tracks_by_id]
    favorite_tracks = [tracks_by_id[tid] for tid in liked_ids]
    favorite_tracks = filter_by_search(favorite_tracks, ["title", "artistNames", "albumTitle"], request.args.get("search", ""))

    page, limit = parse_pagination_params()
    return jsonify(paginate([public_track(t) for t in favorite_tracks], page, limit))


def update_user_reaction(track_id: str, action: str, add: bool):
    users = read_json(USERS_PATH)
    tracks = read_json(TRACKS_PATH)
    if not any(t.get("id") == track_id and is_track_available(t) for t in tracks):
        return error_response(404, "TRACK_NOT_FOUND", "Трек не найден")

    login = request.headers.get("X-User-Login", "").strip().lower()
    if not login:
        return error_response(401, "UNAUTHORIZED", "Требуется заголовок X-User-Login")

    idx = next((i for i, u in enumerate(users) if str(u.get("login", "")).lower() == login), None)
    if idx is None:
        return error_response(404, "USER_NOT_FOUND", "Пользователь не найден")

    user = users[idx]
    liked = list(user.get("likedTrackIds", []))
    disliked = list(user.get("dislikedTrackIds", []))

    def add_unique(items: list[str], item: str) -> list[str]:
        if item in items:
            return items
        return [item, *items]

    def remove_item(items: list[str], item: str) -> list[str]:
        return [value for value in items if value != item]

    if action == "like":
        if add:
            liked = add_unique(liked, track_id)
            disliked = remove_item(disliked, track_id)
        else:
            liked = remove_item(liked, track_id)
    else:
        if add:
            disliked = add_unique(disliked, track_id)
            liked = remove_item(liked, track_id)
        else:
            disliked = remove_item(disliked, track_id)

    user["likedTrackIds"] = liked
    user["dislikedTrackIds"] = disliked
    users[idx] = user
    write_users(users)
    return jsonify(user)


@app.route("/api/tracks/<track_id>/like", methods=["POST"])
def like_track(track_id: str):
    return update_user_reaction(track_id, "like", True)


@app.route("/api/tracks/<track_id>/like", methods=["DELETE"])
def unlike_track(track_id: str):
    return update_user_reaction(track_id, "like", False)


@app.route("/api/tracks/<track_id>/dislike", methods=["POST"])
def dislike_track(track_id: str):
    return update_user_reaction(track_id, "dislike", True)


@app.route("/api/tracks/<track_id>/dislike", methods=["DELETE"])
def undislike_track(track_id: str):
    return update_user_reaction(track_id, "dislike", False)


@app.route("/api/tracks/<track_id>/audio", methods=["GET"])
def get_track_audio(track_id: str):
    track = get_available_track_by_id(track_id)
    if not track:
        return error_response(404, "TRACK_NOT_FOUND", "Трек не найден")
    audio_path = resolve_static_path(track.get("audioUrl"))
    if not audio_path:
        return error_response(404, "TRACK_AUDIO_NOT_FOUND", "Аудиофайл не найден")
    return send_file(audio_path, conditional=True)


@app.route("/api/tracks/<track_id>/cover", methods=["GET"])
def get_track_cover(track_id: str):
    track = get_available_track_by_id(track_id)
    if not track:
        return error_response(404, "TRACK_NOT_FOUND", "Трек не найден")
    cover_path = resolve_static_path(track.get("coverUrl"))
    if not cover_path:
        return error_response(404, "TRACK_COVER_NOT_FOUND", "Обложка не найдена")
    return send_file(cover_path, conditional=True)


@app.route("/api/artists/<artist_id>/cover", methods=["GET"])
def get_artist_cover(artist_id: str):
    artist = get_artist_by_id(artist_id)
    if not artist:
        return error_response(404, "ARTIST_NOT_FOUND", "Исполнитель не найден")
    cover_path = resolve_static_path(artist.get("coverUrl"))
    if not cover_path:
        tracks = [t for t in get_all_available_tracks() if artist_id in t.get("artistIds", [])]
        track_cover_url = next((t.get("coverUrl") for t in tracks if t.get("coverUrl")), None)
        cover_path = resolve_static_path(track_cover_url)
    if not cover_path:
        return error_response(404, "ARTIST_COVER_NOT_FOUND", "Обложка не найдена")
    return send_file(cover_path, conditional=True)


@app.route("/api/albums/<album_id>/cover", methods=["GET"])
def get_album_cover(album_id: str):
    album = get_album_by_id(album_id)
    if not album:
        return error_response(404, "ALBUM_NOT_FOUND", "Альбом не найден")
    cover_path = resolve_static_path(album.get("coverUrl"))
    if not cover_path:
        tracks = [t for t in get_all_available_tracks() if t.get("albumId") == album_id]
        track_cover_url = next((t.get("coverUrl") for t in tracks if t.get("coverUrl")), None)
        cover_path = resolve_static_path(track_cover_url)
    if not cover_path:
        return error_response(404, "ALBUM_COVER_NOT_FOUND", "Обложка не найдена")
    return send_file(cover_path, conditional=True)


@app.route("/api/playlists/<playlist_id>/cover", methods=["GET"])
def get_playlist_cover(playlist_id: str):
    playlists = read_json(PLAYLISTS_PATH)
    playlist = get_playlist_or_404(playlists, playlist_id)
    if not playlist:
        return error_response(404, "PLAYLIST_NOT_FOUND", "Плейлист не найден")

    track_map = build_available_track_map()
    summarized = summarize_playlist(playlist, track_map)
    if not summarized.get("coverExists"):
        return error_response(404, "PLAYLIST_COVER_NOT_FOUND", "Обложка не найдена")
    own_cover_url = playlist.get("coverUrl")
    track_cover_url = own_cover_url if resolve_static_path(own_cover_url) else next(
        (track_map[tid].get("coverUrl") for tid in summarized.get("trackIds", []) if tid in track_map and track_map[tid].get("coverUrl")),
        None,
    )
    cover_path = resolve_static_path(track_cover_url)
    if not cover_path:
        return error_response(404, "PLAYLIST_COVER_NOT_FOUND", "Обложка не найдена")
    return send_file(cover_path, conditional=True)


@app.route("/api/playlists/my", methods=["GET"])
def get_my_playlists():
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    playlists = read_json(PLAYLISTS_PATH)
    track_map = build_available_track_map()
    summarized = [summarize_playlist(p, track_map) for p in playlists]

    own = [p for p in summarized if p.get("ownerId") == user.get("id")]
    liked_ids = set(user.get("likedPlaylistIds", []))
    liked = [p for p in summarized if p.get("id") in liked_ids and p.get("ownerId") != user.get("id")]

    search = request.args.get("search", "")
    own = filter_by_search(own, ["title", "description", "ownerLogin"], search)
    liked = filter_by_search(liked, ["title", "description", "ownerLogin"], search)

    page, limit = parse_pagination_params()
    return jsonify({"own": paginate(own, page, limit), "liked": paginate(liked, page, limit)})


@app.route("/api/playlists/public", methods=["GET"])
def get_public_playlists():
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    playlists = read_json(PLAYLISTS_PATH)
    track_map = build_available_track_map()
    public_list = [
        summarize_playlist(p, track_map)
        for p in playlists
        if p.get("isPublic") is True
    ]

    public_list = filter_by_search(public_list, ["title", "description", "ownerLogin"], request.args.get("search", ""))
    page, limit = parse_pagination_params()
    return jsonify(paginate(public_list, page, limit))


@app.route("/api/playlists/<playlist_id>", methods=["GET"])
def get_playlist(playlist_id: str):
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    playlists = read_json(PLAYLISTS_PATH)
    playlist = get_playlist_or_404(playlists, playlist_id)
    if not playlist:
        return error_response(404, "PLAYLIST_NOT_FOUND", "Плейлист не найден")

    track_map = build_available_track_map()
    summarized = summarize_playlist(playlist, track_map)
    track_items = [public_track(track_map[tid]) for tid in summarized.get("trackIds", []) if tid in track_map]
    return jsonify({**summarized, "tracks": track_items})


@app.route("/api/playlists", methods=["POST"])
def create_playlist():
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title", "")).strip()
    description = str(payload.get("description", "")).strip()
    is_public = bool(payload.get("isPublic", False))

    if not title:
        return error_response(400, "VALIDATION_ERROR", "Название плейлиста обязательно")

    playlists = read_json(PLAYLISTS_PATH)
    playlist = {
        "id": build_next_playlist_id(playlists),
        "title": title,
        "description": description,
        "ownerId": user.get("id"),
        "ownerLogin": user.get("login"),
        "isPublic": is_public,
        "trackIds": [],
    }
    playlists.append(playlist)
    write_playlists(playlists)

    track_map = build_available_track_map()
    return jsonify(summarize_playlist(playlist, track_map)), 201


@app.route("/api/playlists/<playlist_id>", methods=["PATCH"])
def update_playlist(playlist_id: str):
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    playlists = read_json(PLAYLISTS_PATH)
    idx = next((i for i, p in enumerate(playlists) if p.get("id") == playlist_id), None)
    if idx is None:
        return error_response(404, "PLAYLIST_NOT_FOUND", "Плейлист не найден")

    if playlists[idx].get("ownerId") != user.get("id"):
        return error_response(403, "FORBIDDEN", "Недостаточно прав")

    payload = request.get_json(silent=True) or {}
    if "title" in payload:
        title = str(payload.get("title", "")).strip()
        if not title:
            return error_response(400, "VALIDATION_ERROR", "Название плейлиста обязательно")
        playlists[idx]["title"] = title
    if "description" in payload:
        playlists[idx]["description"] = str(payload.get("description", "")).strip()
    if "isPublic" in payload:
        playlists[idx]["isPublic"] = bool(payload.get("isPublic"))

    write_playlists(playlists)
    track_map = build_available_track_map()
    return jsonify(summarize_playlist(playlists[idx], track_map))


@app.route("/api/playlists/<playlist_id>", methods=["DELETE"])
def delete_playlist(playlist_id: str):
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    playlists = read_json(PLAYLISTS_PATH)
    playlist = get_playlist_or_404(playlists, playlist_id)
    if not playlist:
        return error_response(404, "PLAYLIST_NOT_FOUND", "Плейлист не найден")
    if playlist.get("ownerId") != user.get("id"):
        return error_response(403, "FORBIDDEN", "Недостаточно прав")

    playlists = [p for p in playlists if p.get("id") != playlist_id]
    write_playlists(playlists)

    users = read_json(USERS_PATH)
    for item in users:
        liked = [pid for pid in item.get("likedPlaylistIds", []) if pid != playlist_id]
        item["likedPlaylistIds"] = liked
    write_users(users)

    return jsonify({"ok": True})


@app.route("/api/playlists/<playlist_id>/tracks", methods=["POST"])
def add_track_to_playlist(playlist_id: str):
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    payload = request.get_json(silent=True) or {}
    track_id = str(payload.get("trackId", "")).strip()
    if not track_id:
        return error_response(400, "VALIDATION_ERROR", "trackId обязателен")

    playlists = read_json(PLAYLISTS_PATH)
    idx = next((i for i, p in enumerate(playlists) if p.get("id") == playlist_id), None)
    if idx is None:
        return error_response(404, "PLAYLIST_NOT_FOUND", "Плейлист не найден")
    if playlists[idx].get("ownerId") != user.get("id"):
        return error_response(403, "FORBIDDEN", "Недостаточно прав")

    track_map = build_available_track_map()
    if track_id not in track_map:
        return error_response(404, "TRACK_NOT_FOUND", "Трек не найден")

    if track_id not in playlists[idx].get("trackIds", []):
        playlists[idx].setdefault("trackIds", []).insert(0, track_id)
        track_cover_url = track_map[track_id].get("coverUrl")
        if resolve_static_path(track_cover_url):
            playlists[idx]["coverUrl"] = track_cover_url
        write_playlists(playlists)

    return jsonify(summarize_playlist(playlists[idx], track_map))


@app.route("/api/playlists/<playlist_id>/tracks/<track_id>", methods=["DELETE"])
def remove_track_from_playlist(playlist_id: str, track_id: str):
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    playlists = read_json(PLAYLISTS_PATH)
    idx = next((i for i, p in enumerate(playlists) if p.get("id") == playlist_id), None)
    if idx is None:
        return error_response(404, "PLAYLIST_NOT_FOUND", "Плейлист не найден")
    if playlists[idx].get("ownerId") != user.get("id"):
        return error_response(403, "FORBIDDEN", "Недостаточно прав")

    playlists[idx]["trackIds"] = [tid for tid in playlists[idx].get("trackIds", []) if tid != track_id]
    track_map = build_available_track_map()
    removed_track_cover_url = track_map.get(track_id, {}).get("coverUrl")
    if playlists[idx].get("coverUrl") and playlists[idx].get("coverUrl") == removed_track_cover_url:
        next_cover_url = next(
            (track_map[tid].get("coverUrl") for tid in playlists[idx]["trackIds"] if tid in track_map and resolve_static_path(track_map[tid].get("coverUrl"))),
            None,
        )
        if next_cover_url:
            playlists[idx]["coverUrl"] = next_cover_url
        else:
            playlists[idx].pop("coverUrl", None)
    write_playlists(playlists)
    track_map = build_available_track_map()
    return jsonify(summarize_playlist(playlists[idx], track_map))


@app.route("/api/playlists/<playlist_id>/tracks/reorder", methods=["PATCH"])
def reorder_playlist_tracks(playlist_id: str):
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    playlists = read_json(PLAYLISTS_PATH)
    idx = next((i for i, p in enumerate(playlists) if p.get("id") == playlist_id), None)
    if idx is None:
        return error_response(404, "PLAYLIST_NOT_FOUND", "Плейлист не найден")
    if playlists[idx].get("ownerId") != user.get("id"):
        return error_response(403, "FORBIDDEN", "Недостаточно прав")

    payload = request.get_json(silent=True) or {}
    ordered_ids = payload.get("trackIds")
    if not isinstance(ordered_ids, list) or not all(isinstance(x, str) for x in ordered_ids):
        return error_response(400, "VALIDATION_ERROR", "trackIds должен быть массивом строк")

    current_ids = playlists[idx].get("trackIds", [])
    if sorted(current_ids) != sorted(ordered_ids):
        return error_response(400, "VALIDATION_ERROR", "Набор trackIds не совпадает с плейлистом")

    playlists[idx]["trackIds"] = ordered_ids
    write_playlists(playlists)
    track_map = build_available_track_map()
    return jsonify(summarize_playlist(playlists[idx], track_map))


@app.route("/api/playlists/<playlist_id>/like", methods=["POST"])
def like_playlist(playlist_id: str):
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    playlists = read_json(PLAYLISTS_PATH)
    playlist = get_playlist_or_404(playlists, playlist_id)
    if not playlist or playlist.get("ownerId") == user.get("id"):
        return error_response(404, "PLAYLIST_NOT_FOUND", "Плейлист не найден")

    users = read_json(USERS_PATH)
    idx = next((i for i, u in enumerate(users) if u.get("id") == user.get("id")), None)
    if idx is None:
        return error_response(404, "USER_NOT_FOUND", "Пользователь не найден")

    liked = set(users[idx].get("likedPlaylistIds", []))
    liked.add(playlist_id)
    users[idx]["likedPlaylistIds"] = sorted(liked)
    write_users(users)
    return jsonify(users[idx])


@app.route("/api/playlists/<playlist_id>/like", methods=["DELETE"])
def unlike_playlist(playlist_id: str):
    user, error = get_authenticated_user_or_error()
    if error:
        return error

    users = read_json(USERS_PATH)
    idx = next((i for i, u in enumerate(users) if u.get("id") == user.get("id")), None)
    if idx is None:
        return error_response(404, "USER_NOT_FOUND", "Пользователь не найден")

    liked = [pid for pid in users[idx].get("likedPlaylistIds", []) if pid != playlist_id]
    users[idx]["likedPlaylistIds"] = liked
    write_users(users)
    return jsonify(users[idx])


@app.route("/api/artists", methods=["GET"])
def get_artists():
    artists = read_json(ARTISTS_PATH)
    tracks = get_all_available_tracks()

    artist_tracks: dict[str, list[dict[str, Any]]] = {}
    for track in tracks:
        for aid in track.get("artistIds", []):
            artist_tracks.setdefault(aid, []).append(track)

    enriched = []
    for artist in artists:
        a_tracks = artist_tracks.get(artist.get("id"), [])
        if not a_tracks:
            continue
        cover = artist.get("coverUrl") or next((t.get("coverUrl") for t in a_tracks if t.get("coverUrl")), None)
        public_artist = {k: v for k, v in artist.items() if k != "coverUrl"}
        enriched.append(
            {
                **public_artist,
                "tracksCount": len(a_tracks),
                "duration": sum(int(t.get("duration", 0) or 0) for t in a_tracks),
                "coverExists": bool(resolve_static_path(cover)),
            }
        )

    enriched = filter_by_search(enriched, ["name"], request.args.get("search", ""))
    enriched.sort(key=lambda a: str(a.get("name", "")).lower())
    page, limit = parse_pagination_params()
    return jsonify(paginate(enriched, page, limit))


@app.route("/api/artists/<artist_id>", methods=["GET"])
def get_artist(artist_id: str):
    artists = read_json(ARTISTS_PATH)
    artist = next((a for a in artists if a.get("id") == artist_id), None)
    if not artist:
        return error_response(404, "ARTIST_NOT_FOUND", "Исполнитель не найден")

    tracks = [t for t in get_all_available_tracks() if artist_id in t.get("artistIds", [])]
    if not tracks:
        return error_response(404, "ARTIST_NOT_FOUND", "Исполнитель не найден")

    cover = artist.get("coverUrl") or next((t.get("coverUrl") for t in tracks if t.get("coverUrl")), None)
    public_artist = {k: v for k, v in artist.items() if k != "coverUrl"}
    return jsonify(
        {
            **public_artist,
            "tracksCount": len(tracks),
            "duration": sum(int(t.get("duration", 0) or 0) for t in tracks),
            "coverExists": bool(resolve_static_path(cover)),
        }
    )


@app.route("/api/artists/<artist_id>/tracks", methods=["GET"])
def get_artist_tracks(artist_id: str):
    tracks = [t for t in get_all_available_tracks() if artist_id in t.get("artistIds", [])]
    if not tracks:
        return error_response(404, "ARTIST_NOT_FOUND", "Исполнитель не найден")

    tracks = filter_by_search(tracks, ["title", "artistNames", "albumTitle"], request.args.get("search", ""))
    tracks.sort(key=lambda t: str(t.get("title", "")).lower())
    page, limit = parse_pagination_params()
    return jsonify(paginate([public_track(t) for t in tracks], page, limit))


@app.route("/api/artists/<artist_id>/albums", methods=["GET"])
def get_artist_albums(artist_id: str):
    albums = read_json(ALBUMS_PATH)
    tracks = get_all_available_tracks()
    track_map_by_album: dict[str, list[dict[str, Any]]] = {}
    for track in tracks:
        track_map_by_album.setdefault(track.get("albumId"), []).append(track)

    result = []
    for album in albums:
        if artist_id not in album.get("artistIds", []):
            continue
        album_tracks = track_map_by_album.get(album.get("id"), [])
        if not album_tracks:
            continue
        cover = album.get("coverUrl") or next((t.get("coverUrl") for t in album_tracks if t.get("coverUrl")), None)
        public_album = {k: v for k, v in album.items() if k != "coverUrl"}
        result.append(
            {
                **public_album,
                "tracksCount": len(album_tracks),
                "duration": sum(int(t.get("duration", 0) or 0) for t in album_tracks),
                "coverExists": bool(resolve_static_path(cover)),
            }
        )

    result.sort(key=lambda a: str(a.get("title", "")).lower())
    page, limit = parse_pagination_params()
    return jsonify(paginate(result, page, limit))


@app.route("/api/albums", methods=["GET"])
def get_albums():
    albums = read_json(ALBUMS_PATH)
    tracks = get_all_available_tracks()
    track_map_by_album: dict[str, list[dict[str, Any]]] = {}
    for track in tracks:
        track_map_by_album.setdefault(track.get("albumId"), []).append(track)

    enriched = []
    for album in albums:
        album_tracks = track_map_by_album.get(album.get("id"), [])
        if not album_tracks:
            continue
        cover = album.get("coverUrl") or next((t.get("coverUrl") for t in album_tracks if t.get("coverUrl")), None)
        public_album = {k: v for k, v in album.items() if k != "coverUrl"}
        enriched.append(
            {
                **public_album,
                "tracksCount": len(album_tracks),
                "duration": sum(int(t.get("duration", 0) or 0) for t in album_tracks),
                "coverExists": bool(resolve_static_path(cover)),
            }
        )

    enriched = filter_by_search(enriched, ["title", "artistNames"], request.args.get("search", ""))
    enriched.sort(key=lambda a: str(a.get("title", "")).lower())
    page, limit = parse_pagination_params()
    return jsonify(paginate(enriched, page, limit))


@app.route("/api/albums/<album_id>", methods=["GET"])
def get_album(album_id: str):
    albums = read_json(ALBUMS_PATH)
    album = next((a for a in albums if a.get("id") == album_id), None)
    if not album:
        return error_response(404, "ALBUM_NOT_FOUND", "Альбом не найден")

    tracks = [t for t in get_all_available_tracks() if t.get("albumId") == album_id]
    if not tracks:
        return error_response(404, "ALBUM_NOT_FOUND", "Альбом не найден")

    cover = album.get("coverUrl") or next((t.get("coverUrl") for t in tracks if t.get("coverUrl")), None)
    public_album = {k: v for k, v in album.items() if k != "coverUrl"}
    return jsonify(
        {
            **public_album,
            "tracksCount": len(tracks),
            "duration": sum(int(t.get("duration", 0) or 0) for t in tracks),
            "coverExists": bool(resolve_static_path(cover)),
        }
    )


@app.route("/api/albums/<album_id>/tracks", methods=["GET"])
def get_album_tracks(album_id: str):
    tracks = [t for t in get_all_available_tracks() if t.get("albumId") == album_id]
    if not tracks:
        return error_response(404, "ALBUM_NOT_FOUND", "Альбом не найден")

    tracks = filter_by_search(tracks, ["title", "artistNames", "albumTitle"], request.args.get("search", ""))
    tracks.sort(key=lambda t: str(t.get("title", "")).lower())
    page, limit = parse_pagination_params()
    return jsonify(paginate([public_track(t) for t in tracks], page, limit))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
