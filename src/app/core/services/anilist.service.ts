import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
  private readonly API_URL = 'https://graphql.anilist.co';

  constructor(private http: HttpClient) {}

  searchAnime(filters: SearchFilters, page: number = 1, perPage: number = 100): Observable<any> {
    console.log('AniList Service - Arama Parametreleri:', { filters, page, perPage });

    const query = `
      query ($page: Int, $perPage: Int, $search: String, $genres: [String], $format: MediaFormat, $status: MediaStatus, $sort: [MediaSort]) {
        Page(page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
            perPage
          }
          media(search: $search, genre_in: $genres, format: $format, status: $status, sort: $sort, type: ANIME) {
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
      sort: filters.sort || ['POPULARITY_DESC']
    };

    console.log('AniList API İsteği:', { query, variables });

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post(this.API_URL, {
      query,
      variables
    }, { headers }).pipe(
      map((response: any) => {
        console.log('AniList API Ham Yanıt:', response);

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        const media = response.data.Page.media;
        const searchTerm = filters.search?.toLowerCase() || '';

        // Sonuçları filtrele ve sırala
        const filteredMedia = media
          .map((item: any) => {
            // Tüm başlıkları ve alternatif isimleri bir dizide topla
            const titles = [
              item.title.romaji?.toLowerCase(),
              item.title.english?.toLowerCase(),
              item.title.native?.toLowerCase(),
              ...(item.synonyms?.map((s: string) => s.toLowerCase()) || [])
            ].filter(Boolean);

            // Benzerlik puanı hesapla
            let similarityScore = 0;
            if (searchTerm) {
              titles.forEach(title => {
                // Tam eşleşme
                if (title === searchTerm) similarityScore = 100;
                // Başlangıç eşleşmesi
                else if (title.startsWith(searchTerm)) similarityScore = Math.max(similarityScore, 80);
                // Kelime başlangıcı eşleşmesi
                else if (title.split(' ').some((word: string) => word.startsWith(searchTerm))) 
                  similarityScore = Math.max(similarityScore, 60);
                // İçinde geçme
                else if (title.includes(searchTerm)) similarityScore = Math.max(similarityScore, 40);
                // Kısmi eşleşme (en az 2 karakter)
                else if (searchTerm.length >= 2 && title.includes(searchTerm.substring(0, 2)))
                  similarityScore = Math.max(similarityScore, 20);
              });
            }

            return {
              ...this.transformSingleAnime(item),
              similarityScore
            };
          })
          .filter((item: any) => !searchTerm || item.similarityScore > 0)
          .sort((a: any, b: any) => {
            // Önce benzerlik puanına göre sırala
            if (a.similarityScore !== b.similarityScore) {
              return b.similarityScore - a.similarityScore;
            }
            // Benzerlik puanları eşitse popülerliğe göre sırala
            return b.popularity - a.popularity;
          });

        // Sayfalama bilgilerini güncelle
        const pageInfo = response.data.Page.pageInfo;
        pageInfo.total = filteredMedia.length; // Filtrelenmiş sonuç sayısı
        pageInfo.lastPage = Math.ceil(pageInfo.total / perPage);
        pageInfo.hasNextPage = page < pageInfo.lastPage;

        return {
          media: filteredMedia,
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
    
    return this.http.post(this.API_URL, { query }).pipe(
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