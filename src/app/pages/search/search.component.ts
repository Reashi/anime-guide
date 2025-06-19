import { Component, OnInit, OnDestroy, inject, signal, computed, HostListener, ElementRef, ViewChild, PLATFORM_ID } from '@angular/core';
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
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, AnimeCardComponent, ReactiveFormsModule],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {
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
  totalResults = computed(() => this.pageInfo().total);

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

  constructor() {
    // Tarih filtresi ile form oluştur (search sayfası için)
    const formData = this.searchFilterService.createSearchForm({ includeYearFilters: true });
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

  ngOnInit(): void {
    // Arama kutusunun değişikliklerini izle
    const searchSubscription = this.searchControls.searchControl.valueChanges
      .pipe(
        debounceTime(500),
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

    // Yıl değişikliklerini izle
    if (this.searchControls.yearStartControl) {
      const yearStartSubscription = this.searchControls.yearStartControl.valueChanges.subscribe(() => {
        this.resetSearch();
      });
      this.subscriptions.push(yearStartSubscription);
    }

    if (this.searchControls.yearEndControl) {
      const yearEndSubscription = this.searchControls.yearEndControl.valueChanges.subscribe(() => {
        this.resetSearch();
      });
      this.subscriptions.push(yearEndSubscription);
    }

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
      if (params['yearStart'] && this.searchControls.yearStartControl) {
        this.searchControls.yearStartControl.setValue(parseInt(params['yearStart']));
      }
      if (params['yearEnd'] && this.searchControls.yearEndControl) {
        this.searchControls.yearEndControl.setValue(parseInt(params['yearEnd']));
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
    return this.searchFilterService.isGenreSelected(genre, this.searchControls);
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
    const currentGenres = this.searchControls.genresControl.value || [];
    
    if (checkbox.checked) {
      this.searchControls.genresControl.setValue([...currentGenres, genre]);
    } else {
      this.searchControls.genresControl.setValue(currentGenres.filter(g => g !== genre));
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
    this.searchFilterService.clearFilters(this.searchControls);
    
    // Dropdown'u kapat
    this.dropdownState.showFiltersDropdown.set(false);
    
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

    if (this.searchControls.yearStartControl?.value) {
      queryParams.yearStart = this.searchControls.yearStartControl.value;
    }

    if (this.searchControls.yearEndControl?.value) {
      queryParams.yearEnd = this.searchControls.yearEndControl.value;
    }

    this.router.navigate([], { queryParams, replaceUrl: true });
    this.performSearch();
  }

  private performSearch(page: number = 1): void {
    if (this.isLoading) return;

    this.isLoading = true;
    this.loading.set(true);

    const filters: SearchFilters = {
      search: this.searchControls.searchControl.value || undefined,
      format: this.searchControls.formatControl.value || undefined,
      status: this.searchControls.statusControl.value || undefined,
      genres: this.searchControls.genresControl.value?.length ? this.searchControls.genresControl.value : undefined,
      sort: this.searchControls.sortControl.value ? [this.searchControls.sortControl.value] : ['POPULARITY_DESC'],
      yearStart: this.searchControls.yearStartControl?.value || undefined,
      yearEnd: this.searchControls.yearEndControl?.value || undefined
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
      search: this.searchControls.searchControl.value || undefined,
      format: this.searchControls.formatControl.value || undefined,
      status: this.searchControls.statusControl.value || undefined,
      genres: this.searchControls.genresControl.value?.length ? this.searchControls.genresControl.value : undefined,
      sort: this.searchControls.sortControl.value ? [this.searchControls.sortControl.value] : ['POPULARITY_DESC'],
      yearStart: this.searchControls.yearStartControl?.value || undefined,
      yearEnd: this.searchControls.yearEndControl?.value || undefined
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