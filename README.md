# API Service Library

A comprehensive, production-ready REST API client library for Node.js and Next.js with built-in authentication, caching, retry logic, and comprehensive error handling.

## 🚀 Features

- **🔐 Authentication Management**: Automatic token handling, refresh, and storage
- **💾 Smart Caching**: Configurable in-memory caching with TTL support
- **🔄 Retry Logic**: Exponential backoff with configurable retry strategies
- **📝 Comprehensive Logging**: Configurable logging with multiple levels
- **🛡️ Error Handling**: Custom error classes with detailed information
- **🔌 Interceptors**: Request/response interceptors for customization
- **🌍 Environment Support**: Built-in environment configurations
- **📊 TypeScript**: Full TypeScript support with comprehensive types
- **🏗️ Tree Shakable**: Import only what you need
- **🧪 Zero Dependencies**: Only Axios as peer dependency

## 📦 Installation

### From GitHub (Recommended)

```bash
npm install git+https://github.com/jarc0s/jarcos_node_network.git
```

### Install Peer Dependencies

```bash
npm install axios
```

### Verify Installation

```bash
# Run a quick test
node -e "const { ApiClient } = require('@jarcos/api-service-library'); console.log('✅ Library loaded successfully!');"
```

### For TypeScript Projects

The library includes complete TypeScript definitions. No additional @types packages needed!

### For Development/Contributing

```bash
git clone https://github.com/jarc0s/jarcos_node_network.git
cd jarcos_node_network
npm install
npm run build
npm run demo  # Run all examples
```

## 🏁 Quick Start

### Basic Usage

```typescript
import { ApiClient } from 'api-service-library';

const api = new ApiClient({
  baseURL: 'https://api.example.com',
  timeout: 30000
});

// Make requests
const users = await api.get('/users');
const newUser = await api.post('/users', { name: 'John', email: 'john@example.com' });
```

### With Authentication

```typescript
import { ApiClient } from 'api-service-library';

const api = new ApiClient({
  baseURL: 'https://api.example.com',
  auth: {
    enabled: true,
    tokenStorage: 'localStorage',
    loginEndpoint: '/auth/login',
    refreshEndpoint: '/auth/refresh',
    autoRefresh: true
  }
});

// Login
await api.login({ email: 'user@example.com', password: 'password' });

// Authenticated requests (token added automatically)
const profile = await api.get('/profile');
```

### With Caching

```typescript
const api = new ApiClient({
  baseURL: 'https://api.example.com',
  cache: {
    enabled: true,
    defaultTTL: 300000, // 5 minutes
    maxSize: 1000
  }
});

// First request - hits API
const data1 = await api.get('/data');

// Second request - served from cache
const data2 = await api.get('/data'); // Much faster!
```

### With Retry Logic

```typescript
const api = new ApiClient({
  baseURL: 'https://api.example.com',
  retry: {
    enabled: true,
    maxAttempts: 3,
    backoffFactor: 2,
    baseDelay: 1000
  }
});

// Will automatically retry on network errors or 5xx responses
const data = await api.get('/unstable-endpoint');
```

## 📚 API Reference

### ApiClient Constructor

```typescript
new ApiClient(config?: Partial<ApiClientConfig>)
```

#### Configuration Options

```typescript
interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  environment?: 'development' | 'staging' | 'production' | 'test';
  headers?: Record<string, string>;
  
  auth?: {
    enabled?: boolean;
    tokenStorage?: 'localStorage' | 'sessionStorage' | 'memory' | 'custom';
    tokenKey?: string;
    refreshTokenKey?: string;
    loginEndpoint?: string;
    refreshEndpoint?: string;
    autoRefresh?: boolean;
    refreshThreshold?: number;
  };
  
  cache?: {
    enabled?: boolean;
    defaultTTL?: number;
    maxSize?: number;
    keyPrefix?: string;
  };
  
  retry?: {
    enabled?: boolean;
    maxAttempts?: number;
    backoffFactor?: number;
    baseDelay?: number;
    maxDelay?: number;
  };
  
  logging?: {
    enabled?: boolean;
    level?: 'error' | 'warn' | 'info' | 'debug' | 'trace';
    logRequests?: boolean;
    logResponses?: boolean;
    logErrors?: boolean;
  };
}
```

### HTTP Methods

```typescript
// GET request
api.get<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>

// POST request
api.post<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>>

// PUT request
api.put<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>>

// PATCH request
api.patch<T>(url: string, data?: any, config?: ApiRequestConfig): Promise<ApiResponse<T>>

// DELETE request
api.delete<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>
```

### Request Configuration

```typescript
interface ApiRequestConfig {
  // Standard Axios options
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  
  // Library-specific options
  cache?: {
    enabled?: boolean;
    ttl?: number;
    key?: string;
  };
  retry?: {
    enabled?: boolean;
    maxAttempts?: number;
  };
  skipAuth?: boolean;
  skipCache?: boolean;
  skipRetry?: boolean;
  skipLogging?: boolean;
}
```

