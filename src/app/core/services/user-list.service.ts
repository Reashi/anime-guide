import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';

import { UserAnimeList, WatchStatus, Priority, UserListStats } from '../models/user-list.model';
import { Anime } from '../models/anime.model';

@Injectable({
  providedIn: 'root'
})
export class UserListService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = 'https://your-api-url.com/api';
  
  private userListSubject = new BehaviorSubject<UserAnimeList[]>([]);
  public userList$ = this.userListSubject.asObservable();
  
  private favoritesSubject = new BehaviorSubject<UserAnimeList[]>([]);
  public favorites$ = this.favoritesSubject.asObservable();
  
  getUserList(userId: string): Observable<UserAnimeList[]> {
    return this.http.get<UserAnimeList[]>(`${this.API_URL}/users/${userId}/anime-list`)
      .pipe(
        tap(list => this.userListSubject.next(list))
      );
  }
  
  addToList(animeId: number, status: WatchStatus = WatchStatus.PLANNING): Observable<UserAnimeList> {
    const payload = {
      animeId,
      status,
      progress: 0,
      priority: Priority.MEDIUM,
      tags: [],
      favorite: false
    };
    
    return this.http.post<UserAnimeList>(`${this.API_URL}/user-list`, payload)
      .pipe(
        tap(entry => {
          const currentList = this.userListSubject.value;
          this.userListSubject.next([...currentList, entry]);
        })
      );
  }
  
  updateListEntry(entryId: string, updates: Partial<UserAnimeList>): Observable<UserAnimeList> {
    return this.http.patch<UserAnimeList>(`${this.API_URL}/user-list/${entryId}`, updates)
      .pipe(
        tap(updatedEntry => {
          const currentList = this.userListSubject.value;
          const index = currentList.findIndex(entry => entry.id === entryId);
          if (index !== -1) {
            const newList = [...currentList];
            newList[index] = updatedEntry;
            this.userListSubject.next(newList);
          }
          
          // Update favorites if needed
          if (updatedEntry.favorite) {
            const currentFavorites = this.favoritesSubject.value;
            const favoriteIndex = currentFavorites.findIndex(fav => fav.id === entryId);
            if (favoriteIndex === -1) {
              this.favoritesSubject.next([...currentFavorites, updatedEntry]);
            } else {
              const newFavorites = [...currentFavorites];
              newFavorites[favoriteIndex] = updatedEntry;
              this.favoritesSubject.next(newFavorites);
            }
          } else {
            // Remove from favorites if no longer favorite
            const currentFavorites = this.favoritesSubject.value;
            const newFavorites = currentFavorites.filter(fav => fav.id !== entryId);
            this.favoritesSubject.next(newFavorites);
          }
        })
      );
  }
  
  removeFromList(entryId: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/user-list/${entryId}`)
      .pipe(
        tap(() => {
          const currentList = this.userListSubject.value;
          const newList = currentList.filter(entry => entry.id !== entryId);
          this.userListSubject.next(newList);
          
          // Also remove from favorites
          const currentFavorites = this.favoritesSubject.value;
          const newFavorites = currentFavorites.filter(fav => fav.id !== entryId);
          this.favoritesSubject.next(newFavorites);
        })
      );
  }
  
  getFavorites(userId: string): Observable<UserAnimeList[]> {
    return this.http.get<UserAnimeList[]>(`${this.API_URL}/users/${userId}/favorites`)
      .pipe(
        tap(favorites => this.favoritesSubject.next(favorites))
      );
  }
  
  getListByStatus(status: WatchStatus): Observable<UserAnimeList[]> {
    return this.userList$.pipe(
      map(list => list.filter(entry => entry.status === status))
    );
  }
  
  getUserStats(userId: string): Observable<UserListStats> {
    return this.http.get<UserListStats>(`${this.API_URL}/users/${userId}/stats`);
  }
  
  isInList(animeId: number): Observable<UserAnimeList | null> {
    return this.userList$.pipe(
      map(list => list.find(entry => entry.animeId === animeId) || null)
    );
  }
  
  isFavorite(animeId: number): Observable<boolean> {
    return this.favorites$.pipe(
      map(favorites => favorites.some(fav => fav.animeId === animeId))
    );
  }
  
  searchInList(query: string): Observable<UserAnimeList[]> {
    const queryLower = query.toLowerCase();
    return this.userList$.pipe(
      map(list => list.filter(entry =>
        entry.anime.title.toLowerCase().includes(queryLower) ||
        (entry.anime.englishTitle && entry.anime.englishTitle.toLowerCase().includes(queryLower)) ||
        entry.anime.genres.some(genre => genre.toLowerCase().includes(queryLower))
      ))
    );
  }
} 