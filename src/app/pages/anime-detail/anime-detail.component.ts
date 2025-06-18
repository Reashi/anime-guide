import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AnilistService } from '../../core/services/anilist.service';
import { UserListService } from '../../core/services/user-list.service';
import { AuthService } from '../../core/services/auth.service';
import { Anime } from '../../core/models/anime.model';
import { WatchStatus } from '../../core/models/user-list.model';
import { AdsenseComponent } from '../../shared/components/adsense/adsense.component';

@Component({
  selector: 'app-anime-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, AdsenseComponent],
  template: `
    <div class="bg-gray-50 dark:bg-gray-900">
      @if (loading) {
        <!-- Loading Skeleton -->
        <div class="animate-pulse">
          <div class="h-64 bg-gray-300"></div>
          <div class="max-w-7xl mx-auto px-4 py-8">
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div class="aspect-anime-poster bg-gray-300 rounded-lg"></div>
              <div class="lg:col-span-2 space-y-4">
                <div class="h-8 bg-gray-300 rounded"></div>
                <div class="h-4 bg-gray-300 rounded w-3/4"></div>
                <div class="h-20 bg-gray-300 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      } @else if (anime) {
        <!-- Banner Image -->
        @if (anime.bannerImage) {
          <div class="relative h-64 md:h-96 overflow-hidden">
            <img 
              [src]="anime.bannerImage" 
              [alt]="anime.title"
              class="w-full h-full object-cover"
            >
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          </div>
        } @else {
          <div class="w-full h-full bg-gradient-to-r from-purple-600 to-pink-600"></div>
        }
        
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/50"></div>

        <!-- Main Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Left Column: Poster & Actions -->
            <div class="lg:col-span-1">
              <div class="sticky top-8">
                <!-- Poster -->
                <div class="relative aspect-anime-poster rounded-lg overflow-hidden shadow-lg mb-6">
                  <div class="aspect-anime-poster relative">
                    <div class="absolute inset-0 bg-gradient-to-t from-black to-transparent z-10"></div>
                    <img 
                      [src]="anime.coverImage" 
                      [alt]="anime.title"
                      class="w-full h-full object-cover"
                    >
                  </div>
                </div>

                <!-- Action Buttons -->
                @if (isAuthenticated()) {
                  <div class="space-y-3">
                    <button 
                      (click)="addToWatchlist()"
                      [disabled]="addingToList"
                      class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-lg font-medium transition-colors">
                      {{ addingToList ? 'Ekleniyor...' : '+ İzleme Listesi' }}
                    </button>
                    
                    <button 
                      (click)="toggleFavorite()"
                      [class]="isFavorite ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'"
                      class="w-full text-white py-3 px-4 rounded-lg font-medium transition-colors">
                      {{ isFavorite ? '❤️ Favorilerden Çıkar' : '🤍 Favorilere Ekle' }}
                    </button>
                  </div>
                } @else {
                  <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                    <p class="text-blue-700 dark:text-blue-300 mb-3">
                      İzleme listesi ve favoriler için giriş yapın
                    </p>
                    <a routerLink="/login" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                      Giriş Yap
                    </a>
                  </div>
                }

                <!-- Ad Space -->
                <app-adsense adSlot="3456789012" adFormat="square" containerClass="mt-6"></app-adsense>
              </div>
            </div>

            <!-- Right Column: Details -->
            <div class="lg:col-span-2">
              <!-- Title & Basic Info -->
              <div class="mb-6">
                <h1 class="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  {{ anime.title }}
                </h1>
                @if (anime.englishTitle && anime.englishTitle !== anime.title) {
                  <h2 class="text-xl text-gray-600 dark:text-gray-400 mb-2">
                    {{ anime.englishTitle }}
                  </h2>
                }
                @if (anime.nativeTitle) {
                  <h3 class="text-lg text-gray-500 dark:text-gray-500">
                    {{ anime.nativeTitle }}
                  </h3>
                }
              </div>

              <!-- Stats Grid -->
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                @if (anime.score) {
                  <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ anime.score }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Puan</div>
                  </div>
                }
                @if (anime.popularity) {
                  <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-green-600 dark:text-green-400">{{ anime.popularity | number }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Popülerlik</div>
                  </div>
                }
                @if (anime.favourites) {
                  <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-red-600 dark:text-red-400">{{ anime.favourites | number }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Favori</div>
                  </div>
                }
                @if (anime.episodes) {
                  <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                    <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">{{ anime.episodes }}</div>
                    <div class="text-sm text-gray-600 dark:text-gray-400">Bölüm</div>
                  </div>
                }
              </div>

              <!-- Description -->
              @if (anime.description) {
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6">
                  <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Açıklama</h3>
                  <div class="text-gray-700 dark:text-gray-300 prose prose-sm max-w-none" 
                       [innerHTML]="anime.description">
                  </div>
                </div>
              }

              <!-- Genres -->
              @if (anime && anime.genres && anime.genres.length > 0) {
                <div class="mb-6">
                  <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Türler</h3>
                  <div class="flex flex-wrap gap-2">
                    @for (genre of anime.genres; track genre) {
                      <span class="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm font-medium">
                        {{ genre }}
                      </span>
                    }
                  </div>
                </div>
              }

              <!-- Studios -->
              @if (anime && anime.studios && anime.studios.length > 0) {
                <div class="mb-6">
                  <h3 class="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Stüdyolar</h3>
                  <div class="flex flex-wrap gap-2">
                    @for (studio of anime.studios; track studio) {
                      <span class="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                        {{ studio }}
                      </span>
                    }
                  </div>
                </div>
              }

              <!-- Ad Space -->
              <app-adsense adSlot="4567890123" adFormat="banner" containerClass="mb-6"></app-adsense>

              <!-- Trailer -->
              @if (anime.trailer) {
                <div class="bg-white dark:bg-gray-800 p-6 rounded-lg mb-6">
                  <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">Fragman</h3>
                  <div class="aspect-video">
                    @if (anime.trailer.site === 'youtube') {
                      <iframe 
                        [src]="'https://www.youtube.com/embed/' + anime.trailer.id"
                        class="w-full h-full rounded-lg"
                        frameborder="0"
                        allowfullscreen>
                      </iframe>
                    }
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- Error State -->
        <div class="flex items-center justify-center py-24">
          <div class="text-center">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Anime bulunamadı
            </h1>
            <p class="text-gray-600 dark:text-gray-400 mb-6">
              Aradığınız anime mevcut değil veya bir hata oluştu.
            </p>
            <a routerLink="/" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
              Ana Sayfaya Dön
            </a>
          </div>
        </div>
      }
    </div>
  `
})
export class AnimeDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private anilistService = inject(AnilistService);
  private userListService = inject(UserListService);
  private authService = inject(AuthService);

  anime: Anime | null = null;
  loading = true;
  addingToList = false;
  isFavorite = false;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const animeId = +params['id'];
      if (animeId) {
        this.loadAnime(animeId);
      }
    });
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  private loadAnime(id: number): void {
    this.loading = true;
    this.anilistService.getAnimeById(id).subscribe({
      next: (anime) => {
        this.anime = anime;
        this.loading = false;
        // Check if in user's list/favorites
        this.checkUserStatus(id);
      },
      error: (error) => {
        console.error('Anime yüklenemedi:', error);
        this.loading = false;
      }
    });
  }

  private checkUserStatus(animeId: number): void {
    if (this.isAuthenticated()) {
      this.userListService.isInList(animeId).subscribe(entry => {
        // Check if in list and favorite status
      });
      
      this.userListService.isFavorite(animeId).subscribe(favorite => {
        this.isFavorite = favorite;
      });
    }
  }

  addToWatchlist(): void {
    if (!this.anime || this.addingToList) return;
    
    this.addingToList = true;
    this.userListService.addToList(this.anime.id, WatchStatus.PLANNING).subscribe({
      next: () => {
        this.addingToList = false;
        // Show success message
      },
      error: (error) => {
        console.error('Liste ekleme hatası:', error);
        this.addingToList = false;
      }
    });
  }

  toggleFavorite(): void {
    if (!this.anime) return;
    
    // Implementation for favorite toggle
    this.isFavorite = !this.isFavorite;
    console.log('Favori durumu değiştirildi:', this.isFavorite);
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'RELEASING': return 'Yayında';
      case 'FINISHED': return 'Tamamlandı';
      case 'NOT_YET_RELEASED': return 'Yakında';
      case 'CANCELLED': return 'İptal';
      case 'HIATUS': return 'Ara';
      default: return status;
    }
  }
} 