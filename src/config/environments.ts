import { EnvironmentConfigs, Environment } from '../types/config';

export const defaultEnvironments: EnvironmentConfigs = {
  development: {
    baseURL: 'http://localhost:3000/api',
    timeout: 10000,
    headers: {
      'X-Environment': 'development'
    },
    auth: {
      autoRefresh: true,
      refreshThreshold: 300000, // 5 minutes
    },
    cache: {
      enabled: true,
      defaultTTL: 60000, // 1 minute for development
    },
    retry: {
      enabled: true,
      maxAttempts: 2, // Less aggressive retries in development
    },
    logging: {
      enabled: true,
      level: 'debug',
      logRequests: true,
      logResponses: true,
    }
  },
  staging: {
    baseURL: 'https://api-staging.example.com',
    timeout: 15000,
    headers: {
      'X-Environment': 'staging'
    },
    auth: {
      autoRefresh: true,
      refreshThreshold: 300000,
    },
    cache: {
      enabled: true,
      defaultTTL: 300000, // 5 minutes
    },
    retry: {
      enabled: true,
      maxAttempts: 3,
    },
    logging: {
      enabled: true,
      level: 'info',
      logRequests: true,
      logResponses: false, // Don't log response data in staging
    }
  },
  production: {
    baseURL: 'https://api.example.com',
    timeout: 30000,
    headers: {
      'X-Environment': 'production'
    },
    auth: {
      autoRefresh: true,
      refreshThreshold: 600000, // 10 minutes
    },
    cache: {
      enabled: true,
      defaultTTL: 900000, // 15 minutes
    },
    retry: {
      enabled: true,
      maxAttempts: 3,
      baseDelay: 2000, // Longer delays in production
    },
    logging: {
      enabled: true,
      level: 'warn', // Only warnings and errors in production
      logRequests: false,
      logResponses: false,
      logRetries: true,
      logAuth: true,
    }
  },
  test: {
    baseURL: 'http://localhost:3001/api',
    timeout: 5000,
    headers: {
      'X-Environment': 'test'
    },
    auth: {
      autoRefresh: false, // Disable auto-refresh in tests
    },
    cache: {
      enabled: false, // Disable cache in tests for predictability
    },
    retry: {
      enabled: false, // Disable retries in tests
    },
    logging: {
      enabled: false, // Disable logging in tests
    }
  }
};

export function getEnvironmentConfig(environment: Environment): EnvironmentConfigs[Environment] {
  return defaultEnvironments[environment];
}

export function detectEnvironment(): Environment {
  // Node.js environment detection
  if (typeof process !== 'undefined' && process.env) {
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    const customEnv = process.env.API_ENV?.toLowerCase();
    
    if (customEnv && ['development', 'staging', 'production', 'test'].includes(customEnv)) {
      return customEnv as Environment;
    }
    
    switch (nodeEnv) {
      case 'development':
      case 'dev':
        return 'development';
      case 'staging':
      case 'stage':
        return 'staging';
      case 'production':
      case 'prod':
        return 'production';
      case 'test':
      case 'testing':
        return 'test';
    }
  }

  // Browser environment detection
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return 'development';
    }
    
    if (hostname.includes('staging') || hostname.includes('stage')) {
      return 'staging';
    }
    
    if (hostname.includes('test')) {
      return 'test';
    }
    
    // Default to production for any other domain
    return 'production';
  }

  // Default fallback
  return 'production';
}

export function getEnvironmentVariable(key: string, defaultValue?: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
}

export function isEnvironment(env: Environment): boolean {
  return detectEnvironment() === env;
}

export function isDevelopment(): boolean {
  return isEnvironment('development');
}

export function isProduction(): boolean {
  return isEnvironment('production');
}

export function isStaging(): boolean {
  return isEnvironment('staging');
}

export function isTest(): boolean {
  return isEnvironment('test');
}