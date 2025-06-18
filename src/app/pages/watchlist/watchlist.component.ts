import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserListService } from '../../core/services/user-list.service';
import { AuthService } from '../../core/services/auth.service';
import { UserAnimeList, WatchStatus } from '../../core/models/user-list.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { AdsenseComponent } from '../../shared/components/adsense/adsense.component';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, FormsModule, AnimeCardComponent, AdsenseComponent],
  template: `
    <div class="bg-gray-50 dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Page Header -->
        <div class="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
              İzleme Listesi
            </h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              İzlediğiniz animeleri takip edin ve yönetin
            </p>
          </div>
          
          <!-- Search and Filter -->
          <div class="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
            <div class="relative">
              <input
                type="text"
                placeholder="Anime ara..."
                [(ngModel)]="searchQuery"
                (input)="onSearch()"
                class="w-full sm:w-64 px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
            </div>
            
            <select
              [(ngModel)]="statusFilter"
              (change)="onFilterChange()"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
              <option value="">Tüm Durumlar</option>
              <option value="WATCHING">İzleniyor</option>
              <option value="COMPLETED">Tamamlandı</option>
              <option value="PAUSED">Durduruldu</option>
              <option value="DROPPED">Bırakıldı</option>
              <option value="PLANNING">Planlanıyor</option>
            </select>
          </div>
        </div>

        <!-- Status Overview -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          @for (status of statusCounts | keyvalue; track status.key) {
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 text-center">
              <div class="text-2xl font-bold text-blue-600 mb-1">
                {{ status.value }}
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400">
                {{ getStatusText(status.key) }}
              </div>
            </div>
          }
        </div>

        <!-- Ad Space -->
        <app-adsense adSlot="6789012345" adFormat="banner" containerClass="mb-8"></app-adsense>

        <!-- Anime List -->
        @if (loading) {
          <!-- Loading Skeleton -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            @for (item of [1,2,3,4,5,6,7,8]; track item) {
              <div class="animate-pulse">
                <div class="aspect-anime-poster bg-gray-300 rounded-lg mb-4"></div>
                <div class="h-4 bg-gray-300 rounded mb-2"></div>
                <div class="h-3 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            }
          </div>
        } @else if (filteredList.length > 0) {
          <!-- List View Toggle -->
          <div class="flex justify-between items-center mb-6">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              {{ filteredList.length }} anime bulundu
            </div>
            
            <div class="flex items-center space-x-2">
              <button
                (click)="viewMode = 'grid'"
                [class]="viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
                class="p-2 rounded-md transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
                </svg>
              </button>
              <button
                (click)="viewMode = 'list'"
                [class]="viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'"
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
              @for (item of filteredList; track item.id) {
                <div class="group relative">
                  <app-anime-card [anime]="item.anime"></app-anime-card>
                  
                  <!-- Status Badge -->
                  <div class="absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded-md text-white"
                       [ngClass]="getStatusBadgeClass(item.status)">
                    {{ getStatusText(item.status) }}
                  </div>
                  
                  <!-- Progress -->
                  @if (item.anime.episodes && item.progress > 0) {
                    <div class="absolute bottom-20 left-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      {{ item.progress }}/{{ item.anime.episodes }}
                    </div>
                  }
                  
                  <!-- Quick Actions -->
                  <div class="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div class="flex space-x-1">
                      <button
                        (click)="updateProgress(item, item.progress + 1)"
                        [disabled]="item.progress >= (item.anime.episodes || 0)"
                        class="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 text-white text-xs py-1 rounded transition-colors">
                        +1
                      </button>
                      <button
                        (click)="openEditModal(item)"
                        class="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded transition-colors">
                        Düzenle
                      </button>
                    </div>
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
                        Durum
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        İlerleme
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Puanım
                      </th>
                      <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        İşlemler
                      </th>
                    </tr>
                  </thead>
                  <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    @for (item of filteredList; track item.id) {
                      <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td class="px-6 py-4 whitespace-nowrap">
                          <div class="flex items-center space-x-4">
                            <img [src]="item.anime.coverImage" [alt]="item.anime.title" class="h-16 w-12 object-cover rounded">
                            <div class="flex-1">
                              <h3 class="font-medium text-gray-900 dark:text-white">
                                {{ item.anime.title }}
                              </h3>
                              <p class="text-sm text-gray-600 dark:text-gray-400">
                                {{ item.anime.episodes ? item.anime.episodes + ' bölüm' : 'Bilinmiyor' }}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap">
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                [ngClass]="getStatusBadgeClass(item.status)">
                            {{ getStatusText(item.status) }}
                          </span>
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {{ item.progress }}/{{ item.anime.episodes || '?' }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {{ item.score || '-' }}
                        </td>
                        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            (click)="updateProgress(item, item.progress + 1)"
                            [disabled]="item.progress >= (item.anime.episodes || 0)"
                            class="text-green-600 hover:text-green-900 disabled:text-gray-400">
                            +1
                          </button>
                          <button
                            (click)="openEditModal(item)"
                            class="text-blue-600 hover:text-blue-900">
                            Düzenle
                          </button>
                          <button
                            (click)="removeFromList(item)"
                            class="text-red-600 hover:text-red-900">
                            Kaldır
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
          <app-adsense adSlot="7890123456" adFormat="rectangle" containerClass="mt-8"></app-adsense>
        } @else {
          <!-- Empty State -->
          <div class="text-center py-16">
            <svg class="mx-auto h-24 w-24 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              İzleme listeniz boş
            </h3>
            <p class="mt-2 text-gray-600 dark:text-gray-400">
              Henüz hiç anime eklememişsiniz. Hemen keşfetmeye başlayın!
            </p>
            <div class="mt-6">
              <a href="/" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
                Anime Keşfet
              </a>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class WatchlistComponent implements OnInit {
  private userListService = inject(UserListService);
  private authService = inject(AuthService);

  userList: UserAnimeList[] = [];
  filteredList: UserAnimeList[] = [];
  statusCounts: { [key: string]: number } = {};
  loading = true;
  searchQuery = '';
  statusFilter = '';
  viewMode: 'grid' | 'list' = 'grid';

  ngOnInit(): void {
    this.loadUserList();
  }

  private loadUserList(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userListService.getUserList(currentUser.id).subscribe({
        next: (list) => {
          this.userList = list;
          this.updateFilteredList();
          this.updateStatusCounts();
          this.loading = false;
        },
        error: (error) => {
          console.error('İzleme listesi yüklenemedi:', error);
          this.loading = false;
        }
      });
    }
  }

  private updateFilteredList(): void {
    this.filteredList = this.userList.filter(item => {
      const matchesSearch = !this.searchQuery || 
        (typeof item.anime.title === 'string' ? 
          item.anime.title.toLowerCase().includes(this.searchQuery.toLowerCase()) :
          (item.anime.title as any).romaji?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          (item.anime.title as any).english?.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      
      const matchesStatus = !this.statusFilter || item.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  private updateStatusCounts(): void {
    this.statusCounts = this.userList.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {} as { [key: string]: number });
  }

  onSearch(): void {
    this.updateFilteredList();
  }

  onFilterChange(): void {
    this.updateFilteredList();
  }

  updateProgress(item: UserAnimeList, newProgress: number): void {
    if (newProgress < 0 || (item.anime.episodes && newProgress > item.anime.episodes)) {
      return;
    }

    const updates: Partial<UserAnimeList> = { progress: newProgress };
    
    // Auto-complete if finished
    if (item.anime.episodes && newProgress === item.anime.episodes) {
      updates.status = WatchStatus.COMPLETED;
    }

    this.userListService.updateListEntry(item.id, updates).subscribe({
      next: () => {
        item.progress = newProgress;
        if (updates.status) {
          item.status = updates.status;
          this.updateStatusCounts();
        }
      },
      error: (error) => {
        console.error('İlerleme güncellenemedi:', error);
      }
    });
  }

  openEditModal(item: UserAnimeList): void {
    // TODO: Implement edit modal
    console.log('Edit modal açılacak:', item);
  }

  removeFromList(item: UserAnimeList): void {
    if (confirm('Bu animeyi listeden kaldırmak istediğinizden emin misiniz?')) {
      this.userListService.removeFromList(item.id).subscribe({
        next: () => {
          this.userList = this.userList.filter(i => i.id !== item.id);
          this.updateFilteredList();
          this.updateStatusCounts();
        },
        error: (error) => {
          console.error('Anime kaldırılamadı:', error);
        }
      });
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'WATCHING': return 'İzleniyor';
      case 'COMPLETED': return 'Tamamlandı';
      case 'PAUSED': return 'Durduruldu';
      case 'DROPPED': return 'Bırakıldı';
      case 'PLANNING': return 'Planlanıyor';
      case 'REPEATING': return 'Tekrar İzleniyor';
      default: return status;
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'WATCHING': return 'bg-green-600 text-white';
      case 'COMPLETED': return 'bg-blue-600 text-white';
      case 'PAUSED': return 'bg-yellow-600 text-white';
      case 'DROPPED': return 'bg-red-600 text-white';
      case 'PLANNING': return 'bg-gray-600 text-white';
      case 'REPEATING': return 'bg-purple-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  }
} 