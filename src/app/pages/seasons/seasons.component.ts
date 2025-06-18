import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormControl, FormGroup, FormBuilder } from '@angular/forms';
import { AnilistService, SearchFilters } from '../../core/services/anilist.service';
import { Anime } from '../../core/models/anime.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { Subject, Subscription } from 'rxjs';
import { finalize, debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-seasons',
  standalone: true,
  imports: [CommonModule, AnimeCardComponent, FormsModule, ReactiveFormsModule],
  templateUrl: './seasons.component.html',
  styleUrls: ['./seasons.component.scss']
})
export class SeasonsComponent implements OnInit, OnDestroy {
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
  totalResults = computed(() => this.animes().length);

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

  // Seasons specific
  seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  currentSeason = 'WINTER';
  selectedYear = new Date().getFullYear();

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    
    // Filtre dropdown'u dışına tıklanmışsa kapat
    if (this.showFiltersDropdown && !target.closest('.filters-dropdown') && !target.closest('[data-dropdown="filters"]')) {
      this.showFiltersDropdown = false;
    }
    
    // Sıralama dropdown'u dışına tıklanmışsa kapat
    if (this.showSortDropdown && !target.closest('.sort-dropdown') && !target.closest('[data-dropdown="sort"]')) {
      this.showSortDropdown = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.closeAllDropdowns();
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
    this.loadSeasonAnimes();
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

  getYearOptions(): number[] {
    const currentYear = new Date().getFullYear();
    const startYear = 1960;
    const years: number[] = [];
    
    // Gelecek yıl da dahil olmak üzere 
    for (let year = currentYear + 1; year >= startYear; year--) {
      years.push(year);
    }
    
    return years;
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

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.formatControl.value) count++;
    if (this.statusControl.value) count++;
    if (this.genresControl.value && this.genresControl.value.length > 0) count++;
    if (this.yearStartControl.value) count++;
    if (this.yearEndControl.value) count++;
    return count;
  }

  isGenreSelected(genre: string): boolean {
    const genres = this.genresControl.value || [];
    return genres.includes(genre);
  }

  onGenreChange(event: Event, genre: string): void {
    const checkbox = event.target as HTMLInputElement;
    const currentGenres = this.genresControl.value || [];
    
    if (checkbox.checked) {
      // Genre'yi ekle
      if (!currentGenres.includes(genre)) {
        const newGenres = [...currentGenres, genre];
        this.genresControl.setValue(newGenres);
      }
    } else {
      // Genre'yi çıkar
      const newGenres = currentGenres.filter(g => g !== genre);
      this.genresControl.setValue(newGenres);
    }
    
    this.loadSeasonAnimes();
  }

  clearFilters(): void {
    this.formatControl.setValue(null);
    this.statusControl.setValue(null);
    this.genresControl.setValue([]);
    this.yearStartControl.setValue(null);
    this.yearEndControl.setValue(null);
    this.sortControl.setValue('POPULARITY_DESC');
    this.loadSeasonAnimes();
  }

