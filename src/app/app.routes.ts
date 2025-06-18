import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    title: 'Anime Rehberi - En İyi Anime Önerileri'
  },
  {
    path: 'search',
    loadComponent: () => import('./pages/search/search.component').then(m => m.SearchComponent)
  },
  {
    path: 'seasons/:season/:year',
    loadComponent: () => import('./pages/seasons/seasons.component').then(m => m.SeasonsComponent),
    title: 'Sezon Animeleri - Anime Rehberi'
  },
  {
    path: 'trending',
    loadComponent: () => import('./pages/trending/trending.component').then(m => m.TrendingComponent),
    title: 'Trend Animeler - Anime Rehberi'
  },
  {
    path: 'anime/:id',
    loadComponent: () => import('./pages/anime-detail/anime-detail.component').then(m => m.AnimeDetailComponent),
    title: 'Anime Detayı - Anime Rehberi'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent),
    title: 'Giriş Yap - Anime Rehberi'
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent),
    title: 'Kayıt Ol - Anime Rehberi'
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent),
    title: 'Profil - Anime Rehberi'
  },
  {
    path: 'watchlist',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/watchlist/watchlist.component').then(m => m.WatchlistComponent),
    title: 'İzleme Listesi - Anime Rehberi'
  },
  {
    path: 'favorites',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/favorites/favorites.component').then(m => m.FavoritesComponent),
    title: 'Favoriler - Anime Rehberi'
  },
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'Sayfa Bulunamadı - Anime Rehberi'
  }
];
