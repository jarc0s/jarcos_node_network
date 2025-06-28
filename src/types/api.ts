import { AxiosRequestConfig, AxiosResponse } from 'axios';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export interface ApiRequestConfig extends Omit<AxiosRequestConfig, 'url' | 'method'> {
  cache?: ApiCacheOptions;
  retry?: ApiRetryOptions;
  skipAuth?: boolean;
  skipCache?: boolean;
  skipRetry?: boolean;
  skipLogging?: boolean;
}

export interface ApiResponse<T = any> extends AxiosResponse<T> {
  fromCache?: boolean;
  retryAttempt?: number;
}

export interface ApiCacheOptions {
  enabled?: boolean;
  ttl?: number;
  key?: string;
  invalidatePattern?: string;
}

export interface ApiRetryOptions {
  enabled?: boolean;
  maxAttempts?: number;
  backoffFactor?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
  shouldResetTimeout?: boolean;
}

export interface RequestInterceptor {
  onFulfilled?: (config: any) => any | Promise<any>;
  onRejected?: (error: any) => any;
}

export interface ResponseInterceptor {
  onFulfilled?: (response: any) => any | Promise<any>;
  onRejected?: (error: any) => any;
}

export interface ApiClientEvents {
  'request:start': { config: ApiRequestConfig; url: string; method: HttpMethod };
  'request:success': { response: ApiResponse; duration: number };
  'request:error': { error: Error; duration: number };
  'auth:token-refreshed': { newToken: string };
  'auth:refresh-failed': { error: Error };
  'cache:hit': { key: string; data: any };
  'cache:miss': { key: string };
  'cache:set': { key: string; ttl: number };
  'retry:attempt': { attempt: number; maxAttempts: number; delay: number };
}