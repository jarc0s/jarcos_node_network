import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { EventEmitter } from 'events';

import { 
  ApiClientConfig, 
  HttpMethod, 
  ApiRequestConfig, 
  ApiResponse,
  LoginCredentials,
  AuthResponse
} from './types';

import { AuthManager } from './auth/auth-manager';
import { CacheManager } from './cache/cache-manager';
import { RetryManager } from './retry/retry-manager';
import { DeduplicationManager } from './deduplication/deduplication-manager';
import { Logger } from './logging/logger';

import { RequestInterceptors } from './interceptors/request';
import { ResponseInterceptors } from './interceptors/response';
import { AuthInterceptors } from './interceptors/auth';

import { 
  ApiError, 
  ConfigError,
  RetryExhaustedError
} from './errors';

import { defaultConfig } from './config/defaults';
import { getEnvironmentConfig, detectEnvironment } from './config/environments';
import { ConfigValidator, RequestValidator } from './utils/validators';
import { mergeConfigs, createRequestId } from './utils/helpers';

export class ApiClient extends EventEmitter {
  private axiosInstance!: AxiosInstance;
  private config!: ApiClientConfig;
  private authManager!: AuthManager;
  private cacheManager!: CacheManager;
  private retryManager!: RetryManager;
  private deduplicationManager!: DeduplicationManager;
  private logger!: Logger;
  private requestInterceptors!: RequestInterceptors;
  private responseInterceptors!: ResponseInterceptors;
  private authInterceptors!: AuthInterceptors;

