import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserListService } from '../../core/services/user-list.service';
import { User } from '../../core/models/user.model';
import { UserListStats } from '../../core/models/user-list.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-gray-50 dark:bg-gray-900">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        @if (currentUser) {
          <!-- Profile Header -->
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
            <div class="flex items-center space-x-6">
              <!-- Avatar -->
              <div class="relative">
                @if (currentUser.avatar) {
                  <img 
                    [src]="currentUser.avatar" 
                    [alt]="currentUser.username"
                    class="w-24 h-24 rounded-full object-cover"
                  >
                } @else {
                  <div class="w-24 h-24 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <span class="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {{ currentUser.username[0].toUpperCase() }}
                    </span>
                  </div>
                }
                
                <!-- Edit Avatar Button -->
                <button class="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
              </div>
              
              <!-- User Info -->
              <div class="flex-1">
                <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
                  {{ currentUser.username }}
                </h1>
                <p class="text-gray-600 dark:text-gray-400">
                  {{ currentUser.email }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-500 mt-2">
                  Üyelik tarihi: {{ currentUser.joinDate | date:'dd MMMM yyyy':'':'tr' }}
                </p>
              </div>
              
              <!-- Edit Profile Button -->
              <button 
                (click)="toggleEditMode()"
                class="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors">
                {{ editMode ? 'İptal' : 'Profili Düzenle' }}
              </button>
            </div>
          </div>

          <!-- Edit Profile Form -->
          @if (editMode) {
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
              <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Profil Bilgilerini Düzenle
              </h2>
              
              <form (ngSubmit)="updateProfile()" class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <!-- Username -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kullanıcı Adı
                    </label>
                    <input
                      type="text"
                      [(ngModel)]="editForm.username"
                      name="username"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                  </div>
                  
                  <!-- Email -->
                  <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      E-posta
                    </label>
                    <input
                      type="email"
                      [(ngModel)]="editForm.email"
                      name="email"
                      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                  </div>
                </div>
                
                <!-- Preferences -->
                <div class="space-y-4">
                  <h3 class="text-lg font-medium text-gray-900 dark:text-white">Tercihler</h3>
                  
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <!-- Language -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Dil
                      </label>
                      <select
                        [(ngModel)]="editForm.preferences.language"
                        name="language"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                        <option value="tr">Türkçe</option>
                        <option value="en">English</option>
                        <option value="jp">日本語</option>
                      </select>
                    </div>
                    
                    <!-- Theme -->
                    <div>
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tema
                      </label>
                      <select
                        [(ngModel)]="editForm.preferences.theme"
                        name="theme"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white">
                        <option value="light">Açık</option>
                        <option value="dark">Koyu</option>
                      </select>
                    </div>
                    
                    <!-- Adult Content -->
                    <div class="flex items-center space-x-2 pt-8">
                      <input
                        type="checkbox"
                        [(ngModel)]="editForm.preferences.adultContent"
                        name="adultContent"
                        id="adultContent"
                        class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      >
                      <label for="adultContent" class="text-sm text-gray-700 dark:text-gray-300">
                        Yetişkin içeriği göster
                      </label>
                    </div>
                  </div>
                </div>
                
                <!-- Save Button -->
                <div class="flex justify-end space-x-4">
                  <button
                    type="button"
                    (click)="toggleEditMode()"
                    class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                    İptal
                  </button>
                  <button
                    type="submit"
                    [disabled]="saving"
                    class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors">
                    {{ saving ? 'Kaydediliyor...' : 'Kaydet' }}
                  </button>
                </div>
              </form>
            </div>
          }

          <!-- Stats -->
          @if (userStats) {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-blue-600 mb-2">
                  {{ userStats.totalAnime }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  Toplam Anime
                </div>
              </div>
              
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-green-600 mb-2">
                  {{ userStats.totalEpisodes }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  İzlenen Bölüm
                </div>
              </div>
              
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-purple-600 mb-2">
                  {{ userStats.meanScore | number:'1.1-1' }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  Ortalama Puan
                </div>
              </div>
              
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
                <div class="text-3xl font-bold text-orange-600 mb-2">
                  {{ (userStats.minutesWatched / 60) | number:'1.0-0' }}
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  İzleme Saati
                </div>
              </div>
            </div>
          }

          <!-- Quick Actions -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="/watchlist" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition-colors">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">İzleme Listesi</h3>
                  <p class="text-gray-600 dark:text-gray-400">Listenizdeki animeleri yönetin</p>
                </div>
              </div>
            </a>
            
            <a href="/favorites" class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-700 transition-colors">
                  <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Favoriler</h3>
                  <p class="text-gray-600 dark:text-gray-400">Favori animelerinizi görüntüleyin</p>
                </div>
              </div>
            </a>
            
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div class="flex items-center space-x-4">
                <div class="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Hesap Güvenliği</h3>
                  <p class="text-gray-600 dark:text-gray-400">Şifre ve güvenlik ayarları</p>
                </div>
              </div>
            </div>
          </div>
        } @else {
          <!-- Loading State -->
          <div class="flex items-center justify-center min-h-96">
            <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        }
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  private userListService = inject(UserListService);

  currentUser: User | null = null;
  userStats: UserListStats | null = null;
  editMode = false;
  saving = false;
  
  editForm = {
    username: '',
    email: '',
    preferences: {
      language: 'tr' as 'tr' | 'en' | 'jp',
      theme: 'light' as 'light' | 'dark',
      adultContent: false,
      notifications: {
        newEpisodes: true,
        recommendations: true,
        marketing: false
      }
    }
  };

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.editForm = {
          username: user.username,
          email: user.email,
          preferences: { ...user.preferences }
        };
        this.loadUserStats(user.id);
      }
    });
  }

  private loadUserStats(userId: string): void {
    this.userListService.getUserStats(userId).subscribe({
      next: (stats) => {
        this.userStats = stats;
      },
      error: (error) => {
        console.error('İstatistikler yüklenemedi:', error);
      }
    });
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (!this.editMode && this.currentUser) {
      // Reset form
      this.editForm = {
        username: this.currentUser.username,
        email: this.currentUser.email,
        preferences: { ...this.currentUser.preferences }
      };
    }
  }

  updateProfile(): void {
    this.saving = true;
    
    // Simulate API call
    setTimeout(() => {
      console.log('Profil güncellendi:', this.editForm);
      this.saving = false;
      this.editMode = false;
      
      // In real app, update the current user data
    }, 1000);
  }
} 