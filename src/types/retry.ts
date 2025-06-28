export interface RetryConfig {
  enabled?: boolean;
  maxAttempts?: number;
  backoffFactor?: number;
  baseDelay?: number;
  maxDelay?: number;
  retryCondition?: (error: any) => boolean;
  retryStatusCodes?: number[];
  shouldResetTimeout?: boolean;
  jitter?: boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export interface RetryOptions {
  enabled?: boolean;
  maxAttempts?: number;
  backoffFactor?: number;
  retryDelay?: number;
  retryCondition?: (error: any) => boolean;
  shouldResetTimeout?: boolean;
}

export interface RetryAttempt {
  attempt: number;
  maxAttempts: number;
  delay: number;
  error: Error;
  nextRetryAt: number;
}

export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryDelay: number;
  maxRetryDelay: number;
}

export type RetryStrategy = 'exponential' | 'linear' | 'fixed' | 'custom';

export interface RetryStrategyOptions {
  strategy?: RetryStrategy;
  baseDelay?: number;
  maxDelay?: number;
  factor?: number;
  jitter?: boolean;
  customStrategy?: (attempt: number, baseDelay: number) => number;
}

export interface RetryEvents {
  'retry:attempt': { attempt: RetryAttempt };
  'retry:success': { attempt: number; totalTime: number };
  'retry:failed': { attempts: number; finalError: Error };
  'retry:exhausted': { maxAttempts: number; finalError: Error };
}