import { ApiClientConfig } from '../types/config';

export const defaultConfig: ApiClientConfig = {
  baseURL: '',
  timeout: 30000,
  environment: 'production',
  
  auth: {
    enabled: false,
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
    refreshOnStart: false
  },

  cache: {
    enabled: false,
    defaultTTL: 300000, // 5 minutes
    maxSize: 1000,
    keyPrefix: 'api_cache_',
    compression: false
  },

  retry: {
    enabled: false,
    maxAttempts: 3,
    backoffFactor: 2,
    baseDelay: 1000,
    maxDelay: 30000,
    shouldResetTimeout: true,
    jitter: true,
    retryStatusCodes: [408, 429, 500, 502, 503, 504]
  },

  logging: {
    enabled: true,
    level: 'info',
    prefix: '[API]',
    timestamp: true,
    colorize: true,
    prettyPrint: true,
    logRequests: false,
    logResponses: false,
    logErrors: true,
    logRetries: true,
    logCache: false,
    logAuth: true,
    sensitiveFields: ['password', 'token', 'authorization', 'cookie', 'x-api-key'],
    maxLogLength: 1000
  },

  deduplication: {
    enabled: true,
    timeout: 30000 // 30 seconds
  },

  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },

  enableInterceptors: true,
  maxRedirects: 5,
  
  validateStatus: (status: number) => status >= 200 && status < 300,

  axiosConfig: {
    withCredentials: false,
    responseType: 'json'
  }
};