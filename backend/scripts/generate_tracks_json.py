from __future__ import annotations

import hashlib
import json
import shutil
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from collections import Counter

from mutagen import File as MutagenFile
from mutagen.flac import FLAC, Picture
from mutagen.id3 import APIC
from mutagen.mp4 import MP4, MP4Cover

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "data"
AUDIO_DIR = BASE_DIR / "static" / "audio"
COVERS_DIR = BASE_DIR / "static" / "covers"

TRACKS_PATH = DATA_DIR / "tracks.json"
ARTISTS_PATH = DATA_DIR / "artists.json"
ALBUMS_PATH = DATA_DIR / "albums.json"

AUDIO_EXTENSIONS = {".mp3", ".flac", ".m4a", ".ogg", ".wav"}


@dataclass
class AudioMeta:
    title: str
    artists: list[str]
    album: str
    album_artist: str | None
    genre: str
    year: int | None
    lyrics: str
    duration: int
    cover_bytes: bytes | None
    cover_ext: str | None


def read_json(path: Path) -> Any:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig") as file:
        return json.load(file)


def write_json_with_backup(path: Path, payload: Any) -> None:
    if path.exists():
        backup_path = path.with_suffix(path.suffix + ".bak")
        shutil.copy2(path, backup_path)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)


def safe_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return "; ".join(str(v) for v in value if str(v).strip())
    return str(value).strip()


def split_artists(value: str) -> list[str]:
    if not value:
        return []
    parts = [p.strip() for p in value.replace("/", ";").split(";")]
    return [p for p in parts if p]


def normalize_key(value: str | None) -> str:
    return (value or "").strip().lower()


def first_of(tags: Any, keys: list[str]) -> str:
    for key in keys:
        if key in tags:
            text = safe_text(tags.get(key))
            if text:
                return text
    return ""


def read_cover_from_audio(audio: Any) -> tuple[bytes | None, str | None]:
    if isinstance(audio, FLAC):
        pictures: list[Picture] = list(audio.pictures)
        if pictures:
            pic = pictures[0]
            ext = ".png" if "png" in (pic.mime or "").lower() else ".jpg"
            return bytes(pic.data), ext

    if isinstance(audio, MP4):
        cov_list = audio.tags.get("covr", []) if audio.tags else []
        if cov_list:
            cov = cov_list[0]
            if isinstance(cov, MP4Cover):
                ext = ".png" if cov.imageformat == MP4Cover.FORMAT_PNG else ".jpg"
                return bytes(cov), ext
            return bytes(cov), ".jpg"

    tags = getattr(audio, "tags", None)
    if tags:
        if hasattr(tags, "getall"):
            apic = tags.getall("APIC")
            if apic:
                frame: APIC = apic[0]
                ext = ".png" if "png" in (frame.mime or "").lower() else ".jpg"
                return bytes(frame.data), ext
        for value in tags.values():
            if hasattr(value, "data"):
                data = getattr(value, "data", None)
                mime = getattr(value, "mime", "")
                if data:
                    ext = ".png" if "png" in str(mime).lower() else ".jpg"
                    return bytes(data), ext

    return None, None


def parse_year(raw: str) -> int | None:
    if not raw:
        return None
    digits = "".join(ch for ch in raw if ch.isdigit())
    if len(digits) >= 4:
        return int(digits[:4])
    return None


def read_audio_meta(path: Path) -> AudioMeta:
    audio = MutagenFile(path)
    if audio is None:
        raise ValueError(f"Unsupported audio format: {path}")

    tags = audio.tags or {}

    title = first_of(tags, ["TIT2", "title", "©nam"]) or path.stem
    artist_raw = first_of(tags, ["TPE1", "artist", "©ART"]) or "Unknown Artist"
    album_artist_raw = first_of(tags, ["TPE2", "albumartist", "aART"])
    album = first_of(tags, ["TALB", "album", "©alb"]) or "Unknown Album"
    genre = first_of(tags, ["TCON", "genre", "©gen"]) or "unknown"
    year_raw = first_of(tags, ["TDRC", "date", "©day"]) 
    lyrics = first_of(tags, ["USLT::eng", "USLT", "lyrics", "©lyr"]) 

    info = getattr(audio, "info", None)
    duration = int(round(float(getattr(info, "length", 0.0) or 0.0)))

    cover_bytes, cover_ext = read_cover_from_audio(audio)

    return AudioMeta(
        title=title,
        artists=split_artists(artist_raw) or ["Unknown Artist"],
        album=album,
        album_artist=album_artist_raw.strip() or None,
        genre=genre,
        year=parse_year(year_raw),
        lyrics=lyrics,
        duration=duration,
        cover_bytes=cover_bytes,
        cover_ext=cover_ext,
    )


