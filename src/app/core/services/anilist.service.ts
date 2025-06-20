import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Anime } from '../models/anime.model';

export interface SearchFilters {
  search?: string;
  genres?: string[];
  year?: number;
  yearStart?: number;
  yearEnd?: number;
  season?: string;
  format?: string;
  status?: string;
  sort?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AnilistService {
  private readonly API_URL = 'https://graphql.anilist.co';

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  searchAnime(filters: SearchFilters, page: number = 1, perPage: number = 100): Observable<any> {
    // SSR sırasında boş response döndür
    if (!isPlatformBrowser(this.platformId)) {
      return of({
        media: [],
        pageInfo: {
          total: 0,
          currentPage: 1,
          lastPage: 1,
          hasNextPage: false,
          perPage: perPage
        }
      });
    }

    const query = `
      query ($page: Int, $perPage: Int, $search: String, $genres: [String], $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort], $startDateGreater: FuzzyDateInt, $startDateLesser: FuzzyDateInt, $season: MediaSeason, $seasonYear: Int) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media(search: $search, genre_in: $genres, format: $format, status: $status, sort: $sort, type: ANIME, startDate_greater: $startDateGreater, startDate_lesser: $startDateLesser, season: $season, seasonYear: $seasonYear) {
            id
            title {
              romaji
              english
              native
            }
            synonyms
            coverImage {
              large
              medium
            }
            description
            format
            status
            episodes
            duration
            genres
            averageScore
            popularity
            startDate {
              year
              month
              day
            }
            endDate {
              year
              month
              day
            }
          }
        }
      }
    `;

    // API'ye gönderilecek değişkenler
    const variables = {
      page,
      perPage,
      search: filters.search ? filters.search.toLowerCase() : undefined,
      genres: filters.genres?.length ? filters.genres : undefined,
      format: filters.format || undefined,
      status: filters.status || undefined,
      sort: filters.sort || ['POPULARITY_DESC'],
      startDateGreater: filters.yearStart ? parseInt(filters.yearStart.toString() + '0101') : undefined,
      startDateLesser: filters.yearEnd ? parseInt(filters.yearEnd.toString() + '1231') : undefined,
      season: filters.season,  // undefined yerine direkt season gönder
      seasonYear: filters.year  // undefined yerine direkt year gönder
    };



    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post(this.API_URL, {
      query,
      variables
    }, { headers }).pipe(
      map((response: any) => {
        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        const media = response.data.Page.media || [];
        const pageInfo = response.data.Page.pageInfo || {};

        // Transform edilmiş anime verileri
        const transformedMedia = media.map((item: any) => this.transformSingleAnime(item));

        return {
          media: transformedMedia,
          pageInfo: pageInfo
        };
      }),
      catchError(error => {
        console.error('AniList API Hatası:', error);
        return of({
          media: [],
          pageInfo: {
            total: 0,
            currentPage: 1,
            lastPage: 1,
            hasNextPage: false,
            perPage: perPage
          }
        });
      })
    );
  }

  getTrendingAnime(page: number = 1, perPage: number = 20): Observable<{ media: Anime[] }> {
    const query = `
      query {
        Page(page: ${page}, perPage: ${perPage}) {
          media(sort: TRENDING_DESC, type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            averageScore
            episodes
            status
            genres
            seasonYear
            startDate {
              year
              month
              day
            }
          }
        }
      }
    `;

    return this.makeRequest(query).pipe(
      map(response => ({
        media: this.transformAnimeData(response.data.Page.media)
      })),
      catchError(error => {
        console.error('Trending error:', error);
        return of({ media: [] });
      })
    );
  }

  getPopularAnime(page: number = 1, perPage: number = 20): Observable<{ media: Anime[] }> {
    const query = `
      query {
        Page(page: ${page}, perPage: ${perPage}) {
          media(sort: POPULARITY_DESC, type: ANIME) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            averageScore
            episodes
            status
            genres
            seasonYear
            startDate {
              year
              month
              day
            }
          }
        }
      }
    `;

    return this.makeRequest(query).pipe(
      map(response => ({
        media: this.transformAnimeData(response.data.Page.media)
      })),
      catchError(error => {
        console.error('Popular error:', error);
        return of({ media: [] });
      })
    );
  }

  getCurrentSeasonAnime(page: number = 1, perPage: number = 20): Observable<{ media: Anime[] }> {
    const currentSeason = this.getCurrentSeason();
    const currentYear = new Date().getFullYear();
    
    const query = `
      query {
        Page(page: ${page}, perPage: ${perPage}) {
          media(sort: POPULARITY_DESC, type: ANIME, season: ${currentSeason}, seasonYear: ${currentYear}) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            averageScore
            episodes
            status
            genres
            seasonYear
            season
            startDate {
              year
              month
              day
            }
          }
        }
      }
    `;

    return this.makeRequest(query).pipe(
      map(response => ({
        media: this.transformAnimeData(response.data.Page.media)
      })),
      catchError(error => {
        console.error('Season anime error:', error);
        return of({ media: [] });
      })
    );
  }

  private getCurrentSeason(): string {
    const month = new Date().getMonth() + 1; // getMonth() 0-11 döndürür
    
    if (month >= 3 && month <= 5) {
      return 'SPRING';
    } else if (month >= 6 && month <= 8) {
      return 'SUMMER';
    } else if (month >= 9 && month <= 11) {
      return 'FALL';
    } else {
      return 'WINTER';
    }
  }

  getCurrentSeasonName(): string {
    const season = this.getCurrentSeason();
    const seasonNames = {
      'SPRING': 'İlkbahar',
      'SUMMER': 'Yaz',
      'FALL': 'Sonbahar',
      'WINTER': 'Kış'
    };
    return seasonNames[season as keyof typeof seasonNames] || 'Bilinmeyen';
  }

  getSeasonAnimes(season: string, year: number, page: number = 1, perPage: number = 50): Observable<{ media: Anime[], pageInfo: any }> {
    // SSR sırasında boş response döndür
    if (!isPlatformBrowser(this.platformId)) {
      return of({
        media: [],
        pageInfo: {
          total: 0,
          currentPage: 1,
          lastPage: 1,
          hasNextPage: false,
          perPage: perPage
        }
      });
    }

    const query = `
      query {
        Page(page: ${page}, perPage: ${perPage}) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media(sort: POPULARITY_DESC, type: ANIME, season: ${season}, seasonYear: ${year}) {
            id
            title {
              romaji
              english
              native
            }
            coverImage {
              large
              medium
            }
            averageScore
            episodes
            status
            genres
            seasonYear
            season
            startDate {
              year
              month
              day
            }
          }
        }
      }
    `;

    return this.makeRequest(query).pipe(
      map(response => ({
        media: this.transformAnimeData(response.data.Page.media),
        pageInfo: response.data.Page.pageInfo
      })),
      catchError(error => {
        console.error('Season animes error:', error);
        return of({ 
          media: [], 
          pageInfo: {
            total: 0,
            currentPage: 1,
            lastPage: 1,
            hasNextPage: false,
            perPage: perPage
          }
        });
      })
    );
  }

  getAnimeById(id: number): Observable<Anime> {
    const query = `
      query {
        Media(id: ${id}, type: ANIME) {
          id
          title {
            romaji
            english
            native
          }
          description
          coverImage {
            large
            medium
          }
          bannerImage
          averageScore
          episodes
          status
          genres
          seasonYear
          startDate {
            year
            month
            day
          }
          studios {
            nodes {
              name
            }
          }
        }
      }
    `;

    return this.makeRequest(query).pipe(
      map(response => this.transformSingleAnime(response.data.Media)),
      catchError(error => {
        console.error('Anime detail error:', error);
        return of(this.createEmptyAnime(id));
      })
    );
  }

  private makeRequest(query: string): Observable<any> {
    // SSR sırasında boş response döndür
    if (!isPlatformBrowser(this.platformId)) {
      return of({
        data: {
          Page: {
            media: [],
            pageInfo: {
              total: 0,
              currentPage: 1,
              lastPage: 1,
              hasNextPage: false
            }
          }
        }
      });
    }

    return this.http.post(this.API_URL, { query });
  }

  private transformAnimeData(media: any[]): Anime[] {
    if (!media || !Array.isArray(media)) {
      return [];
    }
    return media.map(item => this.transformSingleAnime(item));
  }

  private transformSingleAnime(item: any): Anime {
    if (!item) {
      return this.createEmptyAnime(0);
    }

    return {
      id: item.id || 0,
      title: item.title?.romaji || item.title?.english || item.title?.native || 'Bilinmeyen Başlık',
      englishTitle: item.title?.english,
      nativeTitle: item.title?.native,
      averageScore: item.averageScore || 0,
      description: item.description || '',
      coverImage: item.coverImage?.large || item.coverImage?.medium || '/placeholder-anime.jpg',
      bannerImage: item.bannerImage,
      score: item.averageScore || 0,
      popularity: item.popularity || 0,
      favourites: item.favourites || 0,
      episodes: item.episodes,
      duration: item.duration,
      status: item.status,
      startDate: item.startDate ? {
        year: item.startDate.year,
        month: item.startDate.month,
        day: item.startDate.day
      } : undefined,
      endDate: item.endDate ? {
        year: item.endDate.year,
        month: item.endDate.month,
        day: item.endDate.day
      } : undefined,
      season: item.season,
      seasonYear: item.seasonYear,
      format: item.format,
      genres: item.genres || [],
      studios: item.studios?.nodes?.map((studio: any) => studio.name) || [],
      trailer: item.trailer ? {
        id: item.trailer.id,
        site: item.trailer.site
      } : undefined,
      isAdult: item.isAdult || false
    };
  }

  private createEmptyAnime(id: number): Anime {
    return {
      id,
      title: 'Anime Bulunamadı',
      englishTitle: undefined,
      nativeTitle: undefined,
      averageScore: 0,
      description: '',
      coverImage: '/placeholder-anime.jpg',
      bannerImage: undefined,
      score: 0,
      popularity: 0,
      favourites: 0,
      episodes: undefined,
      duration: undefined,
      status: undefined,
      startDate: undefined,
      endDate: undefined,
      season: undefined,
      seasonYear: undefined,
      format: undefined,
      genres: [],
      studios: [],
      trailer: undefined,
      isAdult: false
    };
  }

  // Seçenekler
  getSortOptions() {
    return [
      { value: 'POPULARITY_DESC', label: 'Popülerlik (Azalan)' },
      { value: 'POPULARITY', label: 'Popülerlik (Artan)' },
      { value: 'SCORE_DESC', label: 'Puan (Azalan)' },
      { value: 'SCORE', label: 'Puan (Artan)' },
      { value: 'TRENDING_DESC', label: 'Trend (Azalan)' },
      { value: 'TRENDING', label: 'Trend (Artan)' },
      { value: 'START_DATE_DESC', label: 'Yayın Tarihi (Yeni)' },
      { value: 'START_DATE', label: 'Yayın Tarihi (Eski)' }
    ];
  }

  getGenreOptions() {
    return [
      'Action',
      'Adventure',
      'Comedy',
      'Drama',
      'Ecchi',
      'Fantasy',
      'Hentai',
      'Horror',
      'Mecha',
      'Music',
      'Mystery',
      'Psychological',
      'Romance',
      'Sci-Fi',
      'Slice of Life',
      'Sports',
      'Supernatural',
      'Thriller'
    ];
  }

  getStatusOptions() {
    return [
      { value: 'RELEASING', label: 'Yayınlanıyor' },
      { value: 'FINISHED', label: 'Tamamlandı' },
      { value: 'NOT_YET_RELEASED', label: 'Yakında' },
      { value: 'CANCELLED', label: 'İptal Edildi' },
      { value: 'HIATUS', label: 'Ara Verildi' }
    ];
  }

  getFormatOptions() {
    return [
      { value: 'TV', label: 'TV' },
      { value: 'MOVIE', label: 'Film' },
      { value: 'OVA', label: 'OVA' },
      { value: 'ONA', label: 'ONA' },
      { value: 'SPECIAL', label: 'Özel' },
      { value: 'MUSIC', label: 'Müzik' }
    ];
  }
}