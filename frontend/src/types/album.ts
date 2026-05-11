import type { Track } from "./track";

export type Album = {
  id: string;
  title: string;
  artistIds: string[];
  artistNames: string[];
  coverUrl: string | null;
  coverExists: boolean;
  tracksCount: number;
  duration: number;
};

export type AlbumDetail = Album;

export type AlbumTracksResponse = {
  items: Track[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};


