from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Callable

from mutagen import File as MutagenFile

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
AUDIO_DIR = BASE_DIR / "static" / "audio"

TRACKS_PATH = DATA_DIR / "tracks.json"
ARTISTS_PATH = DATA_DIR / "artists.json"
ALBUMS_PATH = DATA_DIR / "albums.json"

AUDIO_EXTENSIONS = {".mp3", ".flac", ".m4a", ".ogg", ".wav"}


def read_json(path: Path, fallback: Any) -> Any:
    if not path.exists():
        return fallback
    try:
        with path.open("r", encoding="utf-8-sig") as f:
            raw = f.read().strip()
            if not raw:
                return fallback
            return json.loads(raw)
    except (OSError, json.JSONDecodeError):
        return fallback


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def normalize_key(value: str | None) -> str:
    return (value or "").strip().lower()


def next_id(prefix: str, items: list[dict[str, Any]]) -> str:
    max_num = 0
    for item in items:
        sid = str(item.get("id", ""))
        if sid.startswith(prefix) and sid[len(prefix):].isdigit():
            max_num = max(max_num, int(sid[len(prefix):]))
    return f"{prefix}{max_num + 1}"


def read_audio_meta(path: Path) -> dict[str, Any]:
    audio = MutagenFile(path)
    if audio is None:
        raise ValueError("Unsupported")
    tags = audio.tags or {}

    def tag(*keys: str) -> str:
        for key in keys:
            value = tags.get(key)
            if value is None:
                continue
            if isinstance(value, list):
                text = "; ".join(str(v) for v in value if str(v).strip())
            else:
                text = str(value)
            text = text.strip()
            if text:
                return text
        return ""

    artists_raw = tag("TPE1", "artist", "©ART")
    artists = [part.strip() for part in artists_raw.replace("/", ";").split(";") if part.strip()]
    if not artists:
        artists = ["Unknown Artist"]

    duration = int(round(float(getattr(getattr(audio, "info", None), "length", 0.0) or 0.0)))

    return {
        "title": tag("TIT2", "title", "©nam") or path.stem,
        "artists": artists,
        "album": tag("TALB", "album", "©alb") or "Unknown Album",
        "genre": tag("TCON", "genre", "©gen") or "unknown",
        "year": None,
        "lyrics": tag("USLT", "lyrics", "©lyr"),
        "duration": duration,
    }


def file_fingerprint(path: Path) -> str:
    stat = path.stat()
    h = hashlib.sha1()
    h.update(str(stat.st_size).encode("utf-8"))
    with path.open("rb") as f:
        first = f.read(256 * 1024)
        h.update(first)
        if stat.st_size > 256 * 1024:
            f.seek(max(0, stat.st_size - 256 * 1024))
            h.update(f.read(256 * 1024))
    return h.hexdigest()


def run_scan(
    progress_cb: Callable[[dict[str, Any]], None] | None = None,
    should_stop: Callable[[], bool] | None = None,
) -> dict[str, Any]:
    tracks = read_json(TRACKS_PATH, [])
    artists = read_json(ARTISTS_PATH, [])
    albums = read_json(ALBUMS_PATH, [])

    artists_by_name = {normalize_key(a.get("name")): a for a in artists if a.get("name")}
    albums_by_key = {
        (normalize_key(al.get("title")), normalize_key((al.get("artistNames") or [""])[0] if (al.get("artistNames") or []) else "")): al
        for al in albums
    }

    tracks_by_fp: dict[str, dict[str, Any]] = {}
    for t in tracks:
        fp = t.get("fingerprint")
        if isinstance(fp, str) and fp:
            tracks_by_fp[fp] = t

    files = [p for p in AUDIO_DIR.rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS]
    files.sort()
    total = len(files)

    stats = {
        "newTracks": 0,
        "updatedTracks": 0,
        "movedTracks": 0,
        "missingTracks": 0,
        "newArtists": 0,
        "newAlbums": 0,
        "errors": 0,
        "totalFiles": total,
    }

    seen_audio_urls: set[str] = set()

    stopped = False

    for i, audio_path in enumerate(files, start=1):
        if should_stop and should_stop():
            stopped = True
            if progress_cb:
                progress_cb({
                    "totalFiles": total,
                    "processedFiles": i - 1,
                    "etaSec": None,
                    "stopped": True,
                })
            break

        rel = audio_path.relative_to(BASE_DIR).as_posix()
        audio_url = "/" + rel
        seen_audio_urls.add(audio_url)

        try:
            fp = file_fingerprint(audio_path)
            existing = tracks_by_fp.get(fp)
            if existing:
                if existing.get("audioUrl") != audio_url:
                    existing["audioUrl"] = audio_url
                    stats["movedTracks"] += 1
                existing["missingFile"] = False
                continue

            meta = read_audio_meta(audio_path)
            artist_ids: list[str] = []
            artist_names: list[str] = []
            for name in meta["artists"]:
                key = normalize_key(name)
                artist = artists_by_name.get(key)
                if not artist:
                    artist = {
                        "id": next_id("a", artists),
                        "name": name,
                        "coverUrl": "",
                        "trackIds": [],
                        "albumIds": [],
                    }
                    artists.append(artist)
                    artists_by_name[key] = artist
                    stats["newArtists"] += 1
                artist_ids.append(artist["id"])
                artist_names.append(artist["name"])

            album_key = (normalize_key(meta["album"]), normalize_key(artist_names[0] if artist_names else ""))
            album = albums_by_key.get(album_key)
            if not album:
                album = {
                    "id": next_id("al", albums),
                    "title": meta["album"],
                    "artistIds": [artist_ids[0]] if artist_ids else [],
                    "artistNames": [artist_names[0]] if artist_names else [],
                    "coverUrl": "",
                    "trackIds": [],
                }
                albums.append(album)
                albums_by_key[album_key] = album
                stats["newAlbums"] += 1

            track = {
                "id": next_id("t", tracks),
                "title": meta["title"],
                "artistIds": artist_ids,
                "artistNames": artist_names,
                "albumId": album["id"],
                "albumTitle": album["title"],
                "duration": meta["duration"],
                "coverUrl": album.get("coverUrl", ""),
                "audioUrl": audio_url,
                "lyrics": meta["lyrics"],
                "genre": meta["genre"],
                "year": meta["year"],
                "disabledManually": False,
                "missingFile": False,
                "fingerprint": fp,
            }
            tracks.append(track)
            tracks_by_fp[fp] = track
            stats["newTracks"] += 1
        except Exception:
            stats["errors"] += 1

        if progress_cb:
            progress_cb({
                "totalFiles": total,
                "processedFiles": i,
                "etaSec": int(((total - i) * 0.18)) if i > 0 else None,
            })

    for track in tracks:
        if track.get("audioUrl") not in seen_audio_urls:
            track["missingFile"] = True
            stats["missingTracks"] += 1

    write_json(TRACKS_PATH, tracks)
    write_json(ARTISTS_PATH, artists)
    write_json(ALBUMS_PATH, albums)
    stats["stopped"] = stopped
    return stats
