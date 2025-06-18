import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  
  // Skip adding token for AniList API requests
  if (req.url.includes('graphql.anilist.co')) {
    return next(req);
  }
  
  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }
  
  // AniList API istekleri için özel başlıklar ekle
  if (req.url.includes('anilist.co')) {
    const modifiedReq = req.clone({
      headers: req.headers
        .set('Content-Type', 'application/json')
        .set('Accept', 'application/json')
    });
    return next(modifiedReq);
  }
  
  return next(req);
}; 