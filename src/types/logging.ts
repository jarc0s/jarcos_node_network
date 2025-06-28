export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerConfig {
  enabled?: boolean;
  level?: LogLevel;
  prefix?: string;
  timestamp?: boolean;
  colorize?: boolean;
  prettyPrint?: boolean;
  adapter?: LoggerAdapter;
  logRequests?: boolean;
  logResponses?: boolean;
  logErrors?: boolean;
  logRetries?: boolean;
  logCache?: boolean;
  logAuth?: boolean;
  sensitiveFields?: string[];
  maxLogLength?: number;
}

export interface LoggerAdapter {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  trace(message: string, meta?: any): void;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  meta?: any;
  module?: string;
  requestId?: string;
}

export interface RequestLogData {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: any;
  timestamp: number;
  requestId: string;
}

export interface ResponseLogData {
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  data?: any;
  duration: number;
  timestamp: number;
  requestId: string;
  fromCache?: boolean;
}

export interface ErrorLogData {
  error: Error;
  request?: RequestLogData;
  response?: ResponseLogData;
  timestamp: number;
  requestId: string;
}

export interface LoggerEvents {
  'log:entry': { entry: LogEntry };
  'log:request': { data: RequestLogData };
  'log:response': { data: ResponseLogData };
  'log:error': { data: ErrorLogData };
}