  constructor(config: Partial<ApiClientConfig> = {}) {
    super();

    try {
      // Detect environment if not provided
      const environment = config.environment || detectEnvironment();
      const environmentConfig = getEnvironmentConfig(environment);
      
      // Merge configurations
      this.config = mergeConfigs(defaultConfig, environmentConfig || { baseURL: '' }, config);
      
      // Validate configuration
      ConfigValidator.validateConfig(this.config);
      
      // Initialize components
      this.initializeComponents();
      this.initializeAxios();
      this.setupInterceptors();
      
      this.logger.info('ApiClient initialized', {
        environment,
        baseURL: this.config.baseURL,
        features: {
          auth: this.authManager.isEnabled(),
          cache: this.cacheManager.isEnabled(),
          retry: this.retryManager.isEnabled(),
          deduplication: this.deduplicationManager.isEnabled()
        }
      });
    } catch (error) {
      throw new ConfigError(
        `Failed to initialize ApiClient: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private initializeComponents(): void {
    this.logger = new Logger(this.config.logging);
    this.authManager = new AuthManager(this.config.auth);
    this.cacheManager = new CacheManager(this.config.cache);
    
    // Configure retry manager with logger integration
    const retryConfig = {
      ...this.config.retry,
      onRetry: (attempt: number, error: Error) => {
        if (this.logger.isEnabled()) {
          // Calculate delay for logging (same logic as retry manager)
          const baseDelay = this.config.retry?.baseDelay || 1000;
          const backoffFactor = this.config.retry?.backoffFactor || 2;
          const maxDelay = this.config.retry?.maxDelay || 30000;
          
          let delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
          if (this.config.retry?.jitter) {
            const jitterRange = delay * 0.1;
            const jitter = (Math.random() - 0.5) * 2 * jitterRange;
            delay = Math.max(0, delay + jitter);
          }
          delay = Math.min(delay, maxDelay);
          
          this.logger.logRetry(attempt, this.config.retry?.maxAttempts || 3, delay, error);
        }
      }
    };
    
    this.retryManager = new RetryManager(retryConfig);
    this.deduplicationManager = new DeduplicationManager(this.config.deduplication, this.logger);
  }

  private initializeAxios(): void {
    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers || {},
      maxRedirects: this.config.maxRedirects,
      validateStatus: this.config.validateStatus,
      ...this.config.axiosConfig
    });

    // Set axios instance for auth manager
    this.authManager.setAxiosInstance(this.axiosInstance);
  }

  private setupInterceptors(): void {
    if (!this.config.enableInterceptors) return;

    this.requestInterceptors = new RequestInterceptors(this.authManager, this.logger);
    this.responseInterceptors = new ResponseInterceptors(this.cacheManager, this.logger);
    this.authInterceptors = new AuthInterceptors(this.authManager, this.logger, this.axiosInstance);

    // Request interceptors (order matters - first added, first executed)
    this.axiosInstance.interceptors.request.use(
      ...Object.values(this.requestInterceptors.createValidationInterceptor())
    );
    this.axiosInstance.interceptors.request.use(
      ...Object.values(this.requestInterceptors.createHeadersInterceptor(this.config.headers))
    );
    this.axiosInstance.interceptors.request.use(
      ...Object.values(this.requestInterceptors.createAuthInterceptor())
    );
    this.axiosInstance.interceptors.request.use(
      ...Object.values(this.requestInterceptors.createRetryMetadataInterceptor())
    );
    this.axiosInstance.interceptors.request.use(
      ...Object.values(this.requestInterceptors.createLoggingInterceptor())
    );

    // Response interceptors (order matters - first added, last executed)
    this.axiosInstance.interceptors.response.use(
      ...Object.values(this.responseInterceptors.createRetryMetadataInterceptor())
    );
    this.axiosInstance.interceptors.response.use(
      ...Object.values(this.responseInterceptors.createRateLimitInterceptor())
    );
    this.axiosInstance.interceptors.response.use(
      ...Object.values(this.responseInterceptors.createCacheInterceptor())
    );
    this.axiosInstance.interceptors.response.use(
      ...Object.values(this.authInterceptors.createAuthResponseInterceptor())
    );
    this.axiosInstance.interceptors.response.use(
      ...Object.values(this.responseInterceptors.createLoggingInterceptor())
    );
    this.axiosInstance.interceptors.response.use(
      ...Object.values(this.responseInterceptors.createErrorTransformInterceptor())
    );
  }

  // HTTP Methods
  async get<T = any>(url: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('GET', url, config);
  }

  async post<T = any>(url: string, data?: any, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('POST', url, { ...config, data });
  }

  async put<T = any>(url: string, data?: any, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', url, { ...config, data });
  }

  async patch<T = any>(url: string, data?: any, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', url, { ...config, data });
  }

  async delete<T = any>(url: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', url, config);
  }

  async head<T = any>(url: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('HEAD', url, config);
  }

  async options<T = any>(url: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>('OPTIONS', url, config);
  }

  // Core request method
  async request<T = any>(method: HttpMethod, url: string, config: ApiRequestConfig = {}): Promise<ApiResponse<T>> {
    try {
      // Validate input
      RequestValidator.validateUrl(url);
      RequestValidator.validateMethod(method);
      RequestValidator.validateHeaders(config.headers);
      RequestValidator.validateData(config.data, method);

      // Use deduplication to execute the request
      return await this.deduplicationManager.executeRequest<ApiResponse<T>>(
        method,
        url,
        async () => {
          // Check cache first
          const response = await this.tryGetFromCache<T>(method, url, config);
          if (response) {
            return response;
          }

          // Prepare request config
          const requestConfig = {
            method,
            url,
            ...config
          } as any;

          // Execute with retry
          return await this.executeWithRetry<T>(requestConfig, config);
        },
        config.data,
        config.params
      );
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Don't wrap other specialized errors like RetryExhaustedError
      if (error instanceof RetryExhaustedError) {
        throw error;
      }
      
      throw new ApiError({
        message: error instanceof Error ? error.message : 'Request failed'
      });
    }
  }

  private async tryGetFromCache<T>(method: HttpMethod, url: string, config: ApiRequestConfig): Promise<ApiResponse<T> | null> {
    if (config.skipCache || !this.cacheManager.isEnabled() || method !== 'GET') {
      return null;
    }

    try {
      const cacheKey = this.cacheManager.buildCacheKey(url, method, config.params, config.data);
      const cachedData = await this.cacheManager.get<any>(cacheKey);
      
      if (cachedData) {
        this.logger.logCacheHit(cacheKey, cachedData);
        
        // Transform cached data to ApiResponse format
        const response: ApiResponse<T> = {
          data: cachedData.data,
          status: cachedData.status,
          statusText: cachedData.statusText,
          headers: cachedData.headers,
          config: config as any,
          request: {},
          fromCache: true
        };
        
        return response;
      } else {
        this.logger.logCacheMiss(cacheKey);
      }
    } catch (error) {
      this.logger.warn('Cache lookup failed', { error });
    }

    return null;
  }

  private async executeWithRetry<T>(requestConfig: AxiosRequestConfig, options: ApiRequestConfig): Promise<ApiResponse<T>> {
    const requestId = createRequestId();
    (requestConfig as any).metadata = { requestId, startTime: Date.now() };

    const operation = async (): Promise<ApiResponse<T>> => {
      try {
        const response = await this.axiosInstance.request<T>(requestConfig as any);
        return response as ApiResponse<T>;
      } catch (error: any) {
        // Increment retry count for next attempt
        const metadata = (requestConfig as any).metadata || {};
        metadata.retryCount = (metadata.retryCount || 0) + 1;
        
        // If interceptors are disabled, manually convert AxiosError to ApiError
        if (!this.config.enableInterceptors && error.isAxiosError) {
          throw ApiError.fromAxiosError(error, requestId);
        }
        
        throw error;
      }
    };

    if (options.skipRetry || !this.retryManager.isEnabled()) {
      return operation();
    }

    return this.retryManager.executeWithRetry(operation, options.retry as any, requestId);
  }

  // Authentication methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (!this.authManager.isEnabled()) {
      throw new ConfigError('Authentication is not enabled');
    }

    try {
      const authResponse = await this.authManager.login(credentials);
      this.emit('auth:login', { tokens: authResponse, user: authResponse.user });
      return authResponse;
    } catch (error) {
      this.emit('auth:login-failed', { error });
      throw error;
    }
  }

  async logout(): Promise<void> {
    if (!this.authManager.isEnabled()) {
      return;
    }

    try {
      await this.authManager.logout();
      this.emit('auth:logout');
    } catch (error) {
      this.emit('auth:logout-failed', { error });
      throw error;
    }
  }

  async refreshToken(): Promise<string> {
    if (!this.authManager.isEnabled()) {
      throw new ConfigError('Authentication is not enabled');
    }

    try {
      const newToken = await this.authManager.refreshToken();
      this.emit('auth:token-refreshed', { newToken });
      return newToken;
    } catch (error) {
      this.emit('auth:refresh-failed', { error });
      throw error;
    }
  }

  // Cache methods
  async invalidateCache(pattern?: string): Promise<number> {
    if (!this.cacheManager.isEnabled()) {
      return 0;
    }

    if (pattern) {
      return this.cacheManager.invalidatePattern(pattern);
    } else {
      await this.cacheManager.clear();
      return 0;
    }
  }

  getCacheStats() {
    return this.cacheManager.getStats();
  }

  getRetryStats() {
    return this.retryManager.getStats();
  }

  getDeduplicationStats() {
    return this.deduplicationManager.getStats();
  }

  // Configuration methods
  updateConfig(newConfig: Partial<ApiClientConfig>): void {
    this.config = mergeConfigs(this.config, { baseURL: '' }, newConfig);
    ConfigValidator.validateConfig(this.config);

    // Update axios instance
    this.axiosInstance.defaults.baseURL = this.config.baseURL;
    this.axiosInstance.defaults.timeout = this.config.timeout;
    this.axiosInstance.defaults.headers = { 
      ...this.axiosInstance.defaults.headers, 
      ...this.config.headers 
    };

    this.logger.info('Configuration updated', { newConfig });
  }

  getConfig(): ApiClientConfig {
    return { ...this.config };
  }

  // Utility methods
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  isReady(): boolean {
    return !!this.axiosInstance;
  }

  async healthCheck(): Promise<{ status: 'ok' | 'error'; details: any }> {
    try {
      const response = await this.get('/health', { 
        skipAuth: true, 
        skipCache: true, 
        skipRetry: true 
      });
      
      return {
        status: 'ok',
        details: {
          statusCode: response.status,
          data: response.data
        }
      };
    } catch (error) {
      return {
        status: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  destroy(): void {
    this.removeAllListeners();
    
    // Clear any pending timers or resources
    if (this.authManager) {
      this.authManager.clearTokens().catch(() => {});
    }
    
    if (this.cacheManager) {
      this.cacheManager.clear().catch(() => {});
    }

    if (this.deduplicationManager) {
      this.deduplicationManager.clear();
    }

    this.logger.info('ApiClient destroyed');
  }
}