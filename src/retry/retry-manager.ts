import { 
  RetryConfig, 
  RetryOptions, 
  RetryStats
} from '../types/retry';
import { RetryExhaustedError, ErrorCode } from '../errors';

export class RetryManager {
  private config: Required<RetryConfig>;
  private stats: RetryStats;

  constructor(config: RetryConfig = {}) {
    this.config = {
      enabled: true,
      maxAttempts: 3,
      backoffFactor: 2,
      baseDelay: 1000,
      maxDelay: 30000,
      retryCondition: this.defaultRetryCondition.bind(this),
      retryStatusCodes: [408, 429, 500, 502, 503, 504],
      shouldResetTimeout: true,
      jitter: true,
      onRetry: () => {},
      ...config
    };

    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0,
      maxRetryDelay: 0
    };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {},
    requestId?: string
  ): Promise<T> {
    if (!this.config.enabled && !options.enabled) {
      return operation();
    }

    const maxAttempts = options.maxAttempts ?? this.config.maxAttempts;
    const retryCondition = options.retryCondition ?? this.config.retryCondition;
    
    let lastError: Error;
    let totalDelay = 0;
    let attemptCount = 0;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attemptCount = attempt;
      try {
        this.stats.totalAttempts++;
        
        if (attempt > 1) {
          const delay = this.calculateDelay(attempt - 1, options);
          totalDelay += delay;
          
          if (this.config.onRetry) {
            this.config.onRetry(attempt - 1, lastError!);
          }

          await this.delay(delay);
          this.updateStats(delay);
        }

        const result = await operation();
        
        if (attempt > 1) {
          this.stats.successfulRetries++;
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        if (attempt === maxAttempts || !retryCondition(error)) {
          if (attempt > 1) {
            this.stats.failedRetries++;
          }
          break;
        }
      }
    }

    throw new RetryExhaustedError(attemptCount, lastError!, requestId);
  }

  calculateDelay(attempt: number, options: RetryOptions = {}): number {
    const baseDelay = this.config.baseDelay;
    const backoffFactor = options.retryDelay ? 1 : (this.config.backoffFactor);
    const maxDelay = this.config.maxDelay;

    if (options.retryDelay) {
      return Math.min(options.retryDelay, maxDelay);
    }

    let delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
    
    if (this.config.jitter) {
      delay = this.addJitter(delay);
    }

    return Math.min(delay, maxDelay);
  }

  private addJitter(delay: number): number {
    // Add up to 10% jitter to prevent thundering herd
    const jitterRange = delay * 0.1;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, delay + jitter);
  }

  private defaultRetryCondition(error: any): boolean {
    // Network errors
    if (error.code === 'ENOTFOUND' || 
        error.code === 'ECONNRESET' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT') {
      return true;
    }

    // HTTP status codes (check both raw AxiosError and transformed ApiError)
    const statusCode = error.response?.status || error.status;
    if (statusCode) {
      return this.config.retryStatusCodes.includes(statusCode);
    }

    // Custom error codes
    if (error.code) {
      return [
        ErrorCode.NETWORK_ERROR,
        ErrorCode.TIMEOUT_ERROR,
        ErrorCode.SERVICE_UNAVAILABLE,
        ErrorCode.SERVER_ERROR
      ].includes(error.code);
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateStats(delay: number): void {
    const totalDelays = this.stats.averageRetryDelay * this.stats.successfulRetries + delay;
    this.stats.averageRetryDelay = totalDelays / (this.stats.successfulRetries + 1);
    this.stats.maxRetryDelay = Math.max(this.stats.maxRetryDelay, delay);
  }

  getStats(): RetryStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0,
      maxRetryDelay: 0
    };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  shouldRetry(error: any, _attempt: number, maxAttempts: number): boolean {
    if (!this.config.enabled) return false;
    if (_attempt >= maxAttempts) return false;
    return this.config.retryCondition(error);
  }
}

