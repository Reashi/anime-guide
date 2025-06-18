export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  joinDate: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  language: 'tr' | 'en' | 'jp';
  theme: 'light' | 'dark';
  adultContent: boolean;
  notifications: {
    newEpisodes: boolean;
    recommendations: boolean;
    marketing: boolean;
  };
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
} 