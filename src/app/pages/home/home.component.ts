import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AnilistService } from '../../core/services/anilist.service';
import { Anime } from '../../core/models/anime.model';
import { AnimeCardComponent } from '../../shared/components/anime-card/anime-card.component';
import { AdsenseComponent } from '../../shared/components/adsense/adsense.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, AnimeCardComponent, AdsenseComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  private anilistService = inject(AnilistService);
  
  seasonAnime: Anime[] = [];
  trendingAnime: Anime[] = [];
  popularAnime: Anime[] = [];
  loadingSeason = true;
  loadingTrending = true;
  loadingPopular = true;
  currentSeasonName = '';
  currentYear = new Date().getFullYear();

  ngOnInit(): void {
    this.currentSeasonName = this.anilistService.getCurrentSeasonName();
    this.loadSeasonAnime();
    this.loadTrendingAnime();
    this.loadPopularAnime();
  }

  getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    
    if (month >= 3 && month <= 5) {
      return 'SPRING';
    } else if (month >= 6 && month <= 8) {
      return 'SUMMER';
    } else if (month >= 9 && month <= 11) {
      return 'FALL';
    } else {
      return 'WINTER';
    }
  }

  private loadSeasonAnime(): void {
    this.anilistService.getCurrentSeasonAnime(1, 6).subscribe({
      next: (result) => {
        this.seasonAnime = result.media;
        this.loadingSeason = false;
      },
      error: (error) => {
        console.error('Sezon animeleri yüklenemedi:', error);
        this.loadingSeason = false;
      }
    });
  }

  private loadTrendingAnime(): void {
    this.anilistService.getTrendingAnime(1, 6).subscribe({
      next: (result) => {
        this.trendingAnime = result.media;
        this.loadingTrending = false;
      },
      error: (error) => {
        console.error('Trend animeler yüklenemedi:', error);
        this.loadingTrending = false;
      }
    });
  }

  private loadPopularAnime(): void {
    this.anilistService.getPopularAnime(1, 6).subscribe({
      next: (result) => {
        this.popularAnime = result.media;
        this.loadingPopular = false;
      },
      error: (error) => {
        console.error('Popüler animeler yüklenemedi:', error);
        this.loadingPopular = false;
      }
    });
  }
} 