def slug(text: str) -> str:
    cleaned = "".join(ch.lower() if ch.isalnum() else "-" for ch in text)
    while "--" in cleaned:
        cleaned = cleaned.replace("--", "-")
    return cleaned.strip("-") or "item"


def next_id(prefix: str, existing_ids: set[str]) -> str:
    i = 1
    while f"{prefix}{i}" in existing_ids:
        i += 1
    return f"{prefix}{i}"


def preserve_or_default(existing: dict[str, Any], key: str, default: Any) -> Any:
    value = existing.get(key)
    if value is None:
        return default
    if isinstance(value, str) and not value.strip():
        return default
    if isinstance(value, list) and not value:
        return default
    return value


def save_cover(cover_bytes: bytes, ext: str, hash_to_cover_url: dict[str, str]) -> str:
    digest = hashlib.sha1(cover_bytes).hexdigest()
    if digest in hash_to_cover_url:
        return hash_to_cover_url[digest]

    COVERS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"cover-{digest[:16]}{ext}"
    path = COVERS_DIR / filename
    if not path.exists():
        path.write_bytes(cover_bytes)

    cover_url = f"/static/covers/{filename}"
    hash_to_cover_url[digest] = cover_url
    return cover_url


def build_existing_cover_map() -> dict[str, str]:
    mapping: dict[str, str] = {}
    if not COVERS_DIR.exists():
        return mapping
    for cover in COVERS_DIR.iterdir():
        if not cover.is_file():
            continue
        content = cover.read_bytes()
        digest = hashlib.sha1(content).hexdigest()
        mapping[digest] = f"/static/covers/{cover.name}"
    return mapping


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    COVERS_DIR.mkdir(parents=True, exist_ok=True)

    tracks: list[dict[str, Any]] = read_json(TRACKS_PATH)
    artists: list[dict[str, Any]] = read_json(ARTISTS_PATH)
    albums: list[dict[str, Any]] = read_json(ALBUMS_PATH)

    tracks_by_audio = {str(t.get("audioUrl", "")): t for t in tracks if t.get("audioUrl")}
    tracks_by_id = {str(t.get("id", "")): t for t in tracks if t.get("id")}

    existing_artist_ids = {str(a.get("id")) for a in artists if a.get("id")}
    existing_album_ids = {str(a.get("id")) for a in albums if a.get("id")}

    artist_by_name = {normalize_key(str(a.get("name", ""))): a for a in artists if a.get("name")}
    for album in albums:
        # Normalize existing albums to a single author model.
        artist_ids = album.get("artistIds") or []
        artist_names = album.get("artistNames") or []
        if isinstance(artist_ids, list) and len(artist_ids) > 1:
            album["artistIds"] = artist_ids[:1]
        if isinstance(artist_names, list) and len(artist_names) > 1:
            album["artistNames"] = artist_names[:1]
    album_by_key = {
        (normalize_key(str(a.get("title", ""))), normalize_key((a.get("artistNames") or [""])[0] if isinstance(a.get("artistNames"), list) and a.get("artistNames") else "")): a
        for a in albums
        if a.get("title")
    }

    cover_map = build_existing_cover_map()

    audio_files = [
        p for p in AUDIO_DIR.rglob("*") if p.is_file() and p.suffix.lower() in AUDIO_EXTENSIONS
    ]
    audio_files.sort()
    total_files = len(audio_files)

    seen_audio_urls: set[str] = set()
    generated_tracks: list[dict[str, Any]] = []

    stats = {
        "scanned_audio_files": len(audio_files),
        "new_tracks": 0,
        "updated_tracks": 0,
        "missing_tracks_marked": 0,
        "covers_extracted": 0,
        "covers_deduplicated": 0,
        "metadata_errors": 0,
    }

    start_time = time.perf_counter()

    def format_seconds(seconds: float) -> str:
        total = max(0, int(round(seconds)))
        h = total // 3600
        m = (total % 3600) // 60
        s = total % 60
        if h > 0:
            return f"{h:02d}:{m:02d}:{s:02d}"
        return f"{m:02d}:{s:02d}"

    def render_progress(processed: int) -> None:
        if total_files <= 0:
            return
        elapsed = time.perf_counter() - start_time
        avg_per_file = elapsed / processed if processed > 0 else 0.0
        remaining = max(0, total_files - processed)
        eta = avg_per_file * remaining
        percent = (processed / total_files) * 100
        bar_width = 30
        filled = int((processed / total_files) * bar_width)
        bar = "#" * filled + "-" * (bar_width - filled)
        line = (
            f"\r[{bar}] {percent:6.2f}% "
            f"({processed}/{total_files}) "
            f"elapsed {format_seconds(elapsed)} | "
            f"avg/file {avg_per_file:.2f}s | "
            f"ETA {format_seconds(eta)}"
        )
        print(line, end="", flush=True)

    for index, audio_path in enumerate(audio_files, start=1):
        rel = audio_path.relative_to(BASE_DIR).as_posix()
        audio_url = "/" + rel
        seen_audio_urls.add(audio_url)

        try:
            meta = read_audio_meta(audio_path)
        except Exception:
            stats["metadata_errors"] += 1
            continue

        cover_url: str | None = None
        if meta.cover_bytes and meta.cover_ext:
            before = len(cover_map)
            cover_url = save_cover(meta.cover_bytes, meta.cover_ext, cover_map)
            after = len(cover_map)
            if after > before:
                stats["covers_extracted"] += 1
            else:
                stats["covers_deduplicated"] += 1

        artist_ids: list[str] = []
        artist_names: list[str] = []
        for artist_name in meta.artists:
            key = normalize_key(artist_name)
            artist = artist_by_name.get(key)
            if not artist:
                new_id = next_id("a", existing_artist_ids)
                existing_artist_ids.add(new_id)
                artist = {"id": new_id, "name": artist_name.strip(), "coverUrl": cover_url}
                artists.append(artist)
                artist_by_name[key] = artist
            artist_ids.append(artist["id"])
            artist_names.append(artist["name"])
            if not artist.get("coverUrl") and cover_url:
                artist["coverUrl"] = cover_url

        album_artist_name = meta.album_artist.strip() if meta.album_artist else ""
        album_artist_id: str | None = None
        if album_artist_name:
            album_artist_key = normalize_key(album_artist_name)
            album_artist = artist_by_name.get(album_artist_key)
            if not album_artist:
                new_id = next_id("a", existing_artist_ids)
                existing_artist_ids.add(new_id)
                album_artist = {"id": new_id, "name": album_artist_name, "coverUrl": cover_url}
                artists.append(album_artist)
                artist_by_name[album_artist_key] = album_artist
            elif not album_artist.get("coverUrl") and cover_url:
                album_artist["coverUrl"] = cover_url
            album_artist_id = album_artist["id"]

        album_key = (
            normalize_key(meta.album),
            normalize_key(album_artist_name or (artist_names[0] if artist_names else "")),
        )
        album = album_by_key.get(album_key)
        if not album:
            new_id = next_id("al", existing_album_ids)
            existing_album_ids.add(new_id)
            album = {
                "id": new_id,
                "title": meta.album.strip(),
                "artistIds": [album_artist_id or (artist_ids[0] if artist_ids else "")],
                "artistNames": [album_artist_name or (artist_names[0] if artist_names else "Unknown Artist")],
                "coverUrl": cover_url,
                "_hasExplicitAlbumArtist": bool(album_artist_id and album_artist_name),
            }
            albums.append(album)
            album_by_key[album_key] = album
        elif not album.get("coverUrl") and cover_url:
            album["coverUrl"] = cover_url
        if album_artist_id and album_artist_name:
            album["artistIds"] = [album_artist_id]
            album["artistNames"] = [album_artist_name]
            album["_hasExplicitAlbumArtist"] = True

        existing = tracks_by_audio.get(audio_url)
        if existing is None:
            track_id = next_id("t", set(tracks_by_id.keys()))
            existing = {"id": track_id}
            tracks_by_id[track_id] = existing
            stats["new_tracks"] += 1
        else:
            stats["updated_tracks"] += 1

        generated = {
            "id": existing["id"],
            "title": preserve_or_default(existing, "title", meta.title),
            "artistIds": preserve_or_default(existing, "artistIds", artist_ids),
            "artistNames": preserve_or_default(existing, "artistNames", artist_names),
            "albumId": preserve_or_default(existing, "albumId", album["id"]),
            "albumTitle": preserve_or_default(existing, "albumTitle", album["title"]),
            "duration": preserve_or_default(existing, "duration", meta.duration),
            "coverUrl": preserve_or_default(existing, "coverUrl", cover_url),
            "audioUrl": audio_url,
            "lyrics": preserve_or_default(existing, "lyrics", meta.lyrics),
            "genre": preserve_or_default(existing, "genre", meta.genre),
            "year": preserve_or_default(existing, "year", meta.year),
            "disabledManually": bool(existing.get("disabledManually", False)),
            "missingFile": False,
        }
        generated_tracks.append(generated)
        render_progress(index)

    # Fallback album author: when album artist is missing across all tracks of an album,
    # pick the artist who appears in the most tracks of that album.
    tracks_by_album: dict[str, list[dict[str, Any]]] = {}
    for track in generated_tracks:
        album_id = str(track.get("albumId", "")).strip()
        if album_id:
            tracks_by_album.setdefault(album_id, []).append(track)

    for album in albums:
        album_id = str(album.get("id", "")).strip()
        if not album_id:
            continue
        album_tracks = tracks_by_album.get(album_id, [])
        if not album_tracks:
            continue

        if bool(album.get("_hasExplicitAlbumArtist")):
            current_artist_ids = album.get("artistIds") or []
            current_artist_names = album.get("artistNames") or []
            album["artistIds"] = [str(current_artist_ids[0]).strip()] if current_artist_ids else [""]
            album["artistNames"] = [str(current_artist_names[0]).strip()] if current_artist_names else ["Unknown Artist"]
            continue

        counts: Counter[str] = Counter()
        artist_id_to_name: dict[str, str] = {}
        for track in album_tracks:
            ids = track.get("artistIds") or []
            names = track.get("artistNames") or []
            for idx, artist_id in enumerate(ids):
                aid = str(artist_id).strip()
                if not aid:
                    continue
                counts[aid] += 1
                if idx < len(names):
                    artist_id_to_name[aid] = str(names[idx]).strip()

        if counts:
            winner_id = counts.most_common(1)[0][0]
            winner_name = artist_id_to_name.get(winner_id) or next(
                (str(a.get("name", "")).strip() for a in artists if str(a.get("id", "")).strip() == winner_id),
                "Unknown Artist",
            )
            album["artistIds"] = [winner_id]
            album["artistNames"] = [winner_name]

    for album in albums:
        album.pop("_hasExplicitAlbumArtist", None)

    if total_files > 0:
        print()

    for old_track in tracks:
        audio_url = str(old_track.get("audioUrl", ""))
        if audio_url and audio_url not in seen_audio_urls:
            old_copy = dict(old_track)
            old_copy["disabledManually"] = bool(old_copy.get("disabledManually", False))
            old_copy["missingFile"] = True
            generated_tracks.append(old_copy)
            stats["missing_tracks_marked"] += 1

    generated_tracks.sort(key=lambda t: str(t.get("title", "")).lower())
    artists.sort(key=lambda a: str(a.get("name", "")).lower())
    albums.sort(key=lambda a: str(a.get("title", "")).lower())

    write_json_with_backup(TRACKS_PATH, generated_tracks)
    write_json_with_backup(ARTISTS_PATH, artists)
    write_json_with_backup(ALBUMS_PATH, albums)

    print("Tracks JSON generator completed")
    for key, value in stats.items():
        print(f"- {key}: {value}")
    print(f"- tracks_total: {len(generated_tracks)}")
    print(f"- artists_total: {len(artists)}")
    print(f"- albums_total: {len(albums)}")


if __name__ == "__main__":
    main()
