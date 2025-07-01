import { ApiClientConfig, EnvironmentConfig } from '../types/config';

export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        (result as any)[key] = deepMerge(targetValue as any, sourceValue as any);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function mergeConfigs(
  defaultConfig: ApiClientConfig,
  environmentConfig: EnvironmentConfig,
  userConfig: Partial<ApiClientConfig>
): ApiClientConfig {
  // First merge default with environment
  let merged = deepMerge(defaultConfig, environmentConfig as Partial<ApiClientConfig>);
  
  // Then merge with user config
  merged = deepMerge(merged, userConfig);
  
  return merged;
}

export function createRequestId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `req_${timestamp}_${random}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  
  const minutes = seconds / 60;
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  }
  
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

export function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

export function pick<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  
  return result;
}

export function omit<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  
  for (const key of keys) {
    delete result[key];
  }
  
  return result;
}

export function parseContentType(contentType: string): { type: string; charset?: string } {
  const parts = contentType.split(';');
  const type = parts[0]?.trim() || '';
  const charset = parts
    .find(part => part.trim().startsWith('charset='))
    ?.split('=')[1]
    ?.trim();
  
  return { type, charset };
}

export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach(v => searchParams.append(key, String(v)));
      } else {
        searchParams.set(key, String(value));
      }
    }
  }
  
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export function parseUrl(url: string): { 
  protocol: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
} {
  try {
    const parsedUrl = new URL(url);
    return {
      protocol: parsedUrl.protocol,
      host: parsedUrl.host,
      pathname: parsedUrl.pathname,
      search: parsedUrl.search,
      hash: parsedUrl.hash
    };
  } catch {
    // Fallback for relative URLs
    const [pathname, search = '', hash = ''] = url.split(/[?#]/);
    return {
      protocol: '',
      host: '',
      pathname: pathname || '',
      search: search ? `?${search}` : '',
      hash: hash ? `#${hash}` : ''
    };
  }
}

export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.code === 'ENOTFOUND' || 
      error.code === 'ECONNRESET' || 
      error.code === 'ECONNREFUSED' ||
      error.code === 'ETIMEDOUT') {
    return true;
  }

  // HTTP status codes
  if (error.response?.status) {
    const status = error.response.status;
    return status === 408 || status === 429 || status >= 500;
  }

  return false;
}

export function createAbortController(): AbortController {
  return new AbortController();
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}