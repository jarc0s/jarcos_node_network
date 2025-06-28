import { 
  AuthConfig, 
  AuthTokens, 
  TokenStorageAdapter, 
  LoginCredentials, 
  RefreshTokenRequest, 
  AuthResponse
} from '../types/auth';
import { AuthError, ErrorCode } from '../errors';
import { AxiosInstance } from 'axios';

export class AuthManager {
  private config: Required<AuthConfig>;
  private storage: TokenStorageAdapter;
  private axiosInstance?: AxiosInstance;
  private refreshPromise?: Promise<string>;
  private refreshTimer?: NodeJS.Timeout | undefined;

  constructor(config: AuthConfig = {}) {
    this.config = {
      enabled: true,
      tokenStorage: 'localStorage',
      tokenKey: 'api_access_token',
      refreshTokenKey: 'api_refresh_token',
      refreshEndpoint: '/auth/refresh',
      loginEndpoint: '/auth/login',
      logoutEndpoint: '/auth/logout',
      autoRefresh: true,
      refreshThreshold: 300000, // 5 minutes
      bearerPrefix: 'Bearer',
      tokenHeader: 'Authorization',
      refreshOnStart: false,
      customTokenStorage: undefined as any,
      ...config
    };

    this.storage = this.config.customTokenStorage ?? this.createDefaultStorage();
  }

  setAxiosInstance(instance: AxiosInstance): void {
    this.axiosInstance = instance;
  }

  private createDefaultStorage(): TokenStorageAdapter {
    const storageType = this.config.tokenStorage;
    
    if (storageType === 'memory') {
      return new MemoryTokenStorage();
    }

    if (typeof window !== 'undefined') {
      const storage = storageType === 'sessionStorage' ? sessionStorage : localStorage;
      return new BrowserTokenStorage(storage, this.config.tokenKey, this.config.refreshTokenKey);
    }

    return new MemoryTokenStorage();
  }

  async getAccessToken(): Promise<string | null> {
    if (!this.config.enabled) return null;

    const token = await this.storage.getToken();
    if (!token) return null;

    if (this.config.autoRefresh && await this.isTokenExpiringSoon(token)) {
      try {
        return await this.refreshToken();
      } catch (error) {
        await this.clearTokens();
        throw new AuthError('Failed to refresh token', ErrorCode.TOKEN_EXPIRED);
      }
    }

    return token;
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    if (!this.config.enabled) return;

    await this.storage.setToken(tokens.accessToken);
    
    if (tokens.refreshToken) {
      await this.storage.setRefreshToken(tokens.refreshToken);
    }

    if (this.config.autoRefresh && tokens.expiresIn) {
      this.scheduleTokenRefresh(tokens.expiresIn);
    }
  }

  async clearTokens(): Promise<void> {
    await this.storage.removeToken();
    await this.storage.removeRefreshToken();
    
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (!this.axiosInstance) {
      throw new AuthError('Axios instance not configured', ErrorCode.CONFIG_ERROR);
    }

    try {
      const response = await this.axiosInstance.post<AuthResponse>(
        this.config.loginEndpoint,
        credentials
      );

      const authData = response.data;
      
      await this.setTokens({
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken ?? undefined,
        tokenType: authData.tokenType ?? undefined,
        expiresIn: authData.expiresIn ?? undefined
      });

      return authData;
    } catch (error: any) {
      throw new AuthError(
        error.response?.data?.message || 'Login failed',
        ErrorCode.AUTH_ERROR,
        error.response?.status
      );
    }
  }

  async logout(): Promise<void> {
    if (this.axiosInstance && this.config.logoutEndpoint) {
      try {
        await this.axiosInstance.post(this.config.logoutEndpoint);
      } catch (error) {
        // Ignore logout endpoint errors
      }
    }

    await this.clearTokens();
  }

  async refreshToken(): Promise<string> {
    if (!this.config.enabled) {
      throw new AuthError('Authentication disabled', ErrorCode.CONFIG_ERROR);
    }

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = undefined;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = await this.storage.getRefreshToken();
    
    if (!refreshToken) {
      throw new AuthError('No refresh token available', ErrorCode.REFRESH_TOKEN_EXPIRED);
    }

    if (!this.axiosInstance) {
      throw new AuthError('Axios instance not configured', ErrorCode.CONFIG_ERROR);
    }

    try {
      const request: RefreshTokenRequest = { refreshToken };
      const response = await this.axiosInstance.post<AuthResponse>(
        this.config.refreshEndpoint,
        request
      );

      const authData = response.data;
      
      await this.setTokens({
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken ?? refreshToken,
        tokenType: authData.tokenType ?? undefined,
        expiresIn: authData.expiresIn ?? undefined
      });

      return authData.accessToken;
    } catch (error: any) {
      await this.clearTokens();
      throw new AuthError(
        error.response?.data?.message || 'Token refresh failed',
        ErrorCode.REFRESH_TOKEN_EXPIRED,
        error.response?.status
      );
    }
  }

  private async isTokenExpiringSoon(token: string): Promise<boolean> {
    try {
      const payload = this.parseJwtPayload(token);
      if (!payload.exp) return false;

      const expiresAt = payload.exp * 1000;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      return timeUntilExpiry <= this.config.refreshThreshold;
    } catch {
      return false;
    }
  }

  private parseJwtPayload(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return {};
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  }

  private scheduleTokenRefresh(expiresInSeconds: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const refreshIn = Math.max(
      (expiresInSeconds * 1000) - this.config.refreshThreshold,
      0
    );

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        // Token refresh failed, will be handled on next request
      }
    }, refreshIn);
  }

  getAuthHeader(): string {
    return this.config.tokenHeader;
  }

  getBearerPrefix(): string {
    return this.config.bearerPrefix;
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}

class MemoryTokenStorage implements TokenStorageAdapter {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getToken(): string | null {
    return this.accessToken;
  }

  setToken(token: string): void {
    this.accessToken = token;
  }

  removeToken(): void {
    this.accessToken = null;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  removeRefreshToken(): void {
    this.refreshToken = null;
  }
}

class BrowserTokenStorage implements TokenStorageAdapter {
  constructor(
    private storage: Storage,
    private tokenKey: string,
    private refreshTokenKey: string
  ) {}

  getToken(): string | null {
    return this.storage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    this.storage.setItem(this.tokenKey, token);
  }

  removeToken(): void {
    this.storage.removeItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return this.storage.getItem(this.refreshTokenKey);
  }

  setRefreshToken(token: string): void {
    this.storage.setItem(this.refreshTokenKey, token);
  }

  removeRefreshToken(): void {
    this.storage.removeItem(this.refreshTokenKey);
  }
}