// Main exports
export { ApiClient } from './client';

// Types
export * from './types';

// Errors
export * from './errors';

// Managers
export { AuthManager } from './auth/auth-manager';
export { CacheManager } from './cache/cache-manager';
export { RetryManager } from './retry/retry-manager';
export { DeduplicationManager } from './deduplication/deduplication-manager';
export { Logger, createLogger } from './logging/logger';

// Strategies and utilities
export { RetryStrategies, CommonRetryConditions } from './retry/strategies';
export { ConfigValidator, RequestValidator } from './utils/validators';
export * from './utils/helpers';

// Configuration
export { defaultConfig } from './config/defaults';
export { 
  defaultEnvironments, 
  getEnvironmentConfig, 
  detectEnvironment,
  isEnvironment,
  isDevelopment,
  isProduction,
  isStaging,
  isTest
} from './config/environments';

// Default export
import { ApiClient } from './client';
export default ApiClient;