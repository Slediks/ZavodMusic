import type { Track } from "./track";

export type Playlist = {
  id: string;
  title: string;
  description: string;
  ownerId: string;
  ownerLogin: string;
  isPublic: boolean;
  trackIds: string[];
  tracksCount: number;
  duration: number;
  coverExists: boolean;
};

export type PlaylistDetail = Playlist & {
  tracks: Track[];
};

export type MyPlaylistsResponse = {
  own: {
    items: Playlist[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  liked: {
    items: Playlist[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

