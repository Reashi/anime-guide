export interface Anime {
  averageScore: number;
  id: number;
  title: string;
  englishTitle?: string;
  nativeTitle?: string;
  description?: string;
  coverImage: string;
  bannerImage?: string;
  score: number;
  popularity: number;
  favourites: number;
  episodes?: number;
  duration?: number;
  status?: string;
  startDate?: FuzzyDate;
  endDate?: FuzzyDate;
  season?: string;
  seasonYear?: number;
  format?: string;
  genres: string[];
  studios: string[];
  trailer?: MediaTrailer;
  isAdult: boolean;
}

export interface Studio {
  id: number;
  name: string;
  isMain: boolean;
}

export interface MediaTag {
  id: number;
  name: string;
  description: string;
  rank: number;
  isMediaSpoiler: boolean;
  isGeneralSpoiler: boolean;
}

export interface AiringSchedule {
  id: number;
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface FuzzyDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface MediaTrailer {
  id: string;
  site: string;
  thumbnail?: string;
}

export interface MediaConnection {
  edges: MediaEdge[];
}

export interface MediaEdge {
  id: number;
  relationType: MediaRelation;
  node: Anime;
}

export interface RecommendationConnection {
  edges: RecommendationEdge[];
}

export interface RecommendationEdge {
  node: {
    id: number;
    mediaRecommendation: Anime;
    rating: number;
  };
}

export enum MediaFormat {
  TV = 'TV',
  TV_SHORT = 'TV_SHORT',
  MOVIE = 'MOVIE',
  SPECIAL = 'SPECIAL',
  OVA = 'OVA',
  ONA = 'ONA',
  MUSIC = 'MUSIC'
}

export enum MediaStatus {
  FINISHED = 'FINISHED',
  RELEASING = 'RELEASING',
  NOT_YET_RELEASED = 'NOT_YET_RELEASED',
  CANCELLED = 'CANCELLED',
  HIATUS = 'HIATUS'
}

export enum MediaSeason {
  WINTER = 'WINTER',
  SPRING = 'SPRING',
  SUMMER = 'SUMMER',
  FALL = 'FALL'
}

export enum MediaRelation {
  ADAPTATION = 'ADAPTATION',
  PREQUEL = 'PREQUEL',
  SEQUEL = 'SEQUEL',
  PARENT = 'PARENT',
  SIDE_STORY = 'SIDE_STORY',
  CHARACTER = 'CHARACTER',
  SUMMARY = 'SUMMARY',
  ALTERNATIVE = 'ALTERNATIVE',
  SPIN_OFF = 'SPIN_OFF',
  OTHER = 'OTHER',
  SOURCE = 'SOURCE',
  COMPILATION = 'COMPILATION',
  CONTAINS = 'CONTAINS'
}

export enum MediaSource {
  ORIGINAL = 'ORIGINAL',
  MANGA = 'MANGA',
  LIGHT_NOVEL = 'LIGHT_NOVEL',
  VISUAL_NOVEL = 'VISUAL_NOVEL',
  VIDEO_GAME = 'VIDEO_GAME',
  OTHER = 'OTHER',
  NOVEL = 'NOVEL',
  DOUJINSHI = 'DOUJINSHI',
  ANIME = 'ANIME',
  WEB_NOVEL = 'WEB_NOVEL',
  LIVE_ACTION = 'LIVE_ACTION',
  GAME = 'GAME',
  COMIC = 'COMIC',
  MULTIMEDIA_PROJECT = 'MULTIMEDIA_PROJECT',
  PICTURE_BOOK = 'PICTURE_BOOK'
} 