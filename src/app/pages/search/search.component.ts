import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AnilistService, SearchFilters } from '../../core/services/anilist.service';
import { Anime } from '../../core/models/anime.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, AnimeCardComponent, ReactiveFormsModule],
  template: `
    <div class="min-h-screen bg-gray-900 text-white">
      <div class="container mx-auto px-4 py-8">
        <!-- Arama Başlığı -->
        <div class="container mx-auto px-4 py-8">
          <h1 class="text-2xl font-bold mb-4">Arama Sonuçları: "{{ searchControl.value || '' }}"</h1>
          <p class="text-gray-600 mb-8">{{ animes().length }} sonuç bulundu</p>

          <!-- Genişletilmiş Arama Formu -->
          <div class="bg-gray-800 rounded-lg p-6 mb-8">
            <!-- Ana Arama Input -->
            <div class="mb-6">
              <div class="flex flex-col space-y-2">
                <label class="text-sm font-medium text-gray-300">Anime Ara</label>
                <input
                  id="searchInput"
                  type="text"
                  [formControl]="searchControl"
                  placeholder="Örn: isekai, naruto..."
                  class="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                  (keyup.enter)="searchAnime()"
                />
              </div>
            </div>

            <!-- Alt Kontroller -->
            <div class="bottom-controls flex flex-wrap items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-700">
              <!-- Filtreler Dropdown -->
              <div class="relative">
                <button
                  type="button"
                  (click)="toggleFiltersDropdown()"
                  class="flex items-center justify-between px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[160px]"
                >
                  <span class="text-sm">
                    {{ getActiveFiltersText() }}
                  </span>
                  <svg class="w-4 h-4 ml-2 transition-transform" [class.rotate-180]="showFiltersDropdown">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                
                <div *ngIf="showFiltersDropdown" class="absolute z-50 w-72 md:w-80 mt-2 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-80 overflow-hidden left-0 md:left-auto">
                  <div class="p-3">
                    <!-- Genreler -->
                    <div class="mb-3">
                      <label class="block text-xs font-medium text-gray-300 mb-2">Genreler</label>
                      <div class="grid grid-cols-4 gap-1 max-h-28 overflow-y-auto custom-scrollbar">
                        <label 
                          *ngFor="let genre of genreOptions" 
                          class="genre-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500"
                        >
                          <input
                            type="checkbox"
                            [checked]="isGenreSelected(genre)"
                            (change)="onGenreChange($event, genre)"
                            class="form-checkbox h-3 w-3 text-purple-600 rounded focus:ring-purple-500 bg-gray-500 border-gray-400 flex-shrink-0"
                          />
                          <span class="text-xs truncate">{{ genre }}</span>
                        </label>
                      </div>
                    </div>

                    <!-- Formatlar -->
                    <div class="mb-3">
                      <label class="block text-xs font-medium text-gray-300 mb-2">Formatlar</label>
                      <div class="grid grid-cols-3 gap-1">
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            [value]="null"
                            [formControl]="formatControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">Tümü</span>
                        </label>
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            value="TV"
                            [formControl]="formatControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">TV</span>
                        </label>
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            value="MOVIE"
                            [formControl]="formatControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">Film</span>
                        </label>
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            value="OVA"
                            [formControl]="formatControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">OVA</span>
                        </label>
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            value="ONA"
                            [formControl]="formatControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">ONA</span>
                        </label>
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            value="SPECIAL"
                            [formControl]="formatControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">Özel</span>
                        </label>
                      </div>
                    </div>

                    <!-- Durumlar -->
                    <div class="mb-3">
                      <label class="block text-xs font-medium text-gray-300 mb-2">Durumlar</label>
                      <div class="grid grid-cols-2 gap-1">
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            [value]="null"
                            [formControl]="statusControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">Tümü</span>
                        </label>
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            value="FINISHED"
                            [formControl]="statusControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">Tamamlandı</span>
                        </label>
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            value="RELEASING"
                            [formControl]="statusControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">Devam Ediyor</span>
                        </label>
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            value="NOT_YET_RELEASED"
                            [formControl]="statusControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">Yayınlanmadı</span>
                        </label>
                        <label class="radio-filter-item flex items-center space-x-1 cursor-pointer hover:text-purple-400 transition-colors bg-gray-600 px-1 py-1 rounded text-xs hover:bg-gray-500">
                          <input
                            type="radio"
                            value="CANCELLED"
                            [formControl]="statusControl"
                            class="form-radio h-3 w-3 text-purple-600 bg-gray-500 border-gray-400 focus:ring-purple-500 flex-shrink-0"
                          />
                          <span class="text-xs">İptal Edildi</span>
                        </label>
                      </div>
                    </div>

                    <!-- Filtre Temizleme Butonu -->
                    <div class="flex justify-end pt-2 border-t border-gray-600" *ngIf="hasActiveFilters()">
                      <button
                        type="button"
                        (click)="clearFilters()"
                        class="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
                      >
                        Filtreleri Temizle
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sıralama Dropdown -->
              <div class="relative">
                <button
                  type="button"
                  (click)="toggleSortDropdown()"
                  class="flex items-center justify-between px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[160px]"
                >
                  <span class="text-sm">
                    {{ getSortLabel(sortControl.value) }}
                  </span>
                  <svg class="w-4 h-4 ml-2 transition-transform" [class.rotate-180]="showSortDropdown">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                
                <div *ngIf="showSortDropdown" class="absolute z-50 w-full mt-2 bg-gray-700 border border-gray-600 rounded-lg shadow-lg">
                  <div class="py-1">
                    <button
                      type="button"
                      (click)="selectSort('POPULARITY_DESC')"
                      class="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600"
                      [class.bg-gray-600]="sortControl.value === 'POPULARITY_DESC'"
                    >
                      Popülerlik (Azalan)
                    </button>
                    <button
                      type="button"
                      (click)="selectSort('POPULARITY')"
                      class="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600"
                      [class.bg-gray-600]="sortControl.value === 'POPULARITY'"
                    >
                      Popülerlik (Artan)
                    </button>
                    <button
                      type="button"
                      (click)="selectSort('SCORE_DESC')"
                      class="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600"
                      [class.bg-gray-600]="sortControl.value === 'SCORE_DESC'"
                    >
                      Puan (Azalan)
                    </button>
                    <button
                      type="button"
                      (click)="selectSort('SCORE')"
                      class="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600"
                      [class.bg-gray-600]="sortControl.value === 'SCORE'"
                    >
                      Puan (Artan)
                    </button>
                    <button
                      type="button"
                      (click)="selectSort('TRENDING_DESC')"
                      class="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600"
                      [class.bg-gray-600]="sortControl.value === 'TRENDING_DESC'"
                    >
                      Trend (Azalan)
                    </button>
                    <button
                      type="button"
                      (click)="selectSort('TRENDING')"
                      class="block w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-600"
                      [class.bg-gray-600]="sortControl.value === 'TRENDING'"
                    >
                      Trend (Artan)
                    </button>
                  </div>
                </div>
              </div>

              <!-- Arama Butonu -->
              <div class="flex gap-2">
                <button
                  type="button"
                  (click)="searchAnime()"
                  class="search-button px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium transition-colors"
                >
                  Ara
                </button>
              </div>
            </div>
          </div>

          <!-- Arama Sonuçları -->
          <div class="space-y-8">
            <!-- İlk Yükleme -->
            <div *ngIf="loading() && animes().length === 0" class="flex justify-center items-center h-64">
              <div class="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
            </div>

            <!-- Sonuç Bulunamadı -->
            <div *ngIf="!loading() && animes().length === 0" class="text-center py-8">
              <p class="text-gray-400 text-lg">Sonuç bulunamadı.</p>
            </div>

            <!-- Anime Listesi -->
            <div *ngIf="animes().length > 0" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              <app-anime-card 
                *ngFor="let anime of animes()"
                [anime]="anime"
                class="transition-transform duration-300 hover:scale-105">
              </app-anime-card>
            </div>

            <!-- Infinite Scroll Trigger ve Yükleniyor Göstergesi -->
            <div #loadingTrigger class="flex justify-center items-center py-8" *ngIf="pageInfo().hasNextPage">
              <div *ngIf="loading()" class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              <div *ngIf="!loading()" class="text-gray-400">Daha fazla sonuç yükleniyor...</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Arama Sayfası Özel Stilleri */

    /* Ana Arama Input */
    #searchInput {
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    #searchInput:focus {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.3);
    }

    /* İç Filtre Stilları */
    .filter-section {
      border-radius: 0.5rem;
      transition: all 0.3s ease;
    }

    /* Tür Filtreleri */
    .genre-filter-item {
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .genre-filter-item:hover {
      border-color: #8B5CF6;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.2);
    }

    .genre-filter-item input:checked + span {
      color: #A855F7;
      font-weight: 500;
    }

    /* Format ve Durum Radio Butonları */
    .radio-filter-item {
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }

    .radio-filter-item:hover {
      border-color: #8B5CF6;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(139, 92, 246, 0.15);
    }

    .radio-filter-item input:checked + span {
      color: #A855F7;
      font-weight: 500;
    }

    /* Radio ve Checkbox Özel Stilleri */
    .form-radio {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .form-radio:checked {
      background-color: #8B5CF6;
      border-color: #8B5CF6;
    }

    .form-radio:hover:not(:checked) {
      border-color: #8B5CF6;
    }

    .form-checkbox {
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .form-checkbox:checked {
      background-color: #8B5CF6;
      border-color: #8B5CF6;
    }

    .form-checkbox:hover:not(:checked) {
      border-color: #8B5CF6;
    }

    /* Dropdown Menü Stilleri */
    .relative {
      position: relative;
    }

    .dropdown-button {
      transition: all 0.2s ease;
    }

    .dropdown-button:hover {
      background-color: #4B5563;
      transform: translateY(-1px);
    }

    .dropdown-menu {
      position: absolute;
      z-index: 50;
      width: 100%;
      margin-top: 0.5rem;
      background-color: #374151;
      border: 1px solid #4B5563;
      border-radius: 0.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      animation: dropdownFadeIn 0.15s ease-out;
    }

    .dropdown-item {
      display: block;
      width: 100%;
      padding: 0.5rem 1rem;
      text-align: left;
      font-size: 0.875rem;
      color: white;
      background: none;
      border: none;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .dropdown-item:hover {
      background-color: #4B5563;
    }

    .dropdown-item.active {
      background-color: #4B5563;
      font-weight: 500;
    }

    @keyframes dropdownFadeIn {
      from {
        opacity: 0;
        transform: translateY(-5px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Rotate Animation for Arrows */
    .rotate-180 {
      transform: rotate(180deg);
    }

    /* SVG Icon Styles */
    svg {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* Alt Kontroller Alanı */
    .bottom-controls {
      background: linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent);
      border-radius: 0.5rem;
    }

    /* Arama Butonu */
    .search-button {
      background: linear-gradient(135deg, #8B5CF6, #A855F7);
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }

    .search-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
    }

    /* Filtre Container */
    .filter-container {
      transition: all 0.3s ease;
    }

    .filter-container:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    /* Sayfalama Butonları */
    .pagination-button {
      transition: all 0.2s ease;
    }

    .pagination-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .pagination-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Anime Kartları Grid Animasyonu */
    .anime-grid {
      animation: fadeInUp 0.6s ease-out;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Yükleme Animasyonu */
    .loading-spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    /* Responsive Improvements */
    @media (max-width: 768px) {
      .filter-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      
      .genre-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
      }
      
      .dropdown-menu {
        max-height: 200px;
        overflow-y: auto;
      }

      .bottom-controls {
        flex-direction: column;
        align-items: stretch;
      }

      .bottom-controls .relative {
        order: 2;
        margin-top: 1rem;
      }

      .bottom-controls .flex {
        order: 1;
        justify-content: center;
      }
    }

    @media (max-width: 640px) {
      .anime-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }
      
      .pagination-container {
        flex-wrap: wrap;
        gap: 0.5rem;
      }
      
      .dropdown-button {
        min-width: 120px;
        font-size: 0.8rem;
      }

      .genre-filter-item,
      .radio-filter-item {
        padding: 0.5rem;
        font-size: 0.8rem;
      }

      #searchInput {
        font-size: 1rem;
        padding: 0.75rem 1rem;
      }
    }

    /* Filtre Temizle Butonu */
    .clear-filters-btn {
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .clear-filters-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
    }

    .clear-filters-btn:active {
      transform: scale(0.95);
    }

    /* Sonuç Sayısı */
    .result-count {
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.025em;
    }

    /* Boş Sonuç Alanı */
    .no-results {
      animation: fadeIn 0.5s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Özel Scrollbar Stilleri */
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: #4B5563 #1F2937;
    }

    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
      background: #1F2937;
      border-radius: 3px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background-color: #4B5563;
      border-radius: 3px;
    }

    /* Hover Efektleri */
    label {
      cursor: pointer;
      transition: opacity 0.2s ease;
    }

    label:hover {
      opacity: 0.9;
    }

    /* Filter Section Labels */
    .filter-section-label {
      color: #D1D5DB;
      font-weight: 500;
      margin-bottom: 0.75rem;
      padding-bottom: 0.25rem;
      border-bottom: 1px solid rgba(139, 92, 246, 0.2);
    }

    /* Button Group Styles */
    .filter-button-group {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      align-items: center;
    }

    /* Grid responsiveness for genres */
    @media (max-width: 1024px) {
      .grid-cols-6 {
        grid-template-columns: repeat(4, 1fr);
      }
    }

    @media (max-width: 768px) {
      .grid-cols-6 {
        grid-template-columns: repeat(3, 1fr);
      }
      
      .grid-cols-3 {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .grid-cols-6 {
        grid-template-columns: repeat(2, 1fr);
      }
      
      .grid-cols-3 {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SearchComponent implements OnInit, OnDestroy {
  @ViewChild('loadingTrigger') loadingTrigger!: ElementRef;

  private anilistService = inject(AnilistService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription[] = [];
  private fb = inject(FormBuilder);
  private observer: IntersectionObserver | null = null;
  private isLoading = false;
  private platformId = inject(PLATFORM_ID);

  // Signals
  animes = signal<Anime[]>([]);
  loading = signal(false);
  pageInfo = signal<{
    total: number;
    currentPage: number;
    lastPage: number;
    hasNextPage: boolean;
  }>({
    total: 0,
    currentPage: 1,
    lastPage: 1,
    hasNextPage: false
  });
  searchQuery = signal('');
  totalResults = computed(() => this.pageInfo().total);

  // Form değişkenleri
  searchTerm = '';
  sortBy = '';
  selectedStatuses: string[] = [];
  selectedFormats: string[] = [];
  selectedGenres: string[] = [];
  showFilters = false;

  // Dropdown state
  showSortDropdown = false;
  showFiltersDropdown = false;

  // Seçenekler
  sortOptions = this.anilistService.getSortOptions();
  statusOptions = this.anilistService.getStatusOptions();
  formatOptions = this.anilistService.getFormatOptions();
  genreOptions = this.anilistService.getGenreOptions();

  searchForm: FormGroup;
  currentPage = 1;
  currentYear = new Date().getFullYear();

  // Form Controls - public olarak tanımlanmalı
  public searchControl = new FormControl('');
  public genresControl = new FormControl<string[]>([]);
  public formatControl = new FormControl<string | null>(null);
  public statusControl = new FormControl<string | null>(null);
  public sortControl = new FormControl('POPULARITY_DESC');
  public yearStartControl = new FormControl<number | null>(null);
  public yearEndControl = new FormControl<number | null>(null);

  constructor() {
    this.searchForm = this.fb.group({
      search: this.searchControl,
      genres: this.genresControl,
      format: this.formatControl,
      status: this.statusControl,
      sort: this.sortControl,
      yearStart: this.yearStartControl,
      yearEnd: this.yearEndControl
    });
  }

  @HostListener('document:keydown.enter', ['$event'])
  onEnterKey(event: Event) {
    if (document.activeElement?.id === 'searchInput') {
      event.preventDefault();
      this.resetSearch();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.closeAllDropdowns();
    }
  }

  // Dropdown Yönetimi
  toggleSortDropdown(): void {
    this.showSortDropdown = !this.showSortDropdown;
    this.showFiltersDropdown = false;
  }

  toggleFiltersDropdown(): void {
    this.showFiltersDropdown = !this.showFiltersDropdown;
    this.showSortDropdown = false;
  }

  closeAllDropdowns(): void {
    this.showSortDropdown = false;
    this.showFiltersDropdown = false;
  }

  // Seçim Fonksiyonları
  selectSort(sort: string): void {
    this.sortControl.setValue(sort);
    this.showSortDropdown = false;
  }

  // Label Getirme Fonksiyonları
  getFormatLabel(format: string | null): string {
    if (!format) {
      return 'Tümü';
    }
    const formatLabels: { [key: string]: string } = {
      'TV': 'TV',
      'MOVIE': 'Film',
      'OVA': 'OVA',
      'ONA': 'ONA',
      'SPECIAL': 'Özel'
    };
    return formatLabels[format] || format;
  }

  getStatusLabel(status: string | null): string {
    if (!status) {
      return 'Tümü';
    }
    const statusLabels: { [key: string]: string } = {
      'FINISHED': 'Tamamlandı',
      'RELEASING': 'Devam Ediyor',
      'NOT_YET_RELEASED': 'Yayınlanmadı',
      'CANCELLED': 'İptal Edildi'
    };
    return statusLabels[status] || status;
  }

  getSortLabel(sort: string | null): string {
    if (!sort) {
      return 'Popülerlik (Azalan)';
    }
    const sortLabels: { [key: string]: string } = {
      'POPULARITY_DESC': 'Popülerlik (Azalan)',
      'POPULARITY': 'Popülerlik (Artan)',
      'SCORE_DESC': 'Puan (Azalan)',
      'SCORE': 'Puan (Artan)',
      'TRENDING_DESC': 'Trend (Azalan)',
      'TRENDING': 'Trend (Artan)'
    };
    return sortLabels[sort] || sort;
  }

  // Aktif Filtre Kontrolü
  hasActiveFilters(): boolean {
    return !!(
      this.formatControl.value ||
      this.statusControl.value ||
      this.genresControl.value?.length ||
      this.yearStartControl.value ||
      this.yearEndControl.value
    );
  }

  // Aktif filtre metni
  getActiveFiltersText(): string {
    const activeCount = this.getActiveFiltersCount();
    if (activeCount === 0) {
      return 'Filtreler';
    }
    return `Filtreler (${activeCount})`;
  }

  // Aktif filtre sayısı
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.formatControl.value) count++;
    if (this.statusControl.value) count++;
    if (this.genresControl.value?.length) count += this.genresControl.value.length;
    if (this.yearStartControl.value) count++;
    if (this.yearEndControl.value) count++;
    return count;
  }

  ngOnInit(): void {
    // Arama kutusunun değişikliklerini izle
    const searchSubscription = this.searchControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.resetSearch();
      });

    this.subscriptions.push(searchSubscription);

    // Format değişikliklerini izle
    const formatSubscription = this.formatControl.valueChanges.subscribe(() => {
      this.resetSearch();
    });

    this.subscriptions.push(formatSubscription);

    // Status değişikliklerini izle
    const statusSubscription = this.statusControl.valueChanges.subscribe(() => {
      this.resetSearch();
    });

    this.subscriptions.push(statusSubscription);

    // Sort değişikliklerini izle
    const sortSubscription = this.sortControl.valueChanges.subscribe(() => {
      this.resetSearch();
    });

    this.subscriptions.push(sortSubscription);

    // Yıl değişikliklerini izle
    const yearStartSubscription = this.yearStartControl.valueChanges.subscribe(() => {
      this.resetSearch();
    });

    const yearEndSubscription = this.yearEndControl.valueChanges.subscribe(() => {
      this.resetSearch();
    });

    this.subscriptions.push(yearStartSubscription, yearEndSubscription);

    // Intersection Observer'ı başlat
    this.setupIntersectionObserver();

    // URL'den arama parametrelerini al
    this.route.queryParams.subscribe(params => {
      this.searchTerm = params['q'] || '';
      this.sortBy = params['sort'] || '';
      this.selectedStatuses = params['status'] ? params['status'].split(',') : [];
      this.selectedFormats = params['format'] ? params['format'].split(',') : [];
      this.selectedGenres = params['genres'] ? params['genres'].split(',') : [];
      
      this.searchQuery.set(this.searchTerm);
      this.performSearch();
    });

    // Başlangıç araması
    this.searchAnime();
  }

  ngOnDestroy(): void {
    // Tüm subscription'ları temizle
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Observer'ı temizle
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !this.isLoading && this.pageInfo().hasNextPage) {
            this.loadMoreResults();
          }
        },
        { threshold: 0.1 }
      );

      // Bir sonraki tick'te element hazır olduğunda observer'ı bağla
      setTimeout(() => {
        if (this.loadingTrigger) {
          this.observer?.observe(this.loadingTrigger.nativeElement);
        }
      });
    }
  }

  private resetSearch(): void {
    this.currentPage = 1;
    this.animes.set([]);
    this.searchAnime();
  }

  private loadMoreResults(): void {
    if (this.isLoading || !this.pageInfo().hasNextPage) return;
    
    this.currentPage++;
    this.searchAnime(true);
  }

  // Filtre Yönetimi

  isStatusSelected(status: string): boolean {
    return this.selectedStatuses.includes(status);
  }

  isFormatSelected(format: string): boolean {
    return this.selectedFormats.includes(format);
  }

  isGenreSelected(genre: string): boolean {
    const currentGenres = this.genresControl.value || [];
    return currentGenres.includes(genre);
  }

  toggleStatus(status: string): void {
    const index = this.selectedStatuses.indexOf(status);
    if (index > -1) {
      this.selectedStatuses.splice(index, 1);
    } else {
      this.selectedStatuses.push(status);
    }
    this.updateUrlAndSearch();
  }

  toggleFormat(format: string): void {
    const index = this.selectedFormats.indexOf(format);
    if (index > -1) {
      this.selectedFormats.splice(index, 1);
    } else {
      this.selectedFormats.push(format);
    }
    this.updateUrlAndSearch();
  }

  onGenreChange(event: Event, genre: string): void {
    const checkbox = event.target as HTMLInputElement;
    const currentGenres = this.genresControl.value || [];
    
    if (checkbox.checked) {
      this.genresControl.setValue([...currentGenres, genre]);
    } else {
      this.genresControl.setValue(currentGenres.filter(g => g !== genre));
    }
    
    // Otomatik arama yap
    this.resetSearch();
  }

  getSelectedFiltersCount(): number {
    return this.selectedStatuses.length + this.selectedFormats.length + this.selectedGenres.length;
  }

  getSelectedFiltersText(): string {
    const count = this.getSelectedFiltersCount();
    return count > 0 ? `${count} filtre aktif` : 'Filtreler';
  }

  onSearchChange(): void {
    this.searchQuery.set(this.searchTerm);
    this.updateUrlAndSearch();
  }

  onSortChange(): void {
    this.updateUrlAndSearch();
  }

  clearFilters(): void {
    this.selectedStatuses = [];
    this.selectedFormats = [];
    this.selectedGenres = [];
    this.sortBy = '';
    
    // Form kontrollerini temizle
    this.formatControl.setValue(null);
    this.statusControl.setValue(null);
    this.genresControl.setValue([]);
    this.sortControl.setValue('POPULARITY_DESC');
    this.yearStartControl.setValue(null);
    this.yearEndControl.setValue(null);
    
    // Dropdown'u kapat
    this.showFiltersDropdown = false;
    
    this.resetSearch();
  }

  private updateUrlAndSearch(): void {
    const queryParams: any = {};
    
    if (this.searchTerm) {
      queryParams.q = this.searchTerm;
    }
    
    if (this.selectedStatuses.length > 0) {
      queryParams.status = this.selectedStatuses.join(',');
    }
    
    if (this.selectedFormats.length > 0) {
      queryParams.format = this.selectedFormats.join(',');
    }
    
    if (this.selectedGenres.length > 0) {
      queryParams.genres = this.selectedGenres.join(',');
    }
    
    if (this.sortBy) {
      queryParams.sort = this.sortBy;
    }

    this.router.navigate([], { queryParams, replaceUrl: true });
    this.performSearch();
  }

  private performSearch(page: number = 1): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.loading.set(true);

    const filters: SearchFilters = {
      search: this.searchControl.value || undefined,
      format: this.formatControl.value || undefined,
      status: this.statusControl.value || undefined,
      genres: this.genresControl.value?.length ? this.genresControl.value : undefined,
      sort: this.sortControl.value ? [this.sortControl.value] : ['POPULARITY_DESC']
    };

    this.anilistService.searchAnime(filters, page).pipe(
      finalize(() => {
        this.isLoading = false;
        this.loading.set(false);
      })
    ).subscribe({
      next: (result: any) => {
        if (page === 1) {
          this.animes.set(result.media || []);
        } else {
          const currentAnimes = this.animes();
          this.animes.set([...currentAnimes, ...(result.media || [])]);
        }

        this.pageInfo.set({
          total: result.pageInfo?.total || 0,
          currentPage: result.pageInfo?.currentPage || 1,
          lastPage: result.pageInfo?.lastPage || 1,
          hasNextPage: result.pageInfo?.hasNextPage || false
        });
      },
      error: (error: any) => {
        console.error('Arama hatası:', error);
        this.animes.set([]);
        this.pageInfo.set({
          total: 0,
          currentPage: 1,
          lastPage: 1,
          hasNextPage: false
        });
      }
    });
  }

  getPageNumbers(): (number | string)[] {
    const current = this.pageInfo().currentPage;
    const last = this.pageInfo().lastPage;
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(last - 1, current + delta); i++) {
      range.push(i);
    }

    if (current - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (current + delta < last - 1) {
      rangeWithDots.push('...', last);
    } else if (last > 1) {
      rangeWithDots.push(last);
    }

    return rangeWithDots.filter((item, index, array) => array.indexOf(item) === index);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.pageInfo().lastPage || page === this.pageInfo().currentPage) {
      return;
    }

    this.currentPage = page;
    this.animes.set([]);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    this.performSearch(page);
  }

  searchAnime(append: boolean = false): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.loading.set(true);

    const filters: SearchFilters = {
      search: this.searchControl.value || undefined,
      format: this.formatControl.value || undefined,
      status: this.statusControl.value || undefined,
      genres: this.genresControl.value?.length ? this.genresControl.value : undefined,
      sort: this.sortControl.value ? [this.sortControl.value] : ['POPULARITY_DESC']
    };

    this.anilistService.searchAnime(filters, this.currentPage).pipe(
      finalize(() => {
        this.isLoading = false;
        this.loading.set(false);
      })
    ).subscribe({
      next: (result: any) => {
        if (append) {
          const currentAnimes = this.animes();
          this.animes.set([...currentAnimes, ...(result.media || [])]);
        } else {
          this.animes.set(result.media || []);
        }

        this.pageInfo.set({
          total: result.pageInfo?.total || 0,
          currentPage: result.pageInfo?.currentPage || 1,
          lastPage: result.pageInfo?.lastPage || 1,
          hasNextPage: result.pageInfo?.hasNextPage || false
        });
      },
      error: (error: any) => {
        console.error('Arama hatası:', error);
        if (!append) {
          this.animes.set([]);
          this.pageInfo.set({
            total: 0,
            currentPage: 1,
            lastPage: 1,
            hasNextPage: false
          });
        }
      }
    });
  }
} 