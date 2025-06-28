export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  DNS_ERROR = 'DNS_ERROR',
  
  // Authentication errors
  AUTH_ERROR = 'AUTH_ERROR',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_VALUE = 'INVALID_VALUE',
  
  // API errors
  API_ERROR = 'API_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Client errors
  CONFIG_ERROR = 'CONFIG_ERROR',
  CACHE_ERROR = 'CACHE_ERROR',
  RETRY_EXHAUSTED = 'RETRY_EXHAUSTED',
  REQUEST_CANCELLED = 'REQUEST_CANCELLED',
  
  // Unknown
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export const ErrorMessages: Record<ErrorCode, string> = {
  [ErrorCode.NETWORK_ERROR]: 'Network connection failed',
  [ErrorCode.TIMEOUT_ERROR]: 'Request timed out',
  [ErrorCode.CONNECTION_ERROR]: 'Unable to connect to server',
  [ErrorCode.DNS_ERROR]: 'DNS resolution failed',
  
  [ErrorCode.AUTH_ERROR]: 'Authentication failed',
  [ErrorCode.TOKEN_EXPIRED]: 'Access token has expired',
  [ErrorCode.TOKEN_INVALID]: 'Invalid access token',
  [ErrorCode.REFRESH_TOKEN_EXPIRED]: 'Refresh token has expired',
  [ErrorCode.UNAUTHORIZED]: 'Access denied - authentication required',
  [ErrorCode.FORBIDDEN]: 'Access denied - insufficient permissions',
  
  [ErrorCode.VALIDATION_ERROR]: 'Request validation failed',
  [ErrorCode.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ErrorCode.INVALID_FORMAT]: 'Invalid data format',
  [ErrorCode.INVALID_VALUE]: 'Invalid field value',
  
  [ErrorCode.API_ERROR]: 'API request failed',
  [ErrorCode.BAD_REQUEST]: 'Invalid request parameters',
  [ErrorCode.NOT_FOUND]: 'Resource not found',
  [ErrorCode.METHOD_NOT_ALLOWED]: 'HTTP method not allowed',
  [ErrorCode.CONFLICT]: 'Resource conflict',
  [ErrorCode.RATE_LIMITED]: 'Too many requests - rate limit exceeded',
  [ErrorCode.SERVER_ERROR]: 'Internal server error',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  
  [ErrorCode.CONFIG_ERROR]: 'Invalid configuration',
  [ErrorCode.CACHE_ERROR]: 'Cache operation failed',
  [ErrorCode.RETRY_EXHAUSTED]: 'Maximum retry attempts exceeded',
  [ErrorCode.REQUEST_CANCELLED]: 'Request was cancelled',
  
  [ErrorCode.UNKNOWN_ERROR]: 'An unknown error occurred'
};

export function getErrorCodeFromStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return ErrorCode.BAD_REQUEST;
    case 401:
      return ErrorCode.UNAUTHORIZED;
    case 403:
      return ErrorCode.FORBIDDEN;
    case 404:
      return ErrorCode.NOT_FOUND;
    case 405:
      return ErrorCode.METHOD_NOT_ALLOWED;
    case 409:
      return ErrorCode.CONFLICT;
    case 429:
      return ErrorCode.RATE_LIMITED;
    case 500:
      return ErrorCode.SERVER_ERROR;
    case 502:
    case 503:
    case 504:
      return ErrorCode.SERVICE_UNAVAILABLE;
    default:
      if (status >= 400 && status < 500) {
        return ErrorCode.API_ERROR;
      } else if (status >= 500) {
        return ErrorCode.SERVER_ERROR;
      }
      return ErrorCode.UNKNOWN_ERROR;
  }
}