import { AxiosError } from 'axios';
import { ErrorCode, ErrorMessages, getErrorCodeFromStatus } from './error-codes';

export interface ErrorDetails {
  message: string;
  code: ErrorCode;
  status?: number;
  statusText?: string;
  data?: any;
  headers?: Record<string, string>;
  url?: string;
  method?: string;
  timestamp: number;
  requestId?: string;
  cause?: Error;
  retryAttempt?: number;
  isRetryable?: boolean;
}

export class BaseApiError extends Error {
  public readonly code: ErrorCode;
  public readonly status?: number;
  public readonly statusText?: string;
  public readonly data?: any;
  public readonly headers?: Record<string, string>;
  public readonly url?: string;
  public readonly method?: string;
  public readonly timestamp: number;
  public readonly requestId?: string;
  public readonly cause?: Error;
  public readonly retryAttempt?: number;
  public readonly isRetryable: boolean;

  constructor(details: ErrorDetails) {
    super(details.message);
    this.name = this.constructor.name;
    this.code = details.code;
    this.status = details.status;
    this.statusText = details.statusText;
    this.data = details.data;
    this.headers = details.headers;
    this.url = details.url;
    this.method = details.method;
    this.timestamp = details.timestamp;
    this.requestId = details.requestId;
    this.cause = details.cause;
    this.retryAttempt = details.retryAttempt;
    this.isRetryable = details.isRetryable ?? false;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      statusText: this.statusText,
      data: this.data,
      headers: this.headers,
      url: this.url,
      method: this.method,
      timestamp: this.timestamp,
      requestId: this.requestId,
      retryAttempt: this.retryAttempt,
      isRetryable: this.isRetryable,
      stack: this.stack
    };
  }
}

export class ApiError extends BaseApiError {
  constructor(details: Partial<ErrorDetails> & { message?: string; code?: ErrorCode }) {
    const errorDetails: ErrorDetails = {
      message: details.message || ErrorMessages[details.code || ErrorCode.API_ERROR],
      code: details.code || ErrorCode.API_ERROR,
      timestamp: Date.now(),
      isRetryable: false,
      ...details
    };
    super(errorDetails);
  }

  static fromAxiosError(error: AxiosError, requestId?: string): ApiError {
    const response = error.response;
    const code = response 
      ? getErrorCodeFromStatus(response.status)
      : error.code === 'ECONNABORTED' 
        ? ErrorCode.TIMEOUT_ERROR
        : ErrorCode.NETWORK_ERROR;

    return new ApiError({
      message: (response?.data as any)?.message || error.message || ErrorMessages[code] || 'Unknown error',
      code,
      status: response?.status,
      statusText: response?.statusText,
      data: response?.data,
      headers: response?.headers as Record<string, string>,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      requestId,
      cause: error,
      isRetryable: !!(code === ErrorCode.NETWORK_ERROR || 
                   code === ErrorCode.TIMEOUT_ERROR ||
                   code === ErrorCode.SERVICE_UNAVAILABLE ||
                   (response?.status && response.status >= 500))
    });
  }
}

export class NetworkError extends BaseApiError {
  constructor(message: string, cause?: Error, requestId?: string) {
    super({
      message,
      code: ErrorCode.NETWORK_ERROR,
      timestamp: Date.now(),
      requestId,
      cause,
      isRetryable: true
    });
  }
}

export class AuthError extends BaseApiError {
  constructor(
    message: string, 
    code: ErrorCode = ErrorCode.AUTH_ERROR, 
    status?: number,
    requestId?: string
  ) {
    super({
      message,
      code,
      status: status ?? undefined,
      timestamp: Date.now(),
      requestId: requestId ?? undefined,
      isRetryable: false
    });
  }
}

export class ValidationError extends BaseApiError {
  public readonly field?: string;
  public readonly value?: any;

  constructor(
    message: string, 
    field?: string, 
    value?: any,
    code: ErrorCode = ErrorCode.VALIDATION_ERROR
  ) {
    super({
      message,
      code,
      timestamp: Date.now(),
      isRetryable: false
    });
    this.field = field;
    this.value = value;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      field: this.field,
      value: this.value
    };
  }
}

export class ConfigError extends BaseApiError {
  constructor(message: string, cause?: Error) {
    super({
      message,
      code: ErrorCode.CONFIG_ERROR,
      timestamp: Date.now(),
      cause: cause ?? undefined,
      isRetryable: false
    });
  }
}

export class CacheError extends BaseApiError {
  constructor(message: string, cause?: Error) {
    super({
      message,
      code: ErrorCode.CACHE_ERROR,
      timestamp: Date.now(),
      cause: cause ?? undefined,
      isRetryable: false
    });
  }
}

export class RetryExhaustedError extends BaseApiError {
  public readonly attempts: number;
  public readonly lastError: Error;

  constructor(attempts: number, lastError: Error, requestId?: string) {
    super({
      message: attempts === 1 
        ? `Request failed on first attempt: ${lastError.message}`
        : `Request failed after ${attempts - 1} retry attempts: ${lastError.message}`,
      code: ErrorCode.RETRY_EXHAUSTED,
      timestamp: Date.now(),
      requestId: requestId ?? undefined,
      cause: lastError,
      isRetryable: false
    });
    this.attempts = attempts;
    this.lastError = lastError;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      attempts: this.attempts,
      lastError: this.lastError.message
    };
  }
}