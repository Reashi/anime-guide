import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal, computed, HostListener, ElementRef, ViewChild, PLATFORM_ID, Inject } from '@angular/core';
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
export class SeasonsComponent implements OnInit, AfterViewInit, OnDestroy {
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
  displayedAnimes = signal<Anime[]>([]);
  loading = signal(false);
  loadingMore = signal(false);
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
  
  // Infinite scroll properties
  private itemsPerPage = 20;
  private currentDisplayedCount = 0;

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
      sort: this.sortControl
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative')) {
      this.closeAllDropdowns();
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
    // loadSeasonAnimes() artık FormControl subscription tarafından çağrılacak
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
      this.genresControl.value?.length
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
    return count;
  }

  isGenreSelected(genre: string): boolean {
    const genres = this.genresControl.value || [];
    return genres.includes(genre);
  }

  onGenreChange(event: Event, genre: string): void {
    event.stopPropagation(); // Event'in yukarı çıkmasını engelle
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
    // loadSeasonAnimes() artık FormControl subscription tarafından çağrılacak
  }

  onFormatChange(event: Event): void {
    event.stopPropagation();
    // loadSeasonAnimes() artık FormControl subscription tarafından çağrılacak
  }

  onStatusChange(event: Event): void {
    event.stopPropagation();
    // loadSeasonAnimes() artık FormControl subscription tarafından çağrılacak
  }



  clearFilters(): void {
    this.formatControl.setValue(null);
    this.statusControl.setValue(null);
    this.genresControl.setValue([]);
    this.sortControl.setValue('POPULARITY_DESC');
    
    // Dropdown'u kapat
    this.showFiltersDropdown = false;
    
    // loadSeasonAnimes() artık FormControl subscription tarafından çağrılacak
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

    // Format değişikliklerini dinle
    const formatSubscription = this.formatControl.valueChanges.subscribe(() => {
      this.loadSeasonAnimes();
    });

    // Status değişikliklerini dinle
    const statusSubscription = this.statusControl.valueChanges.subscribe(() => {
      this.loadSeasonAnimes();
    });

    // Sort değişikliklerini dinle
    const sortSubscription = this.sortControl.valueChanges.subscribe(() => {
      this.loadSeasonAnimes();
    });

    // Genres değişikliklerini dinle
    const genresSubscription = this.genresControl.valueChanges.subscribe(() => {
      this.loadSeasonAnimes();
    });

    // Form değişikliklerini dinle
    this.subscriptions.push(
      searchSubscription,
      formatSubscription,
      statusSubscription,
      sortSubscription,
      genresSubscription
    );
  }

  ngAfterViewInit(): void {
    // View tamamen yüklendikten sonra intersection observer'ı başlat
    this.setupInfiniteScroll();
  }

  private setupInfiniteScroll(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Observer'ı daha geç setup et, view init'ten sonra
      setTimeout(() => {
        this.initializeObserver();
      }, 1000);
    }
  }

  private initializeObserver(): void {
    // IntersectionObserver sadece browser'da mevcuttur
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (this.loadingTrigger && this.loadingTrigger.nativeElement) {
      // Eğer zaten observer varsa disconnect et
      if (this.observer) {
        this.observer.disconnect();
      }
      
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting && this.hasMoreToLoad() && !this.loadingMore()) {
              console.log('Loading more animes...', {
                currentDisplayed: this.currentDisplayedCount,
                totalAnimes: this.animes().length,
                hasMore: this.hasMoreToLoad()
              });
              this.loadMoreAnimes();
            }
          });
        },
        { 
          threshold: 0.1,
          rootMargin: '50px'
        }
      );
      this.observer.observe(this.loadingTrigger.nativeElement);
    } else {
      setTimeout(() => this.initializeObserver(), 500);
    }
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

  // Infinite scroll methods
  hasMoreToLoad(): boolean {
    return this.currentDisplayedCount < this.animes().length;
  }

  private loadMoreAnimes(): void {
    if (this.loadingMore() || !this.hasMoreToLoad()) return;
    
    this.loadingMore.set(true);
    
    setTimeout(() => {
      const nextBatch = this.animes().slice(
        this.currentDisplayedCount, 
        this.currentDisplayedCount + this.itemsPerPage
      );
      
      this.displayedAnimes.update(current => [...current, ...nextBatch]);
      this.currentDisplayedCount += nextBatch.length;
      this.loadingMore.set(false);
    }, 500); // Simulated loading delay
  }

  private resetDisplayedAnimes(): void {
    this.currentDisplayedCount = 0;
    const initialBatch = this.animes().slice(0, this.itemsPerPage);
    this.displayedAnimes.set(initialBatch);
    this.currentDisplayedCount = initialBatch.length;
    
    // Observer'ı yeniden başlat (sadece browser'da)
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initializeObserver();
      }, 100);
    }
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
    this.resetDisplayedAnimes();
    this.pageInfo.set({
      total: filteredAnimes.length,
      currentPage: 1,
      lastPage: 1,
      hasNextPage: false
    });
  }

  private loadSeasonAnimes(): void {
    this.loading.set(true);
    
    // Tüm sayfalardaki anime'leri toplamak için
    this.loadAllSeasonPages();
  }

  private async loadAllSeasonPages(): Promise<void> {
    try {
      let allAnimes: Anime[] = [];
      let currentPage = 1;
      let hasNextPage = true;
      
      while (hasNextPage && currentPage <= 20) { // Maksimum 20 sayfa (1000 anime)
        const response = await this.anilistService.getSeasonAnimes(
          this.currentSeason,
          this.selectedYear,
          currentPage,
          50 // AniList API maksimum limit
        ).toPromise();
        
        if (response && response.media) {
          allAnimes = [...allAnimes, ...response.media];
          hasNextPage = response.pageInfo?.hasNextPage || false;
        } else {
          hasNextPage = false;
        }
        
        currentPage++;
      }
      
      // Client-side filtreleme uygula
      let filteredAnimes = allAnimes;
      
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
      
      console.log(`After filtering: ${filteredAnimes.length} animes`);
      
      // Orijinal animeleri kaydet
      this.allAnimes = filteredAnimes;
      
      // Arama varsa filtrele, yoksa tümünü göster
      if (this.searchQuery().trim()) {
        this.filterAnimes();
      } else {
        this.animes.set(filteredAnimes);
        this.resetDisplayedAnimes();
        this.pageInfo.set({
          total: filteredAnimes.length,
          currentPage: 1,
          lastPage: 1,
          hasNextPage: false
        });
      }
      
      this.loading.set(false);
    } catch (error) {
      console.error('Error loading seasonal anime:', error);
      this.loading.set(false);
    }
  }
} 