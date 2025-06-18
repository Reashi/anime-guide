import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListService } from '../../core/services/user-list.service';
import { AuthService } from '../../core/services/auth.service';
import { UserAnimeList } from '../../core/models/user-list.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { AdsenseComponent } from '../../shared/components/adsense/adsense.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, FormsModule, AnimeCardComponent, AdsenseComponent],
  template: `
    <div class="bg-gray-50 dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Page Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
              <svg class="w-8 h-8 text-red-500 mr-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
              Favoriler
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              En sevdiğiniz animeler burada
            </p>
          </div>
          
          <!-- Search and Sort -->
          <div class="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
            <div class="relative">
              <input
                type="text"
                placeholder="Favorilerde ara..."
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
                class="w-full sm:w-64 px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white"
              >
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
            </div>
            
            <select
              [(ngModel)]="sortBy"
              (change)="onSortChange()"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-gray-700 dark:text-white">
              <option value="dateAdded">Eklenme Tarihi</option>
              <option value="title">Alfabetik</option>
              <option value="score">Puanım</option>
              <option value="year">Yıl</option>
              <option value="rating">Anime Puanı</option>
            </select>
          </div>
        </div>

        <!-- Stats -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div class="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg shadow-sm p-6 text-center">
            <div class="text-3xl font-bold mb-2">
              {{ favorites.length }}
            </div>
            <div class="text-sm opacity-90">
              Toplam Favori
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg shadow-sm p-6 text-center">
            <div class="text-3xl font-bold mb-2">
              {{ getAverageScore() | number:'1.1-1' }}
            </div>
            <div class="text-sm opacity-90">
              Ortalama Puanım
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg shadow-sm p-6 text-center">
            <div class="text-3xl font-bold mb-2">
              {{ getCompletedCount() }}
            </div>
            <div class="text-sm opacity-90">
              Tamamlanan
            </div>
          </div>
          
          <div class="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg shadow-sm p-6 text-center">
            <div class="text-3xl font-bold mb-2">
              {{ getTopGenre() }}
            </div>
            <div class="text-sm opacity-90">
              En Sevilen Tür
            </div>
          </div>
        </div>

        <!-- Ad Space -->
        <app-adsense adSlot="8901234567" adFormat="banner" containerClass="mb-8"></app-adsense>

        <!-- Favorites Grid -->
        @if (loading) {
          <!-- Loading Skeleton -->
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            @for (item of [1,2,3,4,5,6,7,8,9,10]; track item) {
              <div class="animate-pulse">
                <div class="aspect-anime-poster bg-gray-300 rounded-lg mb-4"></div>
                <div class="h-4 bg-gray-300 rounded mb-2"></div>
                <div class="h-3 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            }
          </div>
        } @else if (filteredFavorites.length > 0) {
          <!-- Results Count -->
          <div class="flex justify-between items-center mb-6">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ filteredFavorites.length }} favori anime
            </div>
            
            <!-- View Mode Toggle -->
            <div class="flex items-center space-x-2">
              <button
                (click)="viewMode = 'grid'"
                [class]="viewMode === 'grid' ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
                class="p-2 rounded-md transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                </svg>
              </button>
              <button
                (click)="viewMode = 'list'"
                [class]="viewMode === 'list' ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
                class="p-2 rounded-md transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Grid View -->
          @if (viewMode === 'grid') {
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              @for (favorite of filteredFavorites; track favorite.id) {
                <div class="group relative">
                  <app-anime-card [anime]="favorite.anime"></app-anime-card>
                  
                  <!-- Favorite Badge -->
                  <div class="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                    </svg>
                  </div>
                  
                  <!-- My Score -->
                  @if (favorite.score) {
                    <div class="absolute bottom-20 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Puanım: {{ favorite.score }}
                    </div>
                  }
                  
                  <!-- Remove from Favorites -->
                  <div class="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      (click)="removeFromFavorites(favorite)"
                      class="w-full bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded transition-colors">
                      Favorilerden Çıkar
                    </button>
                  </div>
                </div>
              }
            </div>
          }

          <!-- List View -->
          @if (viewMode === 'list') {
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Anime
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Puanım
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Anime Puanı
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Tür
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    @for (favorite of filteredFavorites; track favorite.id) {
                      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="flex items-center">
                            <img [src]="favorite.anime.coverImage" [alt]="favorite.anime.title" class="h-16 w-12 object-cover rounded">
                            <div class="ml-4">
                              <div class="text-sm font-medium text-gray-900 dark:text-white">
                                {{ favorite.anime.title }}
                              </div>
                              <div class="text-sm text-gray-500 dark:text-gray-400">
                                {{ favorite.anime.seasonYear }} • {{ favorite.anime.episodes || '?' }} bölüm
                              </div>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          @if (favorite.score) {
                            <div class="flex items-center">
                              <span class="text-sm font-medium text-gray-900 dark:text-white">{{ favorite.score }}</span>
                              <div class="ml-2 flex">
                                @for (star of [1,2,3,4,5]; track star) {
                                  <svg 
                                    [class]="star <= (favorite.score || 0) / 2 ? 'text-yellow-400' : 'text-gray-300'"
                                    class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                  </svg>
                                }
                              </div>
                            </div>
                          } @else {
                            <span class="text-sm text-gray-500">-</span>
                          }
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          @if (favorite.anime.score) {
                            <span class="text-sm text-gray-900 dark:text-white">{{ favorite.anime.score }}</span>
                          } @else {
                            <span class="text-sm text-gray-500">-</span>
                          }
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="flex flex-wrap gap-1">
                            @for (genre of favorite.anime.genres.slice(0, 2); track genre) {
                              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                {{ genre }}
                              </span>
                            }
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <a [href]="'/anime/' + favorite.anime.id" class="text-blue-600 hover:text-blue-900">
                            Detay
                          </a>
                          <button
                            (click)="removeFromFavorites(favorite)"
                            class="text-red-600 hover:text-red-900">
                            Çıkar
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Ad Space -->
          <app-adsense adSlot="9012345678" adFormat="rectangle" containerClass="mt-8"></app-adsense>
        } @else {
          <!-- Empty State -->
          <div class="text-center py-16">
            <svg class="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Henüz favori anime eklememişsiniz
            </h3>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Sevdiğiniz animeleri favorilere ekleyerek kolayca erişin.
            </p>
            <div class="mt-6">
              <a href="/" class="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors">
                Anime Keşfet
              </a>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class FavoritesComponent implements OnInit {
  private userListService = inject(UserListService);
  private authService = inject(AuthService);

  favorites: UserAnimeList[] = [];
  filteredFavorites: UserAnimeList[] = [];
  loading = true;
  searchQuery = '';
  sortBy = 'dateAdded';
  viewMode: 'grid' | 'list' = 'grid';

  ngOnInit(): void {
    this.loadFavorites();
  }

  private loadFavorites(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userListService.getFavorites(currentUser.id).subscribe({
        next: (favorites) => {
          this.favorites = favorites;
          this.updateFilteredFavorites();
          this.loading = false;
        },
        error: (error) => {
          console.error('Favoriler yüklenemedi:', error);
          this.loading = false;
        }
      });
    }
  }

  private updateFilteredFavorites(): void {
    this.filteredFavorites = this.favorites.filter(favorite => {
      return !this.searchQuery || 
        favorite.anime.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        favorite.anime.genres.some(genre => genre.toLowerCase().includes(this.searchQuery.toLowerCase()));
    });

    // Sort
    this.filteredFavorites.sort((a, b) => {
      switch (this.sortBy) {
        case 'title':
          return a.anime.title.localeCompare(b.anime.title);
        case 'score':
          return (b.score || 0) - (a.score || 0);
        case 'year':
          return (b.anime.seasonYear || 0) - (a.anime.seasonYear || 0);
        case 'rating':
          return (b.anime.score || 0) - (a.anime.score || 0);
        case 'dateAdded':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }

  onSearch(): void {
    this.updateFilteredFavorites();
  }

  onSortChange(): void {
    this.updateFilteredFavorites();
  }

  removeFromFavorites(favorite: UserAnimeList): void {
    if (confirm('Bu animeyi favorilerden çıkarmak istediğinizden emin misiniz?')) {
      // Update the favorite flag
      this.userListService.updateListEntry(favorite.id, { favorite: false }).subscribe({
        next: () => {
          this.favorites = this.favorites.filter(f => f.id !== favorite.id);
          this.updateFilteredFavorites();
        },
        error: (error) => {
          console.error('Favorilerden çıkarılamadı:', error);
        }
      });
    }
  }

  getAverageScore(): number {
    const scoredFavorites = this.favorites.filter(f => f.score);
    if (scoredFavorites.length === 0) return 0;
    
    const total = scoredFavorites.reduce((sum, f) => sum + (f.score || 0), 0);
    return total / scoredFavorites.length;
  }

  getCompletedCount(): number {
    return this.favorites.filter(f => f.status === 'COMPLETED').length;
  }

  getTopGenre(): string {
    const genreCounts: { [key: string]: number } = {};
    
    this.favorites.forEach(favorite => {
      favorite.anime.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
    });

    const sortedGenres = Object.entries(genreCounts)
      .sort(([,a], [,b]) => b - a);
    
    return sortedGenres.length > 0 ? sortedGenres[0][0] : '-';
  }
} 