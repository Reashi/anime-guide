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
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
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
      
      // Yıl parametrelerini ayarla
      if (params['yearStart']) {
        this.yearStartControl.setValue(parseInt(params['yearStart']));
      }
      if (params['yearEnd']) {
        this.yearEndControl.setValue(parseInt(params['yearEnd']));
      }
      
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

    if (this.yearStartControl.value) {
      queryParams.yearStart = this.yearStartControl.value;
    }

    if (this.yearEndControl.value) {
      queryParams.yearEnd = this.yearEndControl.value;
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
      sort: this.sortControl.value ? [this.sortControl.value] : ['POPULARITY_DESC'],
      yearStart: this.yearStartControl.value || undefined,
      yearEnd: this.yearEndControl.value || undefined
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
      sort: this.sortControl.value ? [this.sortControl.value] : ['POPULARITY_DESC'],
      yearStart: this.yearStartControl.value || undefined,
      yearEnd: this.yearEndControl.value || undefined
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