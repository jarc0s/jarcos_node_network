import { 
  LoggerConfig, 
  LoggerAdapter, 
  LogLevel, 
  LogEntry, 
  RequestLogData, 
  ResponseLogData, 
  ErrorLogData 
} from '../types/logging';

const LOG_LEVELS: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  trace: 4
};

const LOG_COLORS: Record<LogLevel, string> = {
  error: '\x1b[31m', // Red
  warn: '\x1b[33m',  // Yellow
  info: '\x1b[36m',  // Cyan
  debug: '\x1b[32m', // Green
  trace: '\x1b[35m'  // Magenta
};

const RESET_COLOR = '\x1b[0m';

export class Logger {
  private config: Required<LoggerConfig>;
  private adapter: LoggerAdapter;

  constructor(config: LoggerConfig = {}) {
    this.config = {
      enabled: true,
      level: 'info',
      prefix: '[API]',
      timestamp: true,
      colorize: true,
      prettyPrint: true,
      adapter: undefined as any,
      logRequests: true,
      logResponses: true,
      logErrors: true,
      logRetries: true,
      logCache: true,
      logAuth: true,
      sensitiveFields: ['password', 'token', 'authorization', 'cookie', 'x-api-key'],
      maxLogLength: 1000,
      ...config
    };

    this.adapter = this.config.adapter ?? new ConsoleLoggerAdapter(this.config);
  }

  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  trace(message: string, meta?: any): void {
    this.log('trace', message, meta);
  }

  logRequest(data: RequestLogData): void {
    if (!this.config.logRequests || !this.shouldLog('debug')) return;

    const sanitizedData = this.sanitizeData(data);
    this.debug(`→ ${data.method} ${data.url}`, {
      type: 'request',
      ...sanitizedData
    });
  }

  logResponse(data: ResponseLogData): void {
    if (!this.config.logResponses || !this.shouldLog('debug')) return;

    const sanitizedData = this.sanitizeData(data);
    const fromCache = data.fromCache ? ' (cached)' : '';
    
    this.debug(`← ${data.status} ${data.statusText}${fromCache} [${data.duration}ms]`, {
      type: 'response',
      ...sanitizedData
    });
  }

  logError(data: ErrorLogData): void {
    if (!this.config.logErrors || !this.shouldLog('error')) return;

    const sanitizedData = this.sanitizeData(data);
    
    this.error(`✗ Request failed: ${data.error.message}`, {
      type: 'error',
      ...sanitizedData
    });
  }

  logRetry(attempt: number, maxAttempts: number, delay: number, error: Error): void {
    if (!this.config.logRetries || !this.shouldLog('warn')) return;

    this.warn(`↻ Retry attempt ${attempt}/${maxAttempts} in ${delay}ms: ${error.message}`, {
      type: 'retry',
      attempt,
      maxAttempts,
      delay,
      error: error.message
    });
  }

  logCacheHit(key: string, data?: any): void {
    if (!this.config.logCache || !this.shouldLog('debug')) return;

    this.debug(`⚡ Cache hit: ${key}`, {
      type: 'cache-hit',
      key,
      hasData: !!data
    });
  }

  logCacheMiss(key: string): void {
    if (!this.config.logCache || !this.shouldLog('debug')) return;

    this.debug(`○ Cache miss: ${key}`, {
      type: 'cache-miss',
      key
    });
  }

  logCacheSet(key: string, ttl: number): void {
    if (!this.config.logCache || !this.shouldLog('trace')) return;

    this.trace(`💾 Cache set: ${key} (TTL: ${ttl}ms)`, {
      type: 'cache-set',
      key,
      ttl
    });
  }

  logAuth(event: string, details?: any): void {
    if (!this.config.logAuth || !this.shouldLog('info')) return;

    const sanitizedDetails = details ? this.sanitizeData(details) : undefined;
    
    this.info(`🔐 Auth: ${event}`, {
      type: 'auth',
      event,
      ...sanitizedDetails
    });
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    if (!this.config.enabled || !this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message: this.truncateMessage(message),
      timestamp: Date.now(),
      meta: meta ? this.sanitizeData(meta) : undefined
    };

    this.adapter[level](this.formatMessage(entry), entry.meta);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.config.level];
  }

  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];

    if (this.config.timestamp) {
      const timestamp = new Date(entry.timestamp).toISOString();
      parts.push(`[${timestamp}]`);
    }

    if (this.config.prefix) {
      parts.push(this.config.prefix);
    }

    const levelText = `[${entry.level.toUpperCase()}]`;
    if (this.config.colorize && typeof window === 'undefined') {
      const colorCode = LOG_COLORS[entry.level];
      parts.push(`${colorCode}${levelText}${RESET_COLOR}`);
    } else {
      parts.push(levelText);
    }

    parts.push(entry.message);

    return parts.join(' ');
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = Array.isArray(data) ? [...data] : { ...data };

    const sanitizeValue = (obj: any, key: string): void => {
      if (this.config.sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase())
      )) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        obj[key] = this.sanitizeData(obj[key]);
      }
    };

    if (Array.isArray(sanitized)) {
      sanitized.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          sanitized[index] = this.sanitizeData(item);
        }
      });
    } else {
      Object.keys(sanitized).forEach(key => {
        sanitizeValue(sanitized, key);
      });
    }

    return sanitized;
  }

  private truncateMessage(message: string): string {
    if (message.length <= this.config.maxLogLength) return message;
    return message.substring(0, this.config.maxLogLength) + '...';
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
  }
}

class ConsoleLoggerAdapter implements LoggerAdapter {
  constructor(private config: LoggerConfig) {}

  error(message: string, meta?: any): void {
    if (this.config.prettyPrint && meta) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  }

  warn(message: string, meta?: any): void {
    if (this.config.prettyPrint && meta) {
      console.warn(message, meta);
    } else {
      console.warn(message);
    }
  }

  info(message: string, meta?: any): void {
    if (this.config.prettyPrint && meta) {
      console.info(message, meta);
    } else {
      console.info(message);
    }
  }

  debug(message: string, meta?: any): void {
    if (this.config.prettyPrint && meta) {
      console.debug(message, meta);
    } else {
      console.debug(message);
    }
  }

  trace(message: string, meta?: any): void {
    if (this.config.prettyPrint && meta) {
      console.trace(message, meta);
    } else {
      console.trace(message);
    }
  }
}

export function createLogger(config: LoggerConfig = {}): Logger {
  return new Logger(config);
}