// import { RetryStrategyOptions } from '../types/retry';

export class RetryStrategies {
  static exponentialBackoff(baseDelay: number = 1000, maxDelay: number = 30000, factor: number = 2): (attempt: number) => number {
    return (attempt: number) => {
      const delay = baseDelay * Math.pow(factor, attempt - 1);
      return Math.min(delay, maxDelay);
    };
  }

  static linearBackoff(baseDelay: number = 1000, increment: number = 1000, maxDelay: number = 30000): (attempt: number) => number {
    return (attempt: number) => {
      const delay = baseDelay + (increment * (attempt - 1));
      return Math.min(delay, maxDelay);
    };
  }

  static fixedDelay(delay: number = 1000): (attempt: number) => number {
    return () => delay;
  }

  static fibonacciBackoff(baseDelay: number = 1000, maxDelay: number = 30000): (attempt: number) => number {
    const fibonacci = (n: number): number => {
      if (n <= 1) return 1;
      let a = 1, b = 1;
      for (let i = 2; i <= n; i++) {
        [a, b] = [b, a + b];
      }
      return b;
    };

    return (attempt: number) => {
      const delay = baseDelay * fibonacci(attempt);
      return Math.min(delay, maxDelay);
    };
  }

  static customStrategy(strategyFn: (attempt: number, baseDelay: number) => number, baseDelay: number = 1000): (attempt: number) => number {
    return (attempt: number) => strategyFn(attempt, baseDelay);
  }

  static withJitter(strategy: (attempt: number) => number, jitterFactor: number = 0.1): (attempt: number) => number {
    return (attempt: number) => {
      const delay = strategy(attempt);
      const jitter = delay * jitterFactor * (Math.random() - 0.5) * 2;
      return Math.max(0, delay + jitter);
    };
  }

  static conditionalBackoff(
    normalStrategy: (attempt: number) => number,
    aggressiveStrategy: (attempt: number) => number,
    condition: (attempt: number, error?: any) => boolean
  ): (attempt: number, error?: any) => number {
    return (attempt: number, error?: any) => {
      return condition(attempt, error) 
        ? aggressiveStrategy(attempt)
        : normalStrategy(attempt);
    };
  }
}

export const CommonRetryConditions = {
  isNetworkError: (error: any): boolean => {
    return error.code === 'ENOTFOUND' || 
           error.code === 'ECONNRESET' || 
           error.code === 'ECONNREFUSED' ||
           error.code === 'ETIMEDOUT';
  },

  isServerError: (error: any): boolean => {
    return error.response?.status >= 500;
  },

  isRateLimited: (error: any): boolean => {
    return error.response?.status === 429;
  },

  isTimeout: (error: any): boolean => {
    return error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
  },

  isRetryableStatus: (statusCodes: number[]) => (error: any): boolean => {
    return error.response?.status && statusCodes.includes(error.response.status);
  },

  never: (): boolean => false,
  always: (): boolean => true,

  combine: (...conditions: Array<(error: any) => boolean>) => (error: any): boolean => {
    return conditions.some(condition => condition(error));
  }
};