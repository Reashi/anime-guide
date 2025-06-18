import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  template: `
    <div class="bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <!-- Logo -->
        <div class="flex justify-center">
          <div class="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-lg">AR</span>
          </div>
        </div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Yeni hesap oluşturun
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Zaten hesabınız var mı?
          <a routerLink="/login" class="font-medium text-blue-600 hover:text-blue-500">
            Giriş yapın
          </a>
        </p>
      </div>

      <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="space-y-6">
            <!-- Username -->
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Kullanıcı adı
              </label>
              <div class="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autocomplete="username"
                  formControlName="username"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="kullaniciadi"
                >
                @if (registerForm.get('username')?.invalid && registerForm.get('username')?.touched) {
                  <p class="mt-2 text-sm text-red-600">
                    Kullanıcı adı en az 3 karakter olmalıdır
                  </p>
                }
              </div>
            </div>

            <!-- Email -->
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                E-posta adresi
              </label>
              <div class="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autocomplete="email"
                  formControlName="email"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="ornek@email.com"
                >
                @if (registerForm.get('email')?.invalid && registerForm.get('email')?.touched) {
                  <p class="mt-2 text-sm text-red-600">
                    Geçerli bir e-posta adresi girin
                  </p>
                }
              </div>
            </div>

            <!-- Password -->
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Şifre
              </label>
              <div class="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autocomplete="new-password"
                  formControlName="password"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="••••••••"
                >
                @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
                  <p class="mt-2 text-sm text-red-600">
                    Şifre en az 8 karakter olmalıdır
                  </p>
                }
              </div>
            </div>

            <!-- Confirm Password -->
            <div>
              <label for="confirmPassword" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Şifre tekrarı
              </label>
              <div class="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autocomplete="new-password"
                  formControlName="confirmPassword"
                  required
                  class="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm"
                  placeholder="••••••••"
                >
                @if (registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched) {
                  <p class="mt-2 text-sm text-red-600">
                    Şifreler eşleşmiyor
                  </p>
                }
              </div>
            </div>

            <!-- Terms and Conditions -->
            <div class="flex items-center">
              <input
                id="acceptTerms"
                name="acceptTerms"
                type="checkbox"
                formControlName="acceptTerms"
                required
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              >
              <label for="acceptTerms" class="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                <span class="text-red-500">*</span>
                <a href="#" class="text-blue-600 hover:text-blue-500">Kullanım Şartları</a> ve 
                <a href="#" class="text-blue-600 hover:text-blue-500">Gizlilik Politikası</a>'nı kabul ediyorum
              </label>
            </div>
            @if (registerForm.get('acceptTerms')?.invalid && registerForm.get('acceptTerms')?.touched) {
              <p class="text-sm text-red-600">
                Devam etmek için şartları kabul etmelisiniz
              </p>
            }

            <!-- Error Message -->
            @if (errorMessage) {
              <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded relative">
                <span class="block sm:inline">{{ errorMessage }}</span>
              </div>
            }

            <!-- Success Message -->
            @if (successMessage) {
              <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded relative">
                <span class="block sm:inline">{{ successMessage }}</span>
              </div>
            }

            <!-- Submit Button -->
            <div>
              <button
                type="submit"
                [disabled]="registerForm.invalid || loading"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors">
                @if (loading) {
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Hesap oluşturuluyor...
                } @else {
                  Hesap Oluştur
                }
              </button>
            </div>
          </form>

          <!-- Login Link -->
          <div class="mt-6">
            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white dark:bg-gray-800 text-gray-500">
                  Zaten hesabınız var mı?
                </span>
              </div>
            </div>

            <div class="mt-6">
              <a
                routerLink="/login"
                class="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
                Giriş Yap
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';

      const { username, email, password, confirmPassword } = this.registerForm.value;

      this.authService.register({ username, email, password, confirmPassword }).subscribe({
        next: () => {
          this.successMessage = 'Hesabınız başarıyla oluşturuldu! Ana sayfaya yönlendiriliyorsunuz...';
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 2000);
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.message || 'Hesap oluşturulurken bir hata oluştu';
        }
      });
    }
  }
} 