import { Injectable, inject, PLATFORM_ID, DOCUMENT } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AdsenseService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly ADSENSE_CLIENT_ID = 'ca-pub-YOUR_PUBLISHER_ID';
  
  private isAdsenseLoaded = false;
  
  loadAdsense(): void {
    if (!isPlatformBrowser(this.platformId) || this.isAdsenseLoaded) {
      return;
    }
    
    try {
      const script = this.document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.ADSENSE_CLIENT_ID}`;
      script.crossOrigin = 'anonymous';
      this.document.head.appendChild(script);
      this.isAdsenseLoaded = true;
    } catch (error) {
      console.error('AdSense yükleme hatası:', error);
    }
  }
  
  displayAd(adSlot: string, adFormat: string = 'auto', fullWidthResponsive: boolean = true): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    try {
      // @ts-ignore
      (adsbygoogle = window.adsbygoogle || []).push({
        google_ad_client: this.ADSENSE_CLIENT_ID,
        enable_page_level_ads: true
      });
    } catch (error) {
      console.error('Reklam gösterme hatası:', error);
    }
  }
  
  refreshAds(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    try {
      // @ts-ignore
      (adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error('Reklam yenileme hatası:', error);
    }
  }
} 