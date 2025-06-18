import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Anime } from '../../../core/models/anime.model';
import { UserListService } from '../../../core/services/user-list.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="group relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden">
      <!-- Anime Poster -->
      <div class="relative aspect-anime-poster overflow-hidden">
        <img 
          [src]="anime.coverImage" 
          [alt]="anime.title"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        >
        
        <!-- Status Badge -->
        @if (anime.status) {
          <div class="absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded-md"
               [ngClass]="getStatusBadgeClass(anime.status)">
            {{ getStatusText(anime.status) }}
          </div>
        }
        
        <!-- Score Badge -->
        @if (anime.score) {
          <div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs font-medium">
            ⭐ {{ anime.score }}
          </div>
        }
        
        <!-- Overlay -->
        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div class="absolute bottom-4 left-4 right-4">
            <!-- Quick Actions -->
            @if (isAuthenticated()) {
              <div class="flex space-x-2 mb-2">
                <button 
                  (click)="addToList($event)"
                  class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded-md transition-colors">
                  + Liste
                </button>
                <button 
                  (click)="toggleFavorite($event)"
                  class="bg-red-600 hover:bg-red-700 text-white text-xs py-2 px-3 rounded-md transition-colors">
                  ♥
                </button>
              </div>
            }
            
            <!-- Genres -->
            <div class="flex flex-wrap gap-1">
              @for (genre of anime.genres.slice(0, 2); track genre) {
                <span class="bg-white/20 text-white text-xs px-2 py-1 rounded-md">
                  {{ genre }}
                </span>
              }
            </div>
          </div>
        </div>
      </div>
      
      <!-- Anime Info -->
      <div class="p-4">
        <h3 class="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          <a [routerLink]="['/anime', anime.id]">
            {{ anime.title }}
          </a>
        </h3>
        
        <!-- Meta Info -->
        <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          @if (anime.format) {
            <div>{{ getFormatText(anime.format) }}</div>
          }
          @if (anime.episodes) {
            <div>{{ anime.episodes }} bölüm</div>
          }
          @if (anime.seasonYear) {
            <div>{{ anime.seasonYear }}</div>
          }
        </div>
        
        <!-- Studios -->
        @if (anime && anime.studios && anime.studios.length > 0) {
          <div class="flex flex-wrap gap-1 mb-2">
            @for (studio of anime.studios.slice(0, 2); track studio) {
              <span class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                {{ studio }}
              </span>
            }
            @if (anime.studios.length > 2) {
              <span class="text-xs text-gray-500 dark:text-gray-400">
                +{{ anime.studios.length - 2 }}
              </span>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class AnimeCardComponent {
  @Input() anime!: Anime;
  
  private userListService = inject(UserListService);
  private authService = inject(AuthService);
  
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
  
  addToList(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.userListService.addToList(this.anime.id).subscribe({
      next: () => {
        // Show success message
        console.log('Listeye eklendi');
      },
      error: (error) => {
        console.error('Liste ekleme hatası:', error);
      }
    });
  }
  
  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Implementation for favorite toggle
    console.log('Favori durumu değiştirildi');
  }
  
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'RELEASING':
        return 'bg-green-600 text-white';
      case 'FINISHED':
        return 'bg-blue-600 text-white';
      case 'NOT_YET_RELEASED':
        return 'bg-yellow-600 text-white';
      case 'CANCELLED':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }
  
  getStatusText(status: string): string {
    switch (status) {
      case 'RELEASING':
        return 'Yayında';
      case 'FINISHED':
        return 'Tamamlandı';
      case 'NOT_YET_RELEASED':
        return 'Yakında';
      case 'CANCELLED':
        return 'İptal';
      case 'HIATUS':
        return 'Ara';
      default:
        return status;
    }
  }
  
  getFormatText(format: string): string {
    switch (format) {
      case 'TV':
        return 'TV Serisi';
      case 'TV_SHORT':
        return 'Kısa Seri';
      case 'MOVIE':
        return 'Film';
      case 'SPECIAL':
        return 'Özel';
      case 'OVA':
        return 'OVA';
      case 'ONA':
        return 'ONA';
      case 'MUSIC':
        return 'Müzik';
      default:
        return format;
    }
  }
} 