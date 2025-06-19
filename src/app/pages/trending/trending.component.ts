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
  selector: 'app-trending',
  standalone: true,
  imports: [CommonModule, FormsModule, AnimeCardComponent, ReactiveFormsModule],
  templateUrl: './trending.component.html',
  styleUrls: ['./trending.component.scss']
})
export class TrendingComponent implements OnInit, OnDestroy, AfterViewInit {
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
  totalTrendingAnimes = signal<number>(0); // Gerçek total sayısı
  allTrendingAnimes = signal<Anime[]>([]); // Tüm animeler memory'de
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

  // Trending specific - Time periods
  timePeriods = [
    { value: 'CURRENT_WEEK', label: 'Bu Hafta' },
    { value: 'CURRENT_MONTH', label: 'Bu Ay' },
    { value: 'LAST_3_MONTHS', label: 'Son 3 Ay' },
    { value: 'LAST_6_MONTHS', label: 'Son 6 Ay' },
    { value: 'CURRENT_YEAR', label: 'Bu Yıl' }
  ];
  selectedTimePeriod = 'CURRENT_WEEK';

  constructor() {
    // Form oluştur (yıl filtreleri olmadan)
    const formData = this.searchFilterService.createSearchForm({ includeYearFilters: false });
    this.searchForm = formData.form;
    this.searchControls = formData.controls;
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

  // Time Period Selection
  selectTimePeriod(timePeriod: string): void {
    this.selectedTimePeriod = timePeriod;
    this.resetSearch();
  }

  getTimePeriodLabel(timePeriod: string): string {
    const period = this.timePeriods.find(p => p.value === timePeriod);
    return period ? period.label : timePeriod;
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
    return Math.max(this.animes().length, this.totalTrendingAnimes());
  }

  ngOnInit(): void {
    // Setup intersection observer for infinite scroll
    this.setupIntersectionObserver();
    
    // Arama kutusunun değişikliklerini izle
    const searchSub = this.searchControls.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe((value) => {
      this.searchQuery.set(value || '');
      this.resetSearch();
    });

    this.subscriptions.push(searchSub);

    // Form değişikliklerini izle
    const formSub = this.searchForm.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.resetSearch();
    });

    this.subscriptions.push(formSub);

