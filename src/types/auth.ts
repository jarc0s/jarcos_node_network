export type TokenStorage = 'localStorage' | 'sessionStorage' | 'memory' | 'custom';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt?: number;
}

export interface AuthConfig {
  enabled?: boolean;
  tokenStorage?: TokenStorage;
  tokenKey?: string;
  refreshTokenKey?: string;
  refreshEndpoint?: string;
  loginEndpoint?: string;
  logoutEndpoint?: string;
  autoRefresh?: boolean;
  refreshThreshold?: number;
  customTokenStorage?: TokenStorageAdapter;
  bearerPrefix?: string;
  tokenHeader?: string;
  refreshOnStart?: boolean;
}

export interface TokenStorageAdapter {
  getToken(): Promise<string | null> | string | null;
  setToken(token: string): Promise<void> | void;
  removeToken(): Promise<void> | void;
  getRefreshToken(): Promise<string | null> | string | null;
  setRefreshToken(token: string): Promise<void> | void;
  removeRefreshToken(): Promise<void> | void;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
  [key: string]: any;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  [key: string]: any;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: any;
  [key: string]: any;
}

export interface AuthEvents {
  'auth:login': { tokens: AuthTokens; user?: any };
  'auth:logout': {};
  'auth:token-refreshed': { tokens: AuthTokens };
  'auth:refresh-failed': { error: Error };
  'auth:token-expired': { expiredToken: string };
}