import { Component, Input, OnInit, AfterViewInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AdsenseService } from '../../../core/services/adsense.service';

@Component({
  selector: 'app-adsense',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="adsense-container" [ngClass]="containerClass">
      @if (shouldShowAd) {
        <div class="ad-placeholder bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
          <span>📢 Google AdSense</span>
          <br>
          <span class="text-xs">{{ adSlot }}</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .adsense-container {
      margin: 1rem 0;
    }
    
    .ad-placeholder {
      min-height: 90px;
      border: 1px dashed #d1d5db;
      transition: all 0.3s ease;
    }
    
    .ad-placeholder:hover {
      border-color: #9ca3af;
      background-color: #f9fafb;
    }
    
    .dark .ad-placeholder:hover {
      background-color: #374151;
      border-color: #6b7280;
    }
    
    .ad-banner {
      height: 90px;
    }
    
    .ad-rectangle {
      height: 250px;
    }
    
    .ad-square {
      height: 250px;
      width: 250px;
      margin: 0 auto;
    }
    
    .ad-sidebar {
      height: 600px;
      max-width: 160px;
    }
  `]
})
export class AdsenseComponent implements OnInit, AfterViewInit {
  @Input() adSlot: string = '';
  @Input() adFormat: 'banner' | 'rectangle' | 'square' | 'sidebar' = 'banner';
  @Input() containerClass: string = '';

  private adsenseService = inject(AdsenseService);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewInit(): void {
    if (this.shouldShowAd) {
      this.loadAd();
    }
  }

  get shouldShowAd(): boolean {
    return isPlatformBrowser(this.platformId) && !!this.adSlot;
  }

  private loadAd(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    // AdSense loading logic would go here
    console.log('Loading AdSense ad for slot:', this.adSlot);
  }
} 