  ngOnInit(): void {
    this.currentSeason = this.getCurrentSeason();
    this.loadSeasonAnimes();

    // Arama kontrolünü dinle
    const searchSubscription = this.searchControl.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.searchQuery.set(searchTerm || '');
        this.filterAnimes();
      });

    // Form değişikliklerini dinle
    this.subscriptions.push(
      searchSubscription,
      this.formatControl.valueChanges.subscribe(() => this.loadSeasonAnimes()),
      this.statusControl.valueChanges.subscribe(() => this.loadSeasonAnimes()),
      this.yearStartControl.valueChanges.subscribe(() => this.loadSeasonAnimes()),
      this.yearEndControl.valueChanges.subscribe(() => this.loadSeasonAnimes())
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.observer && isPlatformBrowser(this.platformId)) {
      this.observer.disconnect();
    }
  }

  getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 12 || month <= 2) return 'WINTER';
    if (month >= 3 && month <= 5) return 'SPRING';
    if (month >= 6 && month <= 8) return 'SUMMER';
    return 'FALL';
  }

  getSeasonLabel(season: string): string {
    const labels: { [key: string]: string } = {
      'WINTER': 'Kış',
      'SPRING': 'İlkbahar',
      'SUMMER': 'Yaz',
      'FALL': 'Sonbahar'
    };
    return labels[season] || season;
  }

  selectSeason(season: string): void {
    this.currentSeason = season;
    this.loadSeasonAnimes();
  }

  selectYear(year: number): void {
    this.selectedYear = year;
    this.loadSeasonAnimes();
  }

  trackByAnimeId(index: number, anime: Anime): number {
    return anime.id;
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchQuery.set('');
    this.filterAnimes();
  }

  private allAnimes: Anime[] = []; // Tüm animeler (filtrelenmemiş)
  private isSearching = false;

  private filterAnimes(): void {
    if (!this.searchQuery().trim()) {
      // Arama yoksa tüm animeleri göster
      this.animes.set(this.allAnimes);
      this.isSearching = false;
      return;
    }

    this.isSearching = true;
    const searchTerm = this.searchQuery().toLowerCase().trim();
    
    const filteredAnimes = this.allAnimes.filter(anime => {
      // Anime başlığında arama yap
      const titleMatch = anime.title.toLowerCase().includes(searchTerm) ||
                        anime.englishTitle?.toLowerCase().includes(searchTerm) ||
                        anime.nativeTitle?.toLowerCase().includes(searchTerm);
      
      // Genre'larda arama yap
      const genreMatch = anime.genres.some(genre => 
        genre.toLowerCase().includes(searchTerm)
      );
      
      // Studio'larda arama yap
      const studioMatch = anime.studios.some(studio => 
        studio.toLowerCase().includes(searchTerm)
      );
      
      return titleMatch || genreMatch || studioMatch;
    });

    this.animes.set(filteredAnimes);
    this.pageInfo.set({
      total: filteredAnimes.length,
      currentPage: 1,
      lastPage: 1,
      hasNextPage: false
    });
  }

  private loadSeasonAnimes(): void {
    this.loading.set(true);
    
    this.anilistService.getSeasonAnimes(
      this.currentSeason,
      this.selectedYear,
      1,
      20
    ).subscribe({
      next: (response: any) => {
        let filteredAnimes = response.media || [];
        
        // Client-side filtreleme uygula
        if (this.formatControl.value) {
          filteredAnimes = filteredAnimes.filter((anime: Anime) => anime.format === this.formatControl.value);
        }
        
        if (this.statusControl.value) {
          filteredAnimes = filteredAnimes.filter((anime: Anime) => anime.status === this.statusControl.value);
        }
        
        if (this.genresControl.value && this.genresControl.value.length > 0) {
          filteredAnimes = filteredAnimes.filter((anime: Anime) => 
            this.genresControl.value!.some(genre => anime.genres.includes(genre))
          );
        }
        
        if (this.yearStartControl.value) {
          filteredAnimes = filteredAnimes.filter((anime: Anime) => 
            anime.startDate?.year && anime.startDate.year >= this.yearStartControl.value!
          );
        }
        
        if (this.yearEndControl.value) {
          filteredAnimes = filteredAnimes.filter((anime: Anime) => 
            anime.startDate?.year && anime.startDate.year <= this.yearEndControl.value!
          );
        }
        
        // Sıralama uygula
        const sortValue = this.sortControl.value || 'POPULARITY_DESC';
        if (sortValue === 'SCORE_DESC') {
          filteredAnimes.sort((a: Anime, b: Anime) => (b.averageScore || 0) - (a.averageScore || 0));
        } else if (sortValue === 'SCORE') {
          filteredAnimes.sort((a: Anime, b: Anime) => (a.averageScore || 0) - (b.averageScore || 0));
        } else if (sortValue === 'POPULARITY') {
          filteredAnimes.sort((a: Anime, b: Anime) => (a.popularity || 0) - (b.popularity || 0));
        } else {
          // POPULARITY_DESC (default)
          filteredAnimes.sort((a: Anime, b: Anime) => (b.popularity || 0) - (a.popularity || 0));
        }
        
        // Orijinal animeleri kaydet
        this.allAnimes = filteredAnimes;
        
        // Arama varsa filtrele, yoksa tümünü göster
        if (this.searchQuery().trim()) {
          this.filterAnimes();
        } else {
          this.animes.set(filteredAnimes);
          this.pageInfo.set({
            total: filteredAnimes.length,
            currentPage: 1,
            lastPage: 1,
            hasNextPage: false
          });
        }
        
        this.loading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading seasonal anime:', error);
        this.loading.set(false);
      }
    });
  }
} 