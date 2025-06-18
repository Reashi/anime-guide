import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { AdsenseService } from './core/services/adsense.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  private adsenseService = inject(AdsenseService);
  
  ngOnInit(): void {
    // Initialize AdSense
    this.adsenseService.loadAdsense();
  }
}

// Export App as alias for AppComponent
export { AppComponent as App };
