import { Component, OnInit, OnDestroy, AfterViewInit, inject, signal, computed, HostListener, ElementRef, ViewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AnilistService, SearchFilters } from '../../core/services/anilist.service';
import { SearchFilterService, SearchFormControls } from '../../core/services/search-filter.service';
import { Anime } from '../../core/models/anime.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { FormBuilder, FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'app-seasons',
  standalone: true,
  imports: [CommonModule, FormsModule, AnimeCardComponent, ReactiveFormsModule],
  templateUrl: './seasons.component.html',
  styleUrls: ['./seasons.component.scss']
})
export class SeasonsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('loadingTrigger') loadingTrigger!: ElementRef;

  private anilistService = inject(AnilistService);
  private searchFilterService = inject(SearchFilterService);
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
  totalSeasonAnimes = signal<number>(0); // Gerçek total sayısı
  allSeasonAnimes = signal<Anime[]>([]); // Tüm animeler memory'de
  currentDisplayCount = signal<number>(20); // Şu anda gösterilen sayı

  // Search filter servisi ile yönetilecek
  searchForm!: FormGroup;
  searchControls!: SearchFormControls;
  dropdownState = this.searchFilterService.createDropdownState();
  
  // Form değişkenleri
  searchTerm = '';
  sortBy = '';
  selectedStatuses: string[] = [];
  selectedFormats: string[] = [];
  selectedGenres: string[] = [];
  showFilters = false;

  // Seçenekler
  sortOptions = this.searchFilterService.sortOptions;
  statusOptions = this.searchFilterService.statusOptions;
  formatOptions = this.searchFilterService.formatOptions;
  genreOptions = this.searchFilterService.genreOptions;

  currentPage = 1;
  currentYear = new Date().getFullYear();

  // Season-specific properties
  seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  currentSeason = 'WINTER';
  selectedYear = new Date().getFullYear();

  constructor() {
    // Form oluştur (yıl filtreleri olmadan)
    const formData = this.searchFilterService.createSearchForm({ includeYearFilters: false });
    this.searchForm = formData.form;
    this.searchControls = formData.controls;

    // Set current season based on current date
    this.setCurrentSeason();
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

  // Season-specific methods
  setCurrentSeason(): void {
    const month = new Date().getMonth();
    if (month >= 0 && month <= 2) {
      this.currentSeason = 'WINTER';
    } else if (month >= 3 && month <= 5) {
      this.currentSeason = 'SPRING';
    } else if (month >= 6 && month <= 8) {
      this.currentSeason = 'SUMMER';
    } else {
      this.currentSeason = 'FALL';
    }
  }

  selectSeason(season: string): void {
    this.currentSeason = season;
    this.resetSearch();
  }

  selectYear(year: number): void {
    this.selectedYear = year;
    this.resetSearch();
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

  // Dropdown Yönetimi
  toggleSortDropdown(): void {
    this.dropdownState.toggleSortDropdown();
  }

  toggleFiltersDropdown(): void {
    this.dropdownState.toggleFiltersDropdown();
  }

  closeAllDropdowns(): void {
    this.dropdownState.closeAllDropdowns();
  }

  // Seçim Fonksiyonları
  selectSort(sort: string): void {
    this.searchControls.sortControl.setValue(sort);
    this.dropdownState.showSortDropdown.set(false);
  }

  // Label Getirme Fonksiyonları (Servisten)
  getFormatLabel(format: string | null): string {
    return this.searchFilterService.getFormatLabel(format);
  }

  getStatusLabel(status: string | null): string {
    return this.searchFilterService.getStatusLabel(status);
  }

  getSortLabel(sort: string | null): string {
    return this.searchFilterService.getSortLabel(sort);
  }

  getYearOptions(): number[] {
    return this.searchFilterService.getYearOptions();
  }

  // Aktif Filtre Kontrolü (Servisten)
  hasActiveFilters(): boolean {
    return this.searchFilterService.hasActiveFilters(this.searchControls);
  }

  // Aktif filtre metni
  getActiveFiltersText(): string {
    return this.searchFilterService.getActiveFiltersText(this.searchControls);
  }

  // Aktif filtre sayısı
  getActiveFiltersCount(): number {
    return this.searchFilterService.getActiveFiltersCount(this.searchControls);
  }

  // Total count display için
  getDisplayTotal(): number {
    return Math.max(this.animes().length, this.totalSeasonAnimes());
  }

  ngOnInit(): void {
    // Setup intersection observer for infinite scroll
    this.setupIntersectionObserver();
    
    // Arama kutusunun değişikliklerini izle
    const searchSubscription = this.searchControls.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe((searchTerm: string | null) => {
        this.resetSearch();
      });

    this.subscriptions.push(searchSubscription);

    // Format değişikliklerini izle
    const formatSubscription = this.searchControls.formatControl.valueChanges.subscribe(() => {
      this.resetSearch();
    });

    this.subscriptions.push(formatSubscription);

    // Status değişikliklerini izle
    const statusSubscription = this.searchControls.statusControl.valueChanges.subscribe(() => {
      this.resetSearch();
    });

    this.subscriptions.push(statusSubscription);

    // Sort değişikliklerini izle
    const sortSubscription = this.searchControls.sortControl.valueChanges.subscribe(() => {
      this.resetSearch();
    });

    this.subscriptions.push(sortSubscription);

    // URL'den arama parametrelerini al
    this.route.queryParams.subscribe(params => {
      if (params['season']) {
        this.currentSeason = params['season'];
      }
      if (params['year']) {
        this.selectedYear = parseInt(params['year']);
      }
      this.initializeSeasonData();
    });

    // İlk yükleme
    this.initializeSeasonData();
  }

  ngAfterViewInit(): void {
    // ViewChild hazır olduktan sonra intersection observer'ı başlat
    if (this.loadingTrigger && this.observer && isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        if (this.loadingTrigger && this.observer && this.pageInfo().hasNextPage) {
          this.observer.observe(this.loadingTrigger.nativeElement);
        }
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.observer && isPlatformBrowser(this.platformId)) {
      this.observer.disconnect();
    }
  }

  private setupIntersectionObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.isLoading && this.pageInfo().hasNextPage) {
          this.loadMoreResults();
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: '100px'
    });
  }

  private initializeSeasonData(): void {
    // Tek seferde tüm sezon animelerini yükle
    this.loadAllSeasonAnimes();
  }

  private resetSearch(): void {
    this.currentPage = 1;
    this.animes.set([]);
    this.totalSeasonAnimes.set(0);
    this.allSeasonAnimes.set([]);
    this.currentDisplayCount.set(20);
    this.initializeSeasonData();
  }

  private loadAllSeasonAnimes(): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.loading.set(true);

    const filters: SearchFilters = {
      search: this.searchControls.searchControl.value || undefined,
      season: this.currentSeason,
      year: this.selectedYear,
      sort: [this.searchControls.sortControl.value || 'POPULARITY_DESC'],
      format: this.searchControls.formatControl.value || undefined,
      status: this.searchControls.statusControl.value || undefined,
      genres: this.searchControls.genresControl.value && this.searchControls.genresControl.value.length > 0 
        ? this.searchControls.genresControl.value : undefined
    };

    // Tüm sayfaları çekerek birleştir
    this.loadAllPages(filters, []);
  }

  private loadAllPages(filters: SearchFilters, allAnimes: Anime[], page: number = 1): void {
    this.anilistService.searchAnime(filters, page, 50)
      .subscribe({
        next: (response) => {
          const newAnimes = response.media || [];
          const combinedAnimes = [...allAnimes, ...newAnimes];
          
          // Eğer daha fazla sayfa varsa, sonraki sayfayı çek
          if (response.pageInfo?.hasNextPage && newAnimes.length > 0) {
            this.loadAllPages(filters, combinedAnimes, page + 1);
          } else {
            // Tüm sayfalar yüklendi
            this.allSeasonAnimes.set(combinedAnimes);
            this.totalSeasonAnimes.set(combinedAnimes.length);
            
            // İlk 20 tanesini göster
            this.showFirstAnimes();

            this.updateUrlAndSearch();

            // Infinite scroll setup
            setTimeout(() => this.startInfiniteScroll(), 100);
            
            // Loading'i bitir
            this.isLoading = false;
            this.loading.set(false);
          }
        },
        error: (error) => {
          console.error('Error loading season animes page:', page, error);
          this.isLoading = false;
          this.loading.set(false);
        }
      });
  }

  private showFirstAnimes(): void {
    const allAnimes = this.allSeasonAnimes();
    const firstTwenty = allAnimes.slice(0, 20);
    this.animes.set(firstTwenty);
    this.currentDisplayCount.set(20);
    
    // PageInfo'yu güncelle
    this.pageInfo.set({
      total: allAnimes.length,
      currentPage: 1,
      lastPage: Math.ceil(allAnimes.length / 20),
      hasNextPage: allAnimes.length > 20
    });
  }

  private startInfiniteScroll(): void {
    if (this.loadingTrigger && this.observer && this.pageInfo().hasNextPage) {
      this.observer.disconnect();
      this.observer.observe(this.loadingTrigger.nativeElement);
    }
  }

  private loadMoreResults(): void {
    const allAnimes = this.allSeasonAnimes();
    const currentCount = this.currentDisplayCount();
    const newCount = Math.min(currentCount + 20, allAnimes.length);
    
    // Daha fazla anime göster
    this.animes.set(allAnimes.slice(0, newCount));
    this.currentDisplayCount.set(newCount);
    
    // PageInfo'yu güncelle
    this.pageInfo.update(info => ({
      ...info,
      hasNextPage: newCount < allAnimes.length,
      currentPage: Math.ceil(newCount / 20)
    }));
    
    // Observer'ı yeniden başlat
    if (this.pageInfo().hasNextPage) {
      setTimeout(() => this.startInfiniteScroll(), 100);
    }
  }

  isStatusSelected(status: string): boolean {
    return this.searchControls.statusControl.value === status;
  }

  isFormatSelected(format: string): boolean {
    return this.searchControls.formatControl.value === format;
  }

  isGenreSelected(genre: string): boolean {
    return this.searchControls.genresControl.value?.includes(genre) || false;
  }

  toggleStatus(status: string): void {
    const currentValue = this.searchControls.statusControl.value;
    if (currentValue === status) {
      this.searchControls.statusControl.setValue(null);
    } else {
      this.searchControls.statusControl.setValue(status);
    }
  }

  toggleFormat(format: string): void {
    const currentValue = this.searchControls.formatControl.value;
    if (currentValue === format) {
      this.searchControls.formatControl.setValue(null);
    } else {
      this.searchControls.formatControl.setValue(format);
    }
  }

  onGenreChange(event: Event, genre: string): void {
    const target = event.target as HTMLInputElement;
    const currentGenres = this.searchControls.genresControl.value || [];
    
    if (target.checked) {
      if (!currentGenres.includes(genre)) {
        this.searchControls.genresControl.setValue([...currentGenres, genre]);
      }
    } else {
      this.searchControls.genresControl.setValue(
        currentGenres.filter((g: string) => g !== genre)
      );
    }
  }

  getSelectedFiltersCount(): number {
    return this.getActiveFiltersCount();
  }

  getSelectedFiltersText(): string {
    return this.getActiveFiltersText();
  }

  onSearchChange(): void {
    this.resetSearch();
  }

  onSortChange(): void {
    this.resetSearch();
  }

  clearFilters(): void {
    this.searchControls.searchControl.setValue('');
    this.searchControls.genresControl.setValue([]);
    this.searchControls.formatControl.setValue(null);
    this.searchControls.statusControl.setValue(null);
    this.searchControls.sortControl.setValue('POPULARITY_DESC');
    
    this.resetSearch();
  }

  private updateUrlAndSearch(): void {
    const queryParams: any = {
      season: this.currentSeason,
      year: this.selectedYear
    };

    if (this.searchControls.searchControl.value) {
      queryParams.search = this.searchControls.searchControl.value;
    }
    if (this.searchControls.sortControl.value !== 'POPULARITY_DESC') {
      queryParams.sort = this.searchControls.sortControl.value;
    }
    if (this.searchControls.formatControl.value) {
      queryParams.format = this.searchControls.formatControl.value;
    }
    if (this.searchControls.statusControl.value) {
      queryParams.status = this.searchControls.statusControl.value;
    }
    if (this.searchControls.genresControl.value && this.searchControls.genresControl.value.length > 0) {
      queryParams.genres = this.searchControls.genresControl.value.join(',');
    }


    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }







  searchAnime(append: boolean = false): void {
    this.resetSearch();
  }
} 