    // İlk yükleme
    this.initializeTrendingData();
  }

  ngAfterViewInit(): void {
    // ViewChild hazır olduktan sonra intersection observer'ı başlat
    setTimeout(() => {
      if (this.loadingTrigger) {
        this.startInfiniteScroll();
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.observer?.disconnect();
  }

  private setupIntersectionObserver(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !this.loading()) {
          this.loadMoreResults();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100px'
      }
    );
  }

  private initializeTrendingData(): void {
    this.loadAllTrendingAnimes();
  }

  private resetSearch(): void {
    this.animes.set([]);
    this.allTrendingAnimes.set([]);
    this.totalTrendingAnimes.set(0);
    this.currentDisplayCount.set(20);
    this.observer?.disconnect();
    this.loadAllTrendingAnimes();
  }

  private loadAllTrendingAnimes(): void {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.loading.set(true);

    const filters = this.buildSearchFilters();
    
    // Recursive olarak tüm sayfaları yükle
    this.loadAllPages(filters, [], 1);
  }

  private loadAllPages(filters: SearchFilters, allAnimes: Anime[], page: number = 1): void {
    this.anilistService.searchAnime(filters, page, 50).subscribe({
      next: (response) => {
        const newAnimes = response.media || [];
        const combinedAnimes = [...allAnimes, ...newAnimes];
        
        // Duplicate kontrolü
        const uniqueAnimes = combinedAnimes.filter((anime, index, self) => 
          index === self.findIndex(a => a.id === anime.id)
        );

        if (response.pageInfo?.hasNextPage && page < 20) { // Max 20 sayfa (1000 anime)
          // Rekursif olarak bir sonraki sayfayı yükle
          setTimeout(() => {
            this.loadAllPages(filters, uniqueAnimes, page + 1);
          }, 100); // Rate limiting için delay
        } else {
          // Tüm animeler yüklendi
          this.allTrendingAnimes.set(uniqueAnimes);
          this.totalTrendingAnimes.set(uniqueAnimes.length);
          
          // İlk 20 animeyi göster
          this.showFirstAnimes();
          
          this.isLoading = false;
          this.loading.set(false);

          // Infinite scroll'u başlat
          setTimeout(() => this.startInfiniteScroll(), 100);
        }
      },
      error: (error) => {
        console.error('Trend animeler yüklenemedi:', error);
        this.isLoading = false;
        this.loading.set(false);
      }
    });
  }

  private showFirstAnimes(): void {
    const allAnimes = this.allTrendingAnimes();
    if (allAnimes.length > 0) {
      const firstAnimes = allAnimes.slice(0, 20);
      this.animes.set(firstAnimes);
      this.currentDisplayCount.set(firstAnimes.length);
    }
  }

  private startInfiniteScroll(): void {
    if (this.loadingTrigger && this.observer) {
      this.observer.observe(this.loadingTrigger.nativeElement);
    }
  }

  private loadMoreResults(): void {
    const allAnimes = this.allTrendingAnimes();
    const currentAnimes = this.animes();
    const remainingCount = allAnimes.length - currentAnimes.length;
    
    if (remainingCount > 0) {
      const nextBatch = allAnimes.slice(currentAnimes.length, currentAnimes.length + 20);
      const updatedAnimes = [...currentAnimes, ...nextBatch];
      
      this.animes.set(updatedAnimes);
      this.currentDisplayCount.set(updatedAnimes.length);
      
      // Eğer tüm animeler gösterildi ise observer'ı durdur
      if (updatedAnimes.length >= allAnimes.length) {
        this.observer?.disconnect();
      }
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
      this.searchControls.genresControl.setValue([...currentGenres, genre]);
    } else {
      this.searchControls.genresControl.setValue(currentGenres.filter(g => g !== genre));
    }
  }

  getSelectedFiltersCount(): number {
    return this.searchFilterService.getActiveFiltersCount(this.searchControls);
  }

  getSelectedFiltersText(): string {
    return this.searchFilterService.getActiveFiltersText(this.searchControls);
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
    this.resetSearch();
  }

  private updateUrlAndSearch(): void {
    // URL parametrelerini güncelle (isteğe bağlı)
    this.resetSearch();
  }

  private buildSearchFilters(): SearchFilters {
    const search = this.searchControls.searchControl.value?.trim() || undefined;
    const genres = this.searchControls.genresControl.value?.length ? this.searchControls.genresControl.value : undefined;
    const format = this.searchControls.formatControl.value || undefined;
    const status = this.searchControls.statusControl.value || undefined;
    const sort = this.searchControls.sortControl.value ? [this.searchControls.sortControl.value] : ['TRENDING_DESC'];
    
    // Build year filter based on selected time period
    let yearStart: number | undefined;
    let yearEnd: number | undefined;
    
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    
    switch (this.selectedTimePeriod) {
      case 'CURRENT_WEEK':
        // Last week's date
        const weekAgo = new Date(currentDate);
        weekAgo.setDate(weekAgo.getDate() - 7);
        yearStart = weekAgo.getFullYear();
        break;
      case 'CURRENT_MONTH':
        // Current month
        yearStart = currentYear;
        break;
      case 'LAST_3_MONTHS':
        // Last 3 months
        const threeMonthsAgo = new Date(currentDate);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        yearStart = threeMonthsAgo.getFullYear();
        break;
      case 'LAST_6_MONTHS':
        // Last 6 months
        const sixMonthsAgo = new Date(currentDate);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        yearStart = sixMonthsAgo.getFullYear();
        break;
      case 'CURRENT_YEAR':
        // Current year
        yearStart = currentYear;
        yearEnd = currentYear;
        break;
    }

    return {
      search,
      genres,
      format,
      status,
      sort,
      yearStart,
      yearEnd
    };
  }

  trackByAnimeId(index: number, anime: Anime): number {
    return anime.id;
  }
} 