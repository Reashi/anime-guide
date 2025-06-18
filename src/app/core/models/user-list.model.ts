import { Anime } from './anime.model';

export interface UserAnimeList {
  id: string;
  userId: string;
  animeId: number;
  status: WatchStatus;
  score?: number;
  progress: number;
  notes?: string;
  startDate?: Date;
  finishDate?: Date;
  rewatchCount: number;
  priority: Priority;
  tags: string[];
  favorite: boolean;
  anime: Anime;
  createdAt: Date;
  updatedAt: Date;
}

export enum WatchStatus {
  WATCHING = 'WATCHING',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  DROPPED = 'DROPPED',
  PLANNING = 'PLANNING',
  REPEATING = 'REPEATING'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface UserListStats {
  totalAnime: number;
  totalEpisodes: number;
  meanScore: number;
  standardDeviation: number;
  minutesWatched: number;
  statusDistribution: {
    [key in WatchStatus]: number;
  };
  scoreDistribution: {
    [score: number]: number;
  };
  genreStats: GenreStats[];
  yearStats: YearStats[];
}

export interface GenreStats {
  genre: string;
  count: number;
  meanScore: number;
  minutesWatched: number;
}

export interface YearStats {
  year: number;
  count: number;
  meanScore: number;
} 