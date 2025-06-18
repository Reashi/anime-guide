import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-24">
      <div class="max-w-lg w-full text-center">
        <!-- 404 Animation -->
        <div class="mb-8">
          <div class="text-9xl font-bold text-blue-600 dark:text-blue-400 mb-4 animate-bounce">
            404
          </div>
          <div class="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-4">
            Sayfa Bulunamadı
          </div>
        </div>

        <!-- Error Message -->
        <div class="mb-8">
          <p class="text-gray-600 dark:text-gray-400 text-lg mb-4">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>
          <p class="text-gray-500 dark:text-gray-500 text-sm">
            URL'yi kontrol edin veya ana sayfaya dönerek aramaya devam edin.
          </p>
        </div>

        <!-- Search Suggestion -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-8">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Aradığınızı bulamadınız mı?
          </h3>
          <div class="space-y-3">
            <a 
              routerLink="/"
              class="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
              🏠 Ana Sayfaya Dön
            </a>
            <a 
              routerLink="/login"
              class="block w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors">
              👤 Giriş Yap
            </a>
          </div>
        </div>

        <!-- Popular Links -->
        <div class="grid grid-cols-2 gap-4 text-sm">
          <a 
            routerLink="/"
            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center justify-center py-2 px-3 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            🔥 Trend Animeler
          </a>
          <a 
            routerLink="/"
            class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center justify-center py-2 px-3 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
            ⭐ Popüler Animeler
          </a>
        </div>

        <!-- Fun Anime Quote -->
        <div class="mt-8 p-4 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
          <p class="text-purple-800 dark:text-purple-300 text-sm italic">
            "Kaybolmak, yeni bir anime keşfetmenin başlangıcıdır." 
            <br>
            <span class="text-xs text-purple-600 dark:text-purple-400">- Anime Rehberi</span>
          </p>
        </div>

        <!-- Error Code -->
        <div class="mt-6 text-xs text-gray-400">
          Error Code: 404 | Page Not Found
        </div>
      </div>
    </div>
  `
})
export class NotFoundComponent {} 