### Authentication Methods

```typescript
// Login
api.login(credentials: LoginCredentials): Promise<AuthResponse>

// Logout
api.logout(): Promise<void>

// Refresh token
api.refreshToken(): Promise<string>
```

### Cache Methods

```typescript
// Get cache statistics
api.getCacheStats(): CacheStats

// Invalidate cache by pattern
api.invalidateCache(pattern?: string): Promise<number>
```

### Utility Methods

```typescript
// Get retry statistics
api.getRetryStats(): RetryStats

// Update configuration
api.updateConfig(newConfig: Partial<ApiClientConfig>): void

// Get current configuration
api.getConfig(): ApiClientConfig

// Health check
api.healthCheck(): Promise<{ status: 'ok' | 'error'; details: any }>
```

## 🔧 Advanced Usage

### Custom Error Handling

```typescript
import { ApiError, ErrorCode } from 'api-service-library';

try {
  await api.get('/data');
} catch (error) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case ErrorCode.NOT_FOUND:
        console.log('Resource not found');
        break;
      case ErrorCode.UNAUTHORIZED:
        console.log('Authentication required');
        break;
      case ErrorCode.RATE_LIMITED:
        console.log('Rate limit exceeded');
        break;
      default:
        console.log(`API error: ${error.message}`);
    }
  }
}
```

### Custom Cache Adapter

```typescript
class RedisCacheAdapter implements CacheAdapter {
  async get(key: string) {
    // Your Redis implementation
  }
  
  async set(key: string, value: any, ttl?: number) {
    // Your Redis implementation
  }
  
  // ... other methods
}

const api = new ApiClient({
  cache: {
    enabled: true,
    adapter: new RedisCacheAdapter()
  }
});
```

### Environment Configuration

```typescript
// Automatic environment detection
const api = new ApiClient(); // Detects from NODE_ENV or hostname

// Manual environment
const api = new ApiClient({
  environment: 'production'
});

// Custom environment config
const api = new ApiClient({
  baseURL: process.env.NODE_ENV === 'production' 
    ? 'https://api.example.com' 
    : 'http://localhost:3000/api'
});
```

### Request Interception

```typescript
// Access the underlying Axios instance for custom interceptors
const axiosInstance = api.getAxiosInstance();

axiosInstance.interceptors.request.use(config => {
  // Custom request modification
  return config;
});
```

## 🌍 Environment Support

The library automatically detects and configures for different environments:

- **Development**: Enhanced logging, shorter cache TTL, fewer retries
- **Staging**: Balanced configuration for testing
- **Production**: Optimized for performance and reliability
- **Test**: Minimal logging, no cache, no retries

## 📖 Examples

Check out the [examples](./examples/) directory for comprehensive usage examples:

- [Basic Usage](./examples/basic-usage.ts)
- [Authentication](./examples/with-auth.ts)
- [Caching](./examples/with-cache.ts)
- [Error Handling](./examples/error-handling.ts)

Run examples:

```bash
npm run example:basic
npm run example:auth
npm run example:cache
npm run example:errors
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 🏗️ Building

```bash
# Build the library
npm run build

# Build in watch mode
npm run dev

# Clean build artifacts
npm run clean
```

## 📝 Logging

The library provides comprehensive logging with configurable levels:

```typescript
const api = new ApiClient({
  logging: {
    enabled: true,
    level: 'debug',
    logRequests: true,
    logResponses: true,
    logErrors: true,
    logRetries: true,
    logCache: true,
    logAuth: true
  }
});
```

Log levels (in order of verbosity):
- `error`: Only errors
- `warn`: Warnings and errors
- `info`: General information, warnings, and errors
- `debug`: Detailed debugging information
- `trace`: Very detailed tracing information

## 🔒 Security

- Sensitive fields are automatically redacted from logs
- Tokens are stored securely based on storage type
- HTTPS is enforced in production environments
- Request/response data sanitization

## 🚀 Performance

- Tree-shakable exports for minimal bundle size
- Efficient caching with automatic cleanup
- Request deduplication for concurrent identical requests
- Optimized retry strategies with jitter

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔮 Roadmap

- [ ] WebSocket support
- [ ] GraphQL support
- [ ] Request/response transformers
- [ ] Metrics and monitoring integration
- [ ] Request batching
- [ ] Offline support
- [ ] React hooks integration

## 💬 Support

If you have questions or need help, please:

1. Check the [examples](./examples/) directory
2. Read the [API documentation](#-api-reference)
3. Open an [issue](https://github.com/yourusername/api-service-library/issues)

---

Made with ❤️ by [jarc0s](https://github.com/jarc0s)