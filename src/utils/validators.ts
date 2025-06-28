import { ApiClientConfig } from '../types/config';
import { ValidationError } from '../errors';

export class ConfigValidator {
  static validateConfig(config: ApiClientConfig): void {
    this.validateBaseURL(config.baseURL);
    this.validateTimeout(config.timeout);
    this.validateAuth(config.auth);
    this.validateCache(config.cache);
    this.validateRetry(config.retry);
    this.validateLogging(config.logging);
  }

  private static validateBaseURL(baseURL?: string): void {
    if (baseURL && typeof baseURL !== 'string') {
      throw new ValidationError('baseURL must be a string', 'baseURL', baseURL);
    }

    if (baseURL && baseURL.length > 0) {
      try {
        new URL(baseURL);
      } catch {
        throw new ValidationError('baseURL must be a valid URL', 'baseURL', baseURL);
      }
    }
  }

  private static validateTimeout(timeout?: number): void {
    if (timeout !== undefined) {
      if (typeof timeout !== 'number' || timeout < 0) {
        throw new ValidationError('timeout must be a positive number', 'timeout', timeout);
      }

      if (timeout > 300000) { // 5 minutes
        throw new ValidationError('timeout should not exceed 5 minutes', 'timeout', timeout);
      }
    }
  }

  private static validateAuth(auth?: any): void {
    if (!auth) return;

    if (auth.refreshThreshold !== undefined) {
      if (typeof auth.refreshThreshold !== 'number' || auth.refreshThreshold < 0) {
        throw new ValidationError(
          'auth.refreshThreshold must be a positive number',
          'auth.refreshThreshold',
          auth.refreshThreshold
        );
      }
    }

    if (auth.tokenStorage && !['localStorage', 'sessionStorage', 'memory', 'custom'].includes(auth.tokenStorage)) {
      throw new ValidationError(
        'auth.tokenStorage must be one of: localStorage, sessionStorage, memory, custom',
        'auth.tokenStorage',
        auth.tokenStorage
      );
    }
  }

  private static validateCache(cache?: any): void {
    if (!cache) return;

    if (cache.defaultTTL !== undefined) {
      if (typeof cache.defaultTTL !== 'number' || cache.defaultTTL < 0) {
        throw new ValidationError(
          'cache.defaultTTL must be a positive number',
          'cache.defaultTTL',
          cache.defaultTTL
        );
      }
    }

    if (cache.maxSize !== undefined) {
      if (typeof cache.maxSize !== 'number' || cache.maxSize < 1) {
        throw new ValidationError(
          'cache.maxSize must be a positive number',
          'cache.maxSize',
          cache.maxSize
        );
      }
    }
  }

  private static validateRetry(retry?: any): void {
    if (!retry) return;

    if (retry.maxAttempts !== undefined) {
      if (typeof retry.maxAttempts !== 'number' || retry.maxAttempts < 1 || retry.maxAttempts > 10) {
        throw new ValidationError(
          'retry.maxAttempts must be between 1 and 10',
          'retry.maxAttempts',
          retry.maxAttempts
        );
      }
    }

    if (retry.backoffFactor !== undefined) {
      if (typeof retry.backoffFactor !== 'number' || retry.backoffFactor < 1) {
        throw new ValidationError(
          'retry.backoffFactor must be >= 1',
          'retry.backoffFactor',
          retry.backoffFactor
        );
      }
    }

    if (retry.baseDelay !== undefined) {
      if (typeof retry.baseDelay !== 'number' || retry.baseDelay < 0) {
        throw new ValidationError(
          'retry.baseDelay must be a positive number',
          'retry.baseDelay',
          retry.baseDelay
        );
      }
    }
  }

  private static validateLogging(logging?: any): void {
    if (!logging) return;

    if (logging.level && !['error', 'warn', 'info', 'debug', 'trace'].includes(logging.level)) {
      throw new ValidationError(
        'logging.level must be one of: error, warn, info, debug, trace',
        'logging.level',
        logging.level
      );
    }

    if (logging.maxLogLength !== undefined) {
      if (typeof logging.maxLogLength !== 'number' || logging.maxLogLength < 10) {
        throw new ValidationError(
          'logging.maxLogLength must be >= 10',
          'logging.maxLogLength',
          logging.maxLogLength
        );
      }
    }
  }
}

export class RequestValidator {
  static validateUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('URL is required and must be a string', 'url', url);
    }

    if (url.trim().length === 0) {
      throw new ValidationError('URL cannot be empty', 'url', url);
    }
  }

  static validateMethod(method: string): void {
    const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
    const upperMethod = method.toUpperCase();
    
    if (!validMethods.includes(upperMethod)) {
      throw new ValidationError(
        `Invalid HTTP method. Must be one of: ${validMethods.join(', ')}`,
        'method',
        method
      );
    }
  }

  static validateHeaders(headers: any): void {
    if (headers && typeof headers !== 'object') {
      throw new ValidationError('Headers must be an object', 'headers', headers);
    }

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        if (typeof key !== 'string') {
          throw new ValidationError('Header keys must be strings', 'headers', key);
        }
        if (typeof value !== 'string' && typeof value !== 'number') {
          throw new ValidationError('Header values must be strings or numbers', 'headers', value);
        }
      }
    }
  }

  static validateData(data: any, method: string): void {
    const methodsWithBody = ['POST', 'PUT', 'PATCH'];
    const upperMethod = method.toUpperCase();

    if (!methodsWithBody.includes(upperMethod) && data !== undefined) {
      throw new ValidationError(
        `${upperMethod} requests should not have a body`,
        'data',
        data
      );
    }
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidHttpMethod(method: string): boolean {
  const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
  return validMethods.includes(method.toUpperCase());
}

export function sanitizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, ''); // Remove trailing slashes
}

export function normalizeHeaders(headers: Record<string, any>): Record<string, string> {
  const normalized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(headers)) {
    normalized[key] = String(value);
  }
  
  return normalized;
}