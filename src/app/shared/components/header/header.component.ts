import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  showUserMenu = signal(false);
  showMobileMenu = signal(false);
  isLoggedIn = signal(false);
  searchQuery = '';
  currentYear = new Date().getFullYear();

  ngOnInit() {
    this.isLoggedIn.set(this.authService.isAuthenticated());
    
    // Auth state değişikliklerini dinle
    this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn.set(!!user);
    });
  }

  performSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], {
        queryParams: { q: this.searchQuery.trim() }
      });
      this.searchQuery = ''; // Arama sonrası temizle
      this.showMobileMenu.set(false); // Mobil menüyü kapat
    }
  }

  toggleUserMenu() {
    this.showUserMenu.set(!this.showUserMenu());
  }

  toggleMobileMenu() {
    this.showMobileMenu.set(!this.showMobileMenu());
  }

  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  getUserInitials() {
    const user = this.getCurrentUser();
    return user?.username ? user.username.substring(0, 2).toUpperCase() : 'U';
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

  logout() {
    this.authService.logout();
    this.showUserMenu.set(false);
    this.showMobileMenu.set(false);
    this.router.navigate(['/']);
  }
} 