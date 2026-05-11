export type Track = {
  id: string;
  title: string;
  artistNames: string[];
  artistIds?: string[];
  albumTitle: string;
  albumId?: string;
  duration: number;
  coverUrl: string;
  audioUrl: string;
  lyrics?: string;
  year?: number;
  genre?: string;
};
