import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Anime } from '../../../core/models/anime.model';
import { UserListService } from '../../../core/services/user-list.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-anime-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './anime-card.component.html',
  styleUrls: ['./anime-card.component.scss']
})
export class AnimeCardComponent {
  @Input() anime!: Anime;
  
  private userListService = inject(UserListService);
  private authService = inject(AuthService);
  
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
  
  addToList(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    this.userListService.addToList(this.anime.id).subscribe({
      next: () => {
        // Show success message
    
      },
      error: (error) => {
        console.error('Liste ekleme hatası:', error);
      }
    });
  }
  
  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Implementation for favorite toggle
    
  }
  
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'RELEASING':
        return 'bg-green-600 text-white';
      case 'FINISHED':
        return 'bg-blue-600 text-white';
      case 'NOT_YET_RELEASED':
        return 'bg-yellow-600 text-white';
      case 'CANCELLED':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  }
  
  getStatusText(status: string): string {
    switch (status) {
      case 'RELEASING':
        return 'Yayında';
      case 'FINISHED':
        return 'Tamamlandı';
      case 'NOT_YET_RELEASED':
        return 'Yakında';
      case 'CANCELLED':
        return 'İptal';
      case 'HIATUS':
        return 'Ara';
      default:
        return status;
    }
  }
  
  getFormatText(format: string): string {
    switch (format) {
      case 'TV':
        return 'TV Serisi';
      case 'TV_SHORT':
        return 'Kısa Seri';
      case 'MOVIE':
        return 'Film';
      case 'SPECIAL':
        return 'Özel';
      case 'OVA':
        return 'OVA';
      case 'ONA':
        return 'ONA';
      case 'MUSIC':
        return 'Müzik';
      default:
        return format;
    }
  }

  getFormattedStartDate(): string {
    // Debug için console'da kontrol edelim
    
    
    // Önce startDate'i kontrol et
    if (this.anime.startDate) {
      const { year, month, day } = this.anime.startDate;
      
      if (year) {
        // Sadece yıl varsa
        if (!month || !day) {
          return year.toString();
        }

        // Gün/Ay/Yıl formatında döndür
        const formattedDay = day.toString().padStart(2, '0');
        const formattedMonth = month.toString().padStart(2, '0');
        
        return `${formattedDay}/${formattedMonth}/${year}`;
      }
    }
    
    // startDate yoksa seasonYear'ı kullan
    if (this.anime.seasonYear) {
      return this.anime.seasonYear.toString();
    }
    
    
    return '';
  }
} 