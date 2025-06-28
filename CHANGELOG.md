# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added

#### Core Features
- **ApiClient**: Main client class with full HTTP method support (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- **TypeScript Support**: Complete TypeScript definitions with comprehensive type safety
- **Environment Detection**: Automatic environment detection and configuration

#### Authentication System
- **Token Management**: Automatic access and refresh token handling
- **Storage Options**: Support for localStorage, sessionStorage, memory, and custom storage adapters
- **Auto-refresh**: Configurable automatic token refresh with threshold settings
- **Login/Logout**: Built-in authentication methods
- **JWT Support**: Automatic JWT token parsing and expiration detection

#### Caching System
- **In-memory Cache**: Fast in-memory caching with TTL support
- **Custom Adapters**: Support for custom cache adapters (Redis, etc.)
- **Cache Statistics**: Detailed cache hit/miss statistics
- **Selective Caching**: Per-request cache control options
- **Cache Invalidation**: Pattern-based cache invalidation

#### Retry Logic
- **Exponential Backoff**: Configurable exponential backoff strategy
- **Custom Strategies**: Support for linear, fixed, and custom retry strategies
- **Retry Conditions**: Configurable conditions for when to retry requests
- **Jitter Support**: Optional jitter to prevent thundering herd problems
- **Retry Statistics**: Detailed retry attempt tracking

#### Error Handling
- **Custom Error Classes**: Specific error types for different scenarios
  - `ApiError`: General API errors with detailed context
  - `NetworkError`: Network connectivity issues
  - `AuthError`: Authentication and authorization errors
  - `ValidationError`: Request validation errors
  - `ConfigError`: Configuration errors
  - `CacheError`: Cache operation errors
  - `RetryExhaustedError`: Retry limit exceeded errors
- **Error Codes**: Standardized error codes for consistent error handling
- **Error Context**: Rich error information including request details, timing, and metadata

#### Logging System
- **Configurable Levels**: Support for error, warn, info, debug, and trace levels
- **Multiple Targets**: Console logging with optional custom adapters
- **Request/Response Logging**: Detailed logging of HTTP requests and responses
- **Sensitive Data Protection**: Automatic redaction of sensitive fields
- **Performance Metrics**: Request timing and performance logging

#### Interceptors
- **Request Interceptors**: 
  - Authentication token injection
  - Request validation
  - Custom headers
  - Request metadata tracking
- **Response Interceptors**:
  - Response transformation
  - Cache management
  - Error transformation
  - Rate limit handling

#### Environment Support
- **Multiple Environments**: Built-in configurations for development, staging, production, and test
- **Automatic Detection**: Smart environment detection from NODE_ENV or hostname
- **Custom Configurations**: Support for custom environment configurations
- **Override Support**: Easy configuration overrides per environment

#### Developer Experience
- **Comprehensive Examples**: Real-world usage examples for all features
- **TypeScript IntelliSense**: Full IDE support with type hints and autocompletion
- **Detailed Documentation**: Extensive API documentation and guides
- **Error Messages**: Clear, actionable error messages

### Technical Details

#### Dependencies
- **Axios**: HTTP client library (peer dependency)
- **Zero Runtime Dependencies**: No additional dependencies for minimal bundle size

#### Browser Support
- **Modern Browsers**: Support for ES2020+ browsers
- **Node.js**: Support for Node.js 16+

#### Build System
- **TypeScript Compilation**: ES2020 target with CommonJS output
- **Declaration Files**: Complete .d.ts files for TypeScript support
- **Source Maps**: Full source map support for debugging
- **Tree Shaking**: Optimized for tree shaking to reduce bundle size

#### Testing
- **Jest Setup**: Complete Jest testing configuration
- **Test Utilities**: Helper functions for testing HTTP interactions

### Breaking Changes
- None (initial release)

### Migration Guide
- None (initial release)

---

## [Unreleased]

### Planned Features
- WebSocket support
- GraphQL client integration
- Request batching
- Offline request queuing
- React hooks integration
- Metrics and monitoring integration
- Performance optimizations
- Enhanced TypeScript strict mode support

---

**Note**: This project follows [Semantic Versioning](https://semver.org/). The API is considered stable as of version 1.0.0.