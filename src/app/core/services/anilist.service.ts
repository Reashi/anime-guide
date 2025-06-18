import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Anime } from '../models/anime.model';

export interface SearchFilters {
  search?: string;
  genres?: string[];
  year?: number;
  season?: string;
  format?: string;
  status?: string;
  sort?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AnilistService {
  private readonly apiUrl = 'https://graphql.anilist.co';

  constructor(private http: HttpClient) {}

  // Basit arama fonksiyonu
  searchAnime(filters: SearchFilters, page: number = 1, perPage: number = 20): Observable<{ media: Anime[], pageInfo: any }> {
    const searchTerm = filters.search || '';
    
    const query = `
      query {
        Page(page: ${page}, perPage: ${perPage}) {
          pageInfo {
            hasNextPage
            currentPage
            lastPage
            perPage
            total
          }
          media(search: "${searchTerm}", type: ANIME, sort: POPULARITY_DESC) {
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
        console.error('Search error:', error);
        return of({ media: [], pageInfo: { hasNextPage: false, currentPage: 1, lastPage: 1, perPage: 20, total: 0 } });
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
    console.log('Sending query:', query);
    
    return this.http.post(this.apiUrl, { query }).pipe(
      map(response => {
        console.log('Response:', response);
        return response;
      })
    );
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
      { value: 'TITLE_ROMAJI', label: 'İsim (A-Z)' },
      { value: 'TITLE_ROMAJI_DESC', label: 'İsim (Z-A)' },
      { value: 'SCORE_DESC', label: 'Puan (Yüksekten Alçağa)' },
      { value: 'SCORE', label: 'Puan (Alçaktan Yükseğe)' },
      { value: 'START_DATE_DESC', label: 'Çıkış Tarihi (Yeni → Eski)' },
      { value: 'START_DATE', label: 'Çıkış Tarihi (Eski → Yeni)' },
      { value: 'EPISODES_DESC', label: 'Bölüm Sayısı (Çok → Az)' },
      { value: 'EPISODES', label: 'Bölüm Sayısı (Az → Çok)' },
      { value: 'POPULARITY_DESC', label: 'Popülerlik (Yüksek → Düşük)' },
      { value: 'TRENDING_DESC', label: 'Trend' }
    ];
  }

  getGenreOptions() {
    return [
      'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 
      'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 
      'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
    ];
  }

  getStatusOptions() {
    return [
      { value: 'FINISHED', label: 'Tamamlandı' },
      { value: 'RELEASING', label: 'Yayınlanıyor' },
      { value: 'NOT_YET_RELEASED', label: 'Henüz Yayınlanmadı' },
      { value: 'CANCELLED', label: 'İptal Edildi' },
      { value: 'HIATUS', label: 'Ara Verildi' }
    ];
  }

  getFormatOptions() {
    return [
      { value: 'TV', label: 'TV' },
      { value: 'TV_SHORT', label: 'TV Kısa' },
      { value: 'MOVIE', label: 'Film' },
      { value: 'SPECIAL', label: 'Özel' },
      { value: 'OVA', label: 'OVA' },
      { value: 'ONA', label: 'ONA' },
      { value: 'MUSIC', label: 'Müzik' }
    ];
  }
}