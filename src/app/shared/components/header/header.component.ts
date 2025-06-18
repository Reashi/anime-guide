import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <header class="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800">
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center space-x-4">
            <a routerLink="/" class="flex items-center space-x-2">
              <div class="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <span class="text-white font-bold text-lg">A</span>
              </div>
              <span class="text-xl font-bold text-white">Anime Rehberi</span>
            </a>
          </div>
          <!-- Navigasyon -->
          <nav class="hidden lg:flex items-center space-x-6">
            <a routerLink="/" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors">ANA SAYFA</a>
            <a routerLink="/search" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors">Trend Animeler</a>
            <a routerLink="/search" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors">Popüler Animeler</a>
            @if (isLoggedIn()) {
              <a routerLink="/watchlist" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors">İzleme Listesi</a>
              <a routerLink="/favorites" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors">Favoriler</a>
            }
          </nav>
          <!-- Arama Çubuğu -->
          <div class="hidden md:flex flex-1 max-w-md mx-8">
            <div class="relative w-full">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (keyup.enter)="performSearch()"
                placeholder="Anime ara... (örn: isekai, naruto)"
                class="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button 
                (click)="performSearch()"
                class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Kullanıcı Özel -->
           <nav class="hidden lg:flex items-center space-x-6">           
            @if (isLoggedIn()) {
              <a routerLink="/watchlist" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors">İzleme Listesi</a>
              <a routerLink="/favorites" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors">Favoriler</a>
            }
          </nav>

          <!-- Kullanıcı Menüsü -->
          <div class="flex items-center space-x-4">
            @if (isLoggedIn()) {
              <div class="relative" (click)="toggleUserMenu()">
                <button class="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <div class="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <span class="text-white text-sm font-medium">{{ getUserInitials() }}</span>
                  </div>
                  <span class="hidden md:block">{{ getCurrentUser()?.username }}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6,9 12,15 18,9"/>
                  </svg>
                </button>

                @if (showUserMenu()) {
                  <div class="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-2">
                    <a routerLink="/profile" class="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">Profil</a>
                    <a routerLink="/watchlist" class="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">İzleme Listesi</a>
                    <a routerLink="/favorites" class="block px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors">Favoriler</a>
                    <hr class="my-2 border-gray-700">
                    <button (click)="logout()" class="block w-full text-left px-4 py-2 text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors">Çıkış Yap</button>
                  </div>
                }
              </div>
            } @else {
              <div class="flex items-center space-x-2">
                <a routerLink="/login" class="text-gray-300 hover:text-white transition-colors">Giriş</a>
                <a routerLink="/register" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">Kayıt Ol</a>
              </div>
            }

            <!-- Mobil Menü -->
            <button (click)="toggleMobileMenu()" class="lg:hidden text-gray-300 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" x2="21" y1="6" y2="6"/>
                <line x1="3" x2="21" y1="12" y2="12"/>
                <line x1="3" x2="21" y1="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobil Arama -->
        <div class="md:hidden pb-4">
          <div class="relative">
            <input
              type="text"
              [(ngModel)]="searchQuery"
              (keyup.enter)="performSearch()"
              placeholder="Anime ara..."
              class="w-full px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button 
              (click)="performSearch()"
              class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Mobil Navigasyon -->
        @if (showMobileMenu()) {
          <div class="lg:hidden border-t border-gray-800 pt-4 pb-4">
            <div class="flex flex-col space-y-2">
              <a routerLink="/" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors py-2">Ana Sayfa</a>
              <a routerLink="/search" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors py-2">Ara</a>
              @if (isLoggedIn()) {
                <a routerLink="/watchlist" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors py-2">İzleme Listesi</a>
                <a routerLink="/favorites" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors py-2">Favoriler</a>
                <a routerLink="/profile" routerLinkActive="text-purple-400" class="text-gray-300 hover:text-white transition-colors py-2">Profil</a>
                <button (click)="logout()" class="text-red-400 hover:text-red-300 transition-colors py-2 text-left">Çıkış Yap</button>
              } @else {
                <a routerLink="/login" class="text-gray-300 hover:text-white transition-colors py-2">Giriş</a>
                <a routerLink="/register" class="text-gray-300 hover:text-white transition-colors py-2">Kayıt Ol</a>
              }
            </div>
          </div>
        }
      </div>
    </header>
  `
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  showUserMenu = signal(false);
  showMobileMenu = signal(false);
  isLoggedIn = signal(false);
  searchQuery = '';

  ngOnInit() {
    this.isLoggedIn.set(this.authService.isAuthenticated());
    
    // Auth state değişikliklerini dinle
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn.set(!!user);
    });
  }

  performSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchQuery.trim() }
      });
      this.searchQuery = ''; // Arama sonrası temizle
      this.showMobileMenu.set(false); // Mobil menüyü kapat
    }
  }

  toggleUserMenu() {
    this.showUserMenu.set(!this.showUserMenu());
  }

  toggleMobileMenu() {
    this.showMobileMenu.set(!this.showMobileMenu());
  }

  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  getUserInitials() {
    const user = this.getCurrentUser();
    return user?.username ? user.username.substring(0, 2).toUpperCase() : 'U';
  }

  logout() {
    this.authService.logout();
    this.showUserMenu.set(false);
    this.showMobileMenu.set(false);
    this.router.navigate(['/']);
  }
} 