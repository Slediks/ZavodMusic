import { API_URL } from "./client";
import type { Artist } from "../types/artist";
import type { Album } from "../types/album";
import type { Playlist } from "../types/playlist";

type BackendArtist = Omit<Artist, "coverUrl">;
type BackendAlbum = Omit<Album, "coverUrl">;
type BackendPlaylist = Omit<Playlist, "coverUrl">;

export function enrichArtistMedia(artist: BackendArtist): Artist {
  return {
    ...artist,
    coverUrl: artist.coverExists ? `${API_URL}/api/artists/${encodeURIComponent(artist.id)}/cover` : null,
  };
}

export function enrichAlbumMedia(album: BackendAlbum): Album {
  return {
    ...album,
    coverUrl: album.coverExists ? `${API_URL}/api/albums/${encodeURIComponent(album.id)}/cover` : null,
  };
}

export function enrichPlaylistMedia(playlist: BackendPlaylist): Playlist {
  return {
    ...playlist,
    coverUrl: playlist.coverExists ? `${API_URL}/api/playlists/${encodeURIComponent(playlist.id)}/cover` : null,
  };
}

export function enrichArtistListMedia(items: BackendArtist[]): Artist[] {
  return items.map(enrichArtistMedia);
}

export function enrichAlbumListMedia(items: BackendAlbum[]): Album[] {
  return items.map(enrichAlbumMedia);
}

export function enrichPlaylistListMedia(items: BackendPlaylist[]): Playlist[] {
  return items.map(enrichPlaylistMedia);
}

