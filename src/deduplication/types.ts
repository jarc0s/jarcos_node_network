export interface DeduplicationConfig {
  enabled: boolean;
  keyGenerator?: (method: string, url: string, data?: any, params?: any) => string;
  timeout?: number; // Tiempo en ms para considerar una petición como "muerta"
}

export interface PendingRequest<T = any> {
  promise: Promise<T>;
  timestamp: number;
  abortController: AbortController;
}

export interface DeduplicationStats {
  totalRequests: number;
  deduplicatedRequests: number;
  activeRequests: number;
  deduplicationRate: number;
}