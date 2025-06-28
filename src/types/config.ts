import { AxiosRequestConfig } from 'axios';
import { AuthConfig } from './auth';
import { CacheConfig } from './cache';
import { RetryConfig } from './retry';
import { LoggerConfig } from './logging';

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  environment?: Environment;
  auth?: AuthConfig;
  cache?: CacheConfig;
  retry?: RetryConfig;
  logging?: LoggerConfig;
  headers?: Record<string, string>;
  axiosConfig?: AxiosRequestConfig;
  enableInterceptors?: boolean;
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
}

export interface EnvironmentConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  auth?: Partial<AuthConfig>;
  cache?: Partial<CacheConfig>;
  retry?: Partial<RetryConfig>;
  logging?: Partial<LoggerConfig>;
}

export interface EnvironmentConfigs {
  development: EnvironmentConfig;
  staging: EnvironmentConfig;
  production: EnvironmentConfig;
  test: EnvironmentConfig;
}

export interface ConfigOverrides {
  baseURL?: string;
  timeout?: number;
  headers?: Record<string, string>;
  environment?: Environment;
}