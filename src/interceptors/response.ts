import { AxiosResponse, AxiosError } from 'axios';
import { CacheManager } from '../cache/cache-manager';
import { Logger } from '../logging/logger';
import { ResponseInterceptor } from '../types/api';
import { ApiError } from '../errors';

export class ResponseInterceptors {
  constructor(
    private cacheManager: CacheManager,
    private logger: Logger
  ) {}

  createLoggingInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: (response: AxiosResponse) => {
        const config = response.config as any;
        const skipLogging = config.skipLogging;
        if (skipLogging) return response;

        const metadata = config.metadata || {};
        const duration = metadata.startTime ? Date.now() - metadata.startTime : 0;

        this.logger.logResponse({
          status: response.status,
          statusText: response.statusText,
          headers: response.headers as Record<string, string>,
          data: response.data,
          duration,
          timestamp: Date.now(),
          requestId: metadata.requestId || 'unknown',
          fromCache: (response as any).fromCache || false
        });

        return response;
      },
      onRejected: (error: AxiosError) => {
        const config = error.config as any;
        const skipLogging = config?.skipLogging;
        if (!skipLogging) {
          const metadata = config?.metadata || {};

          this.logger.logError({
            error,
            timestamp: Date.now(),
            requestId: metadata.requestId || 'unknown'
          });
        }

        return Promise.reject(error);
      }
    };
  }

  createCacheInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: async (response: AxiosResponse) => {
        const config = response.config as any;
        const skipCache = config.skipCache;
        const cacheOptions = config.cache;

        if (!skipCache && this.cacheManager.isEnabled() && this.shouldCache(response)) {
          try {
            const cacheKey = this.buildCacheKey(response.config);
            await this.cacheManager.set(cacheKey, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              data: response.data
            }, cacheOptions);

            this.logger.logCacheSet(cacheKey, cacheOptions?.ttl || 0);
          } catch (error) {
            this.logger.warn('Failed to cache response', { error });
            // Don't fail the request due to cache errors
          }
        }

        return response;
      },
      onRejected: (error: any) => Promise.reject(error)
    };
  }

  createErrorTransformInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: (response: AxiosResponse) => response,
      onRejected: (error: AxiosError) => {
        const config = error.config as any;
        const metadata = config?.metadata || {};
        
        // Transform axios error to our custom error
        const apiError = ApiError.fromAxiosError(error, metadata.requestId);
        
        return Promise.reject(apiError);
      }
    };
  }

  createDataTransformInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: (response: AxiosResponse) => {
        // Transform response data if needed
        if (response.data && typeof response.data === 'object') {
          // Add metadata to response
          response.data = {
            ...response.data,
            _metadata: {
              status: response.status,
              requestId: (response.config as any)?.metadata?.requestId,
              timestamp: Date.now(),
              fromCache: (response as any).fromCache || false
            }
          };
        }

        return response;
      },
      onRejected: (error: any) => Promise.reject(error)
    };
  }

  createStatusValidationInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: (response: AxiosResponse) => {
        // Custom status validation beyond Axios defaults
        if (response.status >= 200 && response.status < 300) {
          return response;
        }

        // This shouldn't normally happen since Axios handles this,
        // but provides additional validation layer
        throw new ApiError({
          message: `Unexpected status code: ${response.status}`,
          status: response.status,
          statusText: response.statusText,
          data: response.data
        });
      },
      onRejected: (error: any) => Promise.reject(error)
    };
  }

  createRetryMetadataInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: (response: AxiosResponse) => {
        const config = response.config as any;
        const metadata = config.metadata || {};
        
        // Add retry information to response if retries occurred
        if (metadata.retryCount > 0) {
          (response as any).retryAttempt = metadata.retryCount;
        }

        return response;
      },
      onRejected: (error: any) => {
        const config = error.config as any;
        const metadata = config?.metadata || {};
        
        // Add retry information to error
        if (metadata.retryCount > 0) {
          error.retryAttempt = metadata.retryCount;
        }

        return Promise.reject(error);
      }
    };
  }

  createRateLimitInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: (response: AxiosResponse) => {
        // Check for rate limit headers
        const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
        const rateLimitReset = response.headers['x-ratelimit-reset'];
        
        if (rateLimitRemaining !== undefined && parseInt(rateLimitRemaining) < 10) {
          this.logger.warn('Rate limit warning', {
            remaining: rateLimitRemaining,
            reset: rateLimitReset
          });
        }

        return response;
      },
      onRejected: (error: AxiosError) => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          this.logger.warn('Rate limited', { retryAfter });
          
          // Add retry-after information to error
          (error as any).retryAfter = retryAfter;
        }

        return Promise.reject(error);
      }
    };
  }

  private shouldCache(response: AxiosResponse): boolean {
    // Only cache successful GET requests by default
    const method = response.config.method?.toUpperCase();
    return method === 'GET' && response.status >= 200 && response.status < 300;
  }

  private buildCacheKey(config: any): string {
    const method = config.method?.toUpperCase() || 'GET';
    const url = config.url || '';
    const params = config.params;
    const data = config.data;

    return this.cacheManager.buildCacheKey(url, method, params, data);
  }
}