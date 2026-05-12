import type { Track } from "./track";

export type Artist = {
  id: string;
  name: string;
  coverExists: boolean;
  tracksCount: number;
  duration: number;
};

export type ArtistDetail = Artist;

export type ArtistTracksResponse = {
  items: Track[];
  total: number;
  page: number;
  limit: number;
  pages: number;
};

