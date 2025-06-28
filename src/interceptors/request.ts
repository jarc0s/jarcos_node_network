import { AxiosRequestConfig } from 'axios';
import { AuthManager } from '../auth/auth-manager';
import { Logger } from '../logging/logger';
import { RequestInterceptor } from '../types/api';

export class RequestInterceptors {
  constructor(
    private authManager: AuthManager,
    private logger: Logger
  ) {}

  createAuthInterceptor(): RequestInterceptor {
    return {
      onFulfilled: async (config: AxiosRequestConfig) => {
        if (!this.authManager.isEnabled()) return config;

        const skipAuth = (config as any).skipAuth;
        if (skipAuth) return config;

        try {
          const token = await this.authManager.getAccessToken();
          if (token) {
            const authHeader = this.authManager.getAuthHeader();
            const bearerPrefix = this.authManager.getBearerPrefix();
            
            config.headers = config.headers || {};
            config.headers[authHeader] = `${bearerPrefix} ${token}`;
          }
        } catch (error) {
          this.logger.error('Failed to attach auth token', { error });
          // Don't fail the request, let it proceed without auth
        }

        return config;
      },
      onRejected: (error: any) => {
        this.logger.error('Request interceptor auth error', { error });
        return Promise.reject(error);
      }
    };
  }

  createLoggingInterceptor(): RequestInterceptor {
    return {
      onFulfilled: (config: AxiosRequestConfig) => {
        const skipLogging = (config as any).skipLogging;
        if (skipLogging) return config;

        const requestId = this.generateRequestId();
        (config as any).metadata = { 
          requestId, 
          startTime: Date.now() 
        };

        this.logger.logRequest({
          method: config.method?.toUpperCase() || 'GET',
          url: this.buildFullUrl(config),
          headers: config.headers as Record<string, string>,
          data: config.data,
          timestamp: Date.now(),
          requestId
        });

        return config;
      },
      onRejected: (error: any) => {
        this.logger.error('Request interceptor logging error', { error });
        return Promise.reject(error);
      }
    };
  }

  createHeadersInterceptor(defaultHeaders: Record<string, string> = {}): RequestInterceptor {
    return {
      onFulfilled: (config: AxiosRequestConfig) => {
        config.headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...defaultHeaders,
          ...config.headers
        };

        // Add request ID if not present
        if (!config.headers['X-Request-ID']) {
          config.headers['X-Request-ID'] = this.generateRequestId();
        }

        // Add timestamp
        config.headers['X-Request-Timestamp'] = new Date().toISOString();

        return config;
      },
      onRejected: (error: any) => Promise.reject(error)
    };
  }

  createValidationInterceptor(): RequestInterceptor {
    return {
      onFulfilled: (config: AxiosRequestConfig) => {
        // Validate required fields
        if (!config.url) {
          throw new Error('Request URL is required');
        }

        // Validate method
        const method = config.method?.toUpperCase();
        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
        if (method && !validMethods.includes(method)) {
          throw new Error(`Invalid HTTP method: ${method}`);
        }

        // Validate timeout
        if (config.timeout && config.timeout < 0) {
          throw new Error('Timeout must be a positive number');
        }

        return config;
      },
      onRejected: (error: any) => Promise.reject(error)
    };
  }

  createRetryMetadataInterceptor(): RequestInterceptor {
    return {
      onFulfilled: (config: AxiosRequestConfig) => {
        // Initialize retry metadata if not present
        if (!(config as any).metadata) {
          (config as any).metadata = {};
        }

        const metadata = (config as any).metadata;
        if (!metadata.retryCount) {
          metadata.retryCount = 0;
        }

        // Add retry headers
        if (metadata.retryCount > 0) {
          config.headers = config.headers || {};
          config.headers['X-Retry-Attempt'] = metadata.retryCount.toString();
        }

        return config;
      },
      onRejected: (error: any) => Promise.reject(error)
    };
  }

  createUserAgentInterceptor(userAgent: string): RequestInterceptor {
    return {
      onFulfilled: (config: AxiosRequestConfig) => {
        config.headers = config.headers || {};
        if (!config.headers['User-Agent']) {
          config.headers['User-Agent'] = userAgent;
        }
        return config;
      },
      onRejected: (error: any) => Promise.reject(error)
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildFullUrl(config: AxiosRequestConfig): string {
    const baseURL = config.baseURL || '';
    const url = config.url || '';
    
    if (url.startsWith('http')) {
      return url;
    }
    
    return `${baseURL}${url}`;
  }
}