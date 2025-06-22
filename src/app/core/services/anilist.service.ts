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
  private readonly API_URL = '/api';

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

    // Arama varsa kendi API'yi kullan
    if (filters.search && filters.search.trim()) {
      return this.http.get<any>(`${this.API_URL}/anime/search?q=${encodeURIComponent(filters.search)}`).pipe(
        map((response: any) => {
          const transformedMedia = response.success ? 
            response.data.map((item: any) => this.transformSingleAnime(item)) : [];
          
          return {
            media: transformedMedia,
            pageInfo: {
              total: transformedMedia.length,
              currentPage: 1,
              lastPage: 1,
              hasNextPage: false,
              perPage: perPage
            }
          };
        }),
        catchError(error => {
          console.error('Arama API Hatası:', error);
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

    // Arama yoksa trending'i döndür
    return this.getTrendingAnime(page, perPage).pipe(
      map(response => ({
        media: response.media,
        pageInfo: {
          total: response.media.length,
          currentPage: 1,
          lastPage: 1,
          hasNextPage: false,
          perPage: perPage
        }
      }))
    );
  }

  getTrendingAnime(page: number = 1, perPage: number = 20): Observable<{ media: Anime[] }> {
    // SSR sırasında boş response döndür
    if (!isPlatformBrowser(this.platformId)) {
      return of({ media: [] });
    }

    return this.http.get<any>(`${this.API_URL}/anime/trending?page=${page}`).pipe(
      map(response => ({
        media: response.success ? this.transformAnimeData(response.data) : []
      })),
      catchError(error => {
        console.error('Trending error:', error);
        return of({ media: [] });
      })
    );
  }

  getPopularAnime(page: number = 1, perPage: number = 20): Observable<{ media: Anime[] }> {
    // SSR sırasında boş response döndür
    if (!isPlatformBrowser(this.platformId)) {
      return of({ media: [] });
    }

    // Popüler animeler için trending endpoint'i kullan
    return this.getTrendingAnime(page, perPage);
  }

  getCurrentSeasonAnime(page: number = 1, perPage: number = 20): Observable<{ media: Anime[] }> {
    // SSR sırasında boş response döndür
    if (!isPlatformBrowser(this.platformId)) {
      return of({ media: [] });
    }

    // Şimdilik trending animeleri döndür
    return this.getTrendingAnime(page, perPage);
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

    // Şimdilik trending animeleri döndür
    return this.getTrendingAnime(page, perPage).pipe(
      map(response => ({
        media: response.media,
        pageInfo: {
          total: response.media.length,
          currentPage: 1,
          lastPage: 1,
          hasNextPage: false,
          perPage: perPage
        }
      }))
    );
  }

  getAnimeById(id: number): Observable<Anime> {
    // SSR sırasında boş anime döndür
    if (!isPlatformBrowser(this.platformId)) {
      return of(this.createEmptyAnime(id));
    }

    return this.http.get<any>(`${this.API_URL}/anime/${id}`).pipe(
      map(response => {
        if (response.success && response.data) {
          return this.transformSingleAnime(response.data);
        }
        return this.createEmptyAnime(id);
      }),
      catchError(error => {
        console.error('Anime detail error:', error);
        return of(this.createEmptyAnime(id));
      })
    );
  }

  // Bu metod artık kullanılmıyor - kendi API'mizi kullanıyoruz
  private makeRequest(query: string): Observable<any> {
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

    // MongoDB'den gelen veri için daha esnek mapping
    const coverImageUrl = item.coverImage?.large || 
                         item.coverImage?.medium || 
                         (typeof item.coverImage === 'string' ? item.coverImage : null) ||
                         '/assets/placeholder-anime.svg';

    return {
      id: item.id || item._id || 0,
      title: item.title?.romaji || item.title?.english || item.title?.native || item.title || 'Bilinmeyen Başlık',
      englishTitle: item.title?.english,
      nativeTitle: item.title?.native,
      averageScore: item.averageScore || item.score || 0,
      description: item.description || '',
      coverImage: coverImageUrl,
      bannerImage: item.bannerImage,
      score: item.averageScore || item.score || 0,
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
      seasonYear: item.seasonYear || item.year,
      format: item.format,
      genres: item.genres || item.genre || [],
      studios: item.studios?.nodes?.map((studio: any) => studio.name) || 
               item.studios?.map((studio: any) => typeof studio === 'string' ? studio : studio.name) || 
               [],
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
      coverImage: '/assets/placeholder-anime.svg',
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