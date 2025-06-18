import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AnilistService, SearchFilters } from '../../core/services/anilist.service';
import { Anime } from '../../core/models/anime.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { AdsenseComponent } from '../../shared/components/adsense/adsense.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule, AnimeCardComponent, AdsenseComponent],
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.css']
})
export class SearchComponent implements OnInit {
  private anilistService = inject(AnilistService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // Signals
  animes = signal<Anime[]>([]);
  loading = signal(false);
  pageInfo = signal({
    currentPage: 1,
    lastPage: 1,
    hasNextPage: false,
    total: 0
  });
  searchQuery = signal('');
  totalResults = computed(() => this.pageInfo().total);

  // Form değişkenleri
  searchTerm = '';
  sortBy = '';
  status = '';
  format = '';
  selectedGenres: string[] = [];

  // Seçenekler
  sortOptions = this.anilistService.getSortOptions();
  statusOptions = this.anilistService.getStatusOptions();
  formatOptions = this.anilistService.getFormatOptions();
  genreOptions = this.anilistService.getGenreOptions();

  ngOnInit() {
    // URL'den arama parametrelerini al
    this.route.queryParams.subscribe(params => {
      this.searchTerm = params['q'] || '';
      this.sortBy = params['sort'] || '';
      this.status = params['status'] || '';
      this.format = params['format'] || '';
      this.selectedGenres = params['genres'] ? params['genres'].split(',') : [];
      
      this.searchQuery.set(this.searchTerm);
      this.performSearch();
    });
  }

  onSearchChange() {
    this.updateUrlAndSearch();
  }

  onSortChange() {
    this.updateUrlAndSearch();
  }

  onFilterChange() {
    this.updateUrlAndSearch();
  }

  onGenreChange(event: Event, genre: string) {
    const checkbox = event.target as HTMLInputElement;
    if (checkbox.checked) {
      this.selectedGenres = [...this.selectedGenres, genre];
    } else {
      this.selectedGenres = this.selectedGenres.filter(g => g !== genre);
    }
    this.updateUrlAndSearch();
  }

  clearFilters() {
    this.searchTerm = '';
    this.sortBy = '';
    this.status = '';
    this.format = '';
    this.selectedGenres = [];
    this.updateUrlAndSearch();
  }

  private updateUrlAndSearch() {
    const queryParams: any = {};
    
    if (this.searchTerm) queryParams.q = this.searchTerm;
    if (this.sortBy) queryParams.sort = this.sortBy;
    if (this.status) queryParams.status = this.status;
    if (this.format) queryParams.format = this.format;
    if (this.selectedGenres.length > 0) queryParams.genres = this.selectedGenres.join(',');

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'replace'
    });
  }

  private performSearch(page: number = 1) {
    this.loading.set(true);
    this.searchQuery.set(this.searchTerm);

    const filters: SearchFilters = {
      search: this.searchTerm || undefined,
      genres: this.selectedGenres.length > 0 ? this.selectedGenres : undefined,
      status: this.status || undefined,
      format: this.format || undefined,
      sort: this.sortBy ? [this.sortBy] : undefined
    };

    this.anilistService.searchAnime(filters, page, 20).subscribe({
      next: (response) => {
        this.animes.set(response.media);
        this.pageInfo.set(response.pageInfo);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Arama hatası:', error);
        this.loading.set(false);
      }
    });
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.pageInfo().lastPage) {
      this.performSearch(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): number[] {
    const current = this.pageInfo().currentPage;
    const last = this.pageInfo().lastPage;
    const pages: number[] = [];

    if (last <= 7) {
      for (let i = 1; i <= last; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1, last);
      } else if (current >= last - 3) {
        pages.push(1, -1);
        for (let i = last - 4; i <= last; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1, -1);
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push(-1, last);
      }
    }

    return pages;
  }
} 