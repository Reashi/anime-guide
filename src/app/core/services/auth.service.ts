import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { User, AuthResponse, LoginRequest, RegisterRequest } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  
  private readonly API_URL = 'https://your-api-url.com/api';
  private readonly TOKEN_KEY = 'anime_guide_token';
  private readonly REFRESH_TOKEN_KEY = 'anime_guide_refresh_token';
  
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  constructor() {
    this.initializeUser();
  }
  
  private initializeUser(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem(this.TOKEN_KEY);
      if (token && this.isTokenValid(token)) {
        const user = this.getUserFromToken(token);
        this.currentUserSubject.next(user);
      }
    }
  }
  
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap(response => this.handleAuthResponse(response))
      );
  }
  
  register(userData: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/register`, userData)
      .pipe(
        tap(response => this.handleAuthResponse(response))
      );
  }
  
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/']);
  }
  
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = isPlatformBrowser(this.platformId) 
      ? localStorage.getItem(this.REFRESH_TOKEN_KEY) 
      : null;
      
    return this.http.post<AuthResponse>(`${this.API_URL}/auth/refresh`, { refreshToken })
      .pipe(
        tap(response => this.handleAuthResponse(response))
      );
  }
  
  getToken(): string | null {
    return isPlatformBrowser(this.platformId) 
      ? localStorage.getItem(this.TOKEN_KEY) 
      : null;
  }
  
  isAuthenticated(): boolean {
    const token = this.getToken();
    return token ? this.isTokenValid(token) : false;
  }
  
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
  
  private handleAuthResponse(response: AuthResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.TOKEN_KEY, response.token);
      localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);
    }
    this.currentUserSubject.next(response.user);
  }
  
  private isTokenValid(token: string): boolean {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp > currentTime;
    } catch {
      return false;
    }
  }
  
  private getUserFromToken(token: string): User | null {
    try {
      const decoded: any = jwtDecode(token);
      return decoded.user || null;
    } catch {
      return null;
    }
  }
} 