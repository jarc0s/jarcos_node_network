import { AxiosError, AxiosResponse } from 'axios';
import { AuthManager } from '../auth/auth-manager';
import { Logger } from '../logging/logger';
import { AuthError, ErrorCode } from '../errors';
import { ResponseInterceptor } from '../types/api';

export class AuthInterceptors {
  private refreshPromises = new Map<string, Promise<AxiosResponse>>();

  constructor(
    private authManager: AuthManager,
    private logger: Logger,
    private axiosInstance: any // Will be the actual axios instance
  ) {}

  createAuthResponseInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: (response: AxiosResponse) => {
        // Clear any pending refresh promises on successful response
        const config = response.config as any;
        const requestId = config.metadata?.requestId;
        if (requestId && this.refreshPromises.has(requestId)) {
          this.refreshPromises.delete(requestId);
        }

        return response;
      },
      onRejected: async (error: AxiosError) => {
        const originalRequest = error.config as any;
        const status = error.response?.status;

        // Handle authentication errors
        if (status === 401 && !originalRequest._retry) {
          return this.handleUnauthorized(error, originalRequest);
        }

        // Handle forbidden errors
        if (status === 403) {
          this.logger.logAuth('access_forbidden', {
            url: originalRequest?.url,
            method: originalRequest?.method
          });
        }

        return Promise.reject(error);
      }
    };
  }

  private async handleUnauthorized(error: AxiosError, originalRequest: any): Promise<AxiosResponse> {
    if (!this.authManager.isEnabled()) {
      return Promise.reject(error);
    }

    const requestId = originalRequest.metadata?.requestId || 'unknown';

    // Check if this request is already being retried
    if (originalRequest._retry) {
      this.logger.logAuth('token_refresh_failed_retry', { requestId });
      await this.authManager.clearTokens();
      return Promise.reject(new AuthError(
        'Authentication failed after token refresh',
        ErrorCode.TOKEN_EXPIRED
      ));
    }

    // Check if we're already refreshing for this request
    if (this.refreshPromises.has(requestId)) {
      try {
        return await this.refreshPromises.get(requestId)!;
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    // Mark request as being retried
    originalRequest._retry = true;

    try {
      this.logger.logAuth('token_refresh_attempt', { requestId });

      // Create refresh promise
      const refreshPromise = this.performTokenRefreshAndRetry(originalRequest, requestId);
      this.refreshPromises.set(requestId, refreshPromise);

      const result = await refreshPromise;
      this.refreshPromises.delete(requestId);
      
      return result;
    } catch (refreshError: any) {
      this.refreshPromises.delete(requestId);
      this.logger.logAuth('token_refresh_failed', { 
        requestId, 
        error: refreshError.message 
      });

      // Clear tokens on refresh failure
      await this.authManager.clearTokens();

      // Return original 401 error or refresh error
      return Promise.reject(refreshError instanceof AuthError ? refreshError : error);
    }
  }

  private async performTokenRefreshAndRetry(originalRequest: any, requestId: string): Promise<AxiosResponse> {
    try {
      // Attempt to refresh the token
      const newToken = await this.authManager.refreshToken();
      
      this.logger.logAuth('token_refreshed', { requestId });

      // Update the original request with new token
      const authHeader = this.authManager.getAuthHeader();
      const bearerPrefix = this.authManager.getBearerPrefix();
      
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers[authHeader] = `${bearerPrefix} ${newToken}`;

      // Retry the original request (skip retry manager to avoid duplicate requests)
      originalRequest.skipRetry = true;
      return await this.axiosInstance(originalRequest);
    } catch (error: any) {
      throw new AuthError(
        'Failed to refresh authentication token',
        ErrorCode.REFRESH_TOKEN_EXPIRED
      );
    }
  }

  createTokenExpirationInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: (response: AxiosResponse) => {
        // Check for token expiration warnings in response headers
        const tokenExpiresIn = response.headers['x-token-expires-in'];
        if (tokenExpiresIn && parseInt(tokenExpiresIn) < 300) { // 5 minutes
          this.logger.logAuth('token_expiring_soon', {
            expiresIn: tokenExpiresIn
          });
        }

        return response;
      },
      onRejected: (error: AxiosError) => {
        // Check for specific token expiration messages
        const errorData = error.response?.data as any;
        if (errorData?.code === 'TOKEN_EXPIRED' || 
            errorData?.message?.toLowerCase().includes('token expired')) {
          this.logger.logAuth('token_expired_response', {
            status: error.response?.status,
            message: errorData?.message
          });
        }

        return Promise.reject(error);
      }
    };
  }

  createLogoutInterceptor(): ResponseInterceptor {
    return {
      onFulfilled: (response: AxiosResponse) => {
        // Check if this was a logout request
        const config = response.config as any;
        if (config.url?.includes('/logout') || config.url?.includes('/auth/logout')) {
          this.logger.logAuth('logout_success');
          // Don't clear tokens here as AuthManager.logout() handles it
        }

        return response;
      },
      onRejected: (error: AxiosError) => {
        const config = error.config as any;
        if (config?.url?.includes('/logout') || config?.url?.includes('/auth/logout')) {
          this.logger.logAuth('logout_failed', {
            status: error.response?.status,
            message: error.message
          });
          // Clear tokens anyway on logout endpoint errors
          this.authManager.clearTokens().catch(() => {
            // Ignore cleanup errors
          });
        }

        return Promise.reject(error);
      }
    };
  }
}