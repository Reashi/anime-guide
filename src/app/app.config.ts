import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withPreloading, PreloadAllModules, withViewTransitions } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
// import { provideClientHydration } from '@angular/platform-browser';

import { routes } from './app.routes';
// import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes, 
      withPreloading(PreloadAllModules),
      withViewTransitions()
    ),
    provideHttpClient(
      withFetch()
      // withInterceptors([authInterceptor])
    ),
    provideAnimationsAsync(),
    // provideClientHydration() // Geçici olarak devre dışı
  ]
};
