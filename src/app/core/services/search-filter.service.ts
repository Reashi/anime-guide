import { Injectable, signal, computed } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface SearchFormControls {
  searchControl: FormControl<string | null>;
  genresControl: FormControl<string[] | null>;
  formatControl: FormControl<string | null>;
  statusControl: FormControl<string | null>;
  sortControl: FormControl<string | null>;
  yearStartControl?: FormControl<number | null>;
  yearEndControl?: FormControl<number | null>;
}

export interface FilterOptions {
  includeYearFilters?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SearchFilterService {
  private fb = new FormBuilder();

  // Seçenekler
  sortOptions = [
    { value: 'POPULARITY_DESC', label: 'Popülerlik (Azalan)' },
    { value: 'POPULARITY', label: 'Popülerlik (Artan)' },
    { value: 'SCORE_DESC', label: 'Puan (Azalan)' },
    { value: 'SCORE', label: 'Puan (Artan)' },
    { value: 'TRENDING_DESC', label: 'Trend (Azalan)' },
    { value: 'TRENDING', label: 'Trend (Artan)' }
  ];

  statusOptions = [
    { value: 'FINISHED', label: 'Tamamlandı' },
    { value: 'RELEASING', label: 'Devam Ediyor' },
    { value: 'NOT_YET_RELEASED', label: 'Yayınlanmadı' },
    { value: 'CANCELLED', label: 'İptal Edildi' }
  ];

  formatOptions = [
    { value: 'TV', label: 'TV' },
    { value: 'MOVIE', label: 'Film' },
    { value: 'OVA', label: 'OVA' },
    { value: 'ONA', label: 'ONA' },
    { value: 'SPECIAL', label: 'Özel' }
  ];

  genreOptions = [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror',
    'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance',
    'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
  ];

  constructor() {}

  // Form kontrollerini oluştur
  createSearchForm(options: FilterOptions = {}): { form: FormGroup, controls: SearchFormControls } {
    const controls: SearchFormControls = {
      searchControl: new FormControl(''),
      genresControl: new FormControl<string[]>([]),
      formatControl: new FormControl<string | null>(null),
      statusControl: new FormControl<string | null>(null),
      sortControl: new FormControl('POPULARITY_DESC')
    };

    // Yıl filtrelerini dahil et (varsayılan olarak dahil)
    if (options.includeYearFilters !== false) {
      controls.yearStartControl = new FormControl<number | null>(null);
      controls.yearEndControl = new FormControl<number | null>(null);
    }

    const formGroup = this.fb.group(controls);

    return { form: formGroup, controls };
  }

  // Dropdown yönetimi için state
  createDropdownState() {
    return {
      showSortDropdown: signal(false),
      showFiltersDropdown: signal(false),
      
      toggleSortDropdown: function() {
        this.showSortDropdown.set(!this.showSortDropdown());
        this.showFiltersDropdown.set(false);
      },
      
      toggleFiltersDropdown: function() {
        this.showFiltersDropdown.set(!this.showFiltersDropdown());
        this.showSortDropdown.set(false);
      },
      
      closeAllDropdowns: function() {
        this.showSortDropdown.set(false);
        this.showFiltersDropdown.set(false);
      }
    };
  }

  // Filtre yardımcı fonksiyonları
  hasActiveFilters(controls: SearchFormControls): boolean {
    return !!(
      controls.formatControl.value ||
      controls.statusControl.value ||
      controls.genresControl.value?.length ||
      controls.yearStartControl?.value ||
      controls.yearEndControl?.value
    );
  }

  getActiveFiltersCount(controls: SearchFormControls): number {
    let count = 0;
    if (controls.formatControl.value) count++;
    if (controls.statusControl.value) count++;
    if (controls.genresControl.value?.length) count += controls.genresControl.value.length;
    if (controls.yearStartControl?.value) count++;
    if (controls.yearEndControl?.value) count++;
    return count;
  }

  getActiveFiltersText(controls: SearchFormControls): string {
    const activeCount = this.getActiveFiltersCount(controls);
    if (activeCount === 0) {
      return 'Filtreler';
    }
    return `Filtreler (${activeCount})`;
  }

  // Label getirme fonksiyonları
  getFormatLabel(format: string | null): string {
    if (!format) return 'Tümü';
    const option = this.formatOptions.find(opt => opt.value === format);
    return option?.label || format;
  }

  getStatusLabel(status: string | null): string {
    if (!status) return 'Tümü';
    const option = this.statusOptions.find(opt => opt.value === status);
    return option?.label || status;
  }

  getSortLabel(sort: string | null): string {
    if (!sort) return 'Popülerlik (Azalan)';
    const option = this.sortOptions.find(opt => opt.value === sort);
    return option?.label || sort;
  }

  // Yıl seçenekleri
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

  // Filtreleri temizle
  clearFilters(controls: SearchFormControls): void {
    controls.formatControl.setValue(null);
    controls.statusControl.setValue(null);
    controls.genresControl.setValue([]);
    controls.sortControl.setValue('POPULARITY_DESC');
    
    if (controls.yearStartControl) {
      controls.yearStartControl.setValue(null);
    }
    if (controls.yearEndControl) {
      controls.yearEndControl.setValue(null);
    }
  }

  // Genre işlemleri
  isGenreSelected(genre: string, controls: SearchFormControls): boolean {
    const genres = controls.genresControl.value || [];
    return genres.includes(genre);
  }

  toggleGenre(genre: string, controls: SearchFormControls): void {
    const currentGenres = controls.genresControl.value || [];
    
    if (currentGenres.includes(genre)) {
      const newGenres = currentGenres.filter(g => g !== genre);
      controls.genresControl.setValue(newGenres);
    } else {
      const newGenres = [...currentGenres, genre];
      controls.genresControl.setValue(newGenres);
    }
  }

  // Search değişikliklerini izleme
  watchSearchChanges(searchControl: FormControl<string>, callback: (searchTerm: string) => void): Observable<string> {
    return searchControl.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged()
    );
  }
} 