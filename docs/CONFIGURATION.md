# 🔧 Guía Completa de Configuración - JarcOs Network

## 📋 Índice

- [🌍 Configuración General](#-configuración-general)
- [🔐 Autenticación](#-autenticación)
- [💾 Cache](#-cache)
- [🔄 Reintentos](#-reintentos)
- [📝 Logging](#-logging)
- [🔀 Deduplicación](#-deduplicación)
- [🌐 Ambientes](#-ambientes)
- [⚙️ Configuración Avanzada](#️-configuración-avanzada)
- [📚 Ejemplos Prácticos](#-ejemplos-prácticos)

---

## 🌍 Configuración General

### Estructura Básica

```typescript
import { ApiClient } from '@jarc0s/jarcos-node-network';

const client = new ApiClient({
  // Configuración básica
  baseURL: 'https://api.ejemplo.com',
  timeout: 30000,
  environment: 'production',
  
  // Headers globales
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-API-Version': 'v1'
  },
  
  // Configuraciones específicas
  auth: { /* ... */ },
  cache: { /* ... */ },
  retry: { /* ... */ },
  logging: { /* ... */ },
  deduplication: { /* ... */ }
});
```

### Opciones Básicas

| Opción | Tipo | Defecto | Descripción |
|--------|------|---------|-------------|
| `baseURL` | `string` | `''` | URL base para todas las peticiones |
| `timeout` | `number` | `30000` | Timeout en milisegundos |
| `environment` | `'development' \| 'staging' \| 'production' \| 'test'` | `'production'` | Ambiente de ejecución |
| `headers` | `Record<string, string>` | `{}` | Headers globales |
| `enableInterceptors` | `boolean` | `true` | Habilitar interceptores |
| `maxRedirects` | `number` | `5` | Máximo número de redirects |
| `validateStatus` | `(status: number) => boolean` | `status >= 200 && status < 300` | Validación de status HTTP |

---

## 🔐 Autenticación

### Configuración Completa

```typescript
const client = new ApiClient({
  auth: {
    enabled: true,
    
    // Almacenamiento de tokens
    tokenStorage: 'memory', // 'localStorage' | 'sessionStorage' | 'memory' | 'custom'
    tokenKey: 'api_access_token',
    refreshTokenKey: 'api_refresh_token',
    
    // Endpoints
    loginEndpoint: '/auth/login',
    refreshEndpoint: '/auth/refresh',
    logoutEndpoint: '/auth/logout',
    
    // Comportamiento
    autoRefresh: true,
    refreshThreshold: 300000, // 5 minutos antes de expirar
    refreshOnStart: false,
    
    // Headers
    tokenHeader: 'Authorization',
    bearerPrefix: 'Bearer'
  }
});
```

### Opciones de Autenticación

| Opción | Tipo | Defecto | Descripción |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Habilitar autenticación |
| `tokenStorage` | `TokenStorage` | `'memory'` | Dónde almacenar tokens |
| `tokenKey` | `string` | `'api_access_token'` | Clave para access token |
| `refreshTokenKey` | `string` | `'api_refresh_token'` | Clave para refresh token |
| `loginEndpoint` | `string` | `'/auth/login'` | Endpoint de login |
| `refreshEndpoint` | `string` | `'/auth/refresh'` | Endpoint de refresh |
| `logoutEndpoint` | `string` | `'/auth/logout'` | Endpoint de logout |
| `autoRefresh` | `boolean` | `true` | Refresh automático de tokens |
| `refreshThreshold` | `number` | `300000` | Tiempo antes de expirar (ms) |
| `bearerPrefix` | `string` | `'Bearer'` | Prefijo del token |
| `tokenHeader` | `string` | `'Authorization'` | Header para el token |

### Almacenamiento Personalizado

```typescript
class CustomTokenStorage implements TokenStorageAdapter {
  async getToken(): Promise<string | null> {
    // Tu lógica personalizada
    return localStorage.getItem('custom_token');
  }
  
  async setToken(token: string): Promise<void> {
    localStorage.setItem('custom_token', token);
  }
  
  // ... otros métodos
}

const client = new ApiClient({
  auth: {
    enabled: true,
    tokenStorage: 'custom',
    customTokenStorage: new CustomTokenStorage()
  }
});
```

### Uso Práctico

```typescript
// Login
const authResponse = await client.login({
  email: 'usuario@ejemplo.com',
  password: 'mipassword'
});

// Las peticiones posteriores incluirán automáticamente el token
const data = await client.get('/datos-privados');

// Logout
await client.logout();
```

---

## 💾 Cache

### Configuración Completa

```typescript
const client = new ApiClient({
  cache: {
    enabled: true,
    defaultTTL: 300000, // 5 minutos
    maxSize: 1000,
    keyPrefix: 'api_cache_',
    compression: false,
    
    // Serialización personalizada
    serialize: (data) => JSON.stringify(data),
    deserialize: (data) => JSON.parse(data),
    
    // Adaptador personalizado (Redis, etc.)
    adapter: new RedisCacheAdapter()
  }
});
```

### Opciones de Cache

| Opción | Tipo | Defecto | Descripción |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Habilitar cache |
| `defaultTTL` | `number` | `300000` | TTL por defecto (ms) |
| `maxSize` | `number` | `1000` | Máximo número de entradas |
| `keyPrefix` | `string` | `'api_cache_'` | Prefijo para las claves |
| `compression` | `boolean` | `false` | Comprimir datos |
| `serialize` | `function` | `JSON.stringify` | Función de serialización |
| `deserialize` | `function` | `JSON.parse` | Función de deserialización |
| `adapter` | `CacheAdapter` | `MemoryAdapter` | Adaptador de almacenamiento |

### Cache por Petición

```typescript
// Cache específico para esta petición
const data = await client.get('/usuarios', {
  cache: {
    enabled: true,
    ttl: 600000, // 10 minutos para esta petición
    key: 'usuarios_lista_especial'
  }
});

// Sin cache para esta petición
const freshData = await client.get('/datos-actuales', {
  skipCache: true
});
```

### Adaptador Personalizado (Redis)

```typescript
class RedisCacheAdapter implements CacheAdapter {
  constructor(private redis: RedisClient) {}
  
  async get(key: string): Promise<any> {
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }
  
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redis.setex(key, Math.floor(ttl / 1000), serialized);
    } else {
      await this.redis.set(key, serialized);
    }
  }
  
  // ... otros métodos
}
```

### Gestión de Cache

```typescript
// Obtener estadísticas
const stats = client.getCacheStats();
console.log(`Hit rate: ${stats.hitRate}%`);

// Invalidar cache por patrón
await client.invalidateCache('usuarios_*');

// Limpiar todo el cache
await client.invalidateCache();
```

---

## 🔄 Reintentos

### Configuración Completa

```typescript
const client = new ApiClient({
  retry: {
    enabled: true,
    maxAttempts: 3,
    
    // Estrategia de backoff
    backoffFactor: 2,        // Exponencial
    baseDelay: 1000,         // 1 segundo inicial
    maxDelay: 30000,         // Máximo 30 segundos
    jitter: true,            // Variación aleatoria
    
    // Configuración avanzada
    shouldResetTimeout: true,
    retryStatusCodes: [408, 429, 500, 502, 503, 504],
    
    // Condición personalizada
    retryCondition: (error) => {
      return error.status >= 500 || error.code === 'NETWORK_ERROR';
    },
    
    // Callback de retry
    onRetry: (attempt, error) => {
      console.log(`Reintento ${attempt}: ${error.message}`);
    }
  }
});
```

### Opciones de Reintentos

| Opción | Tipo | Defecto | Descripción |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Habilitar reintentos |
| `maxAttempts` | `number` | `3` | Máximo número de intentos |
| `backoffFactor` | `number` | `2` | Factor de crecimiento del delay |
| `baseDelay` | `number` | `1000` | Delay inicial en ms |
| `maxDelay` | `number` | `30000` | Delay máximo en ms |
| `jitter` | `boolean` | `true` | Añadir variación aleatoria |
| `shouldResetTimeout` | `boolean` | `true` | Resetear timeout en reintentos |
| `retryStatusCodes` | `number[]` | `[408, 429, 500, 502, 503, 504]` | Códigos que activan retry |
| `retryCondition` | `function` | Ver código | Condición personalizada |
| `onRetry` | `function` | `undefined` | Callback en cada reintento |

### Reintentos por Petición

```typescript
// Más reintentos para operaciones críticas
await client.post('/checkout', paymentData, {
  retry: {
    enabled: true,
    maxAttempts: 5,
    baseDelay: 2000
  }
});

// Sin reintentos para búsquedas
await client.get('/search?q=term', {
  skipRetry: true
});
```

### Estrategias de Reintentos

```typescript
// Estrategia lineal
const clientLineal = new ApiClient({
  retry: {
    enabled: true,
    backoffFactor: 1,      // Sin crecimiento exponencial
    baseDelay: 2000        // Siempre 2 segundos
  }
});

// Estrategia agresiva
const clientAgresivo = new ApiClient({
  retry: {
    enabled: true,
    maxAttempts: 10,
    backoffFactor: 1.5,    // Crecimiento moderado
    baseDelay: 500,        // Inicio rápido
    maxDelay: 10000        // Límite moderado
  }
});

// Estrategia conservadora
const clientConservador = new ApiClient({
  retry: {
    enabled: true,
    maxAttempts: 2,
    backoffFactor: 3,      // Crecimiento rápido
    baseDelay: 5000,       // Inicio lento
    jitter: false          // Sin variación
  }
});
```

---

## 📝 Logging

### Configuración Completa

```typescript
const client = new ApiClient({
  logging: {
    enabled: true,
    level: 'info',
    
    // Formato
    prefix: '[MI_API]',
    timestamp: true,
    colorize: true,
    prettyPrint: true,
    maxLogLength: 2000,
    
    // Qué loggear
    logRequests: true,
    logResponses: true,
    logErrors: true,
    logRetries: true,
    logCache: false,
    logAuth: true,
    
    // Seguridad
    sensitiveFields: ['password', 'token', 'authorization', 'secret'],
    
    // Adaptador personalizado
    adapter: new CustomLoggerAdapter()
  }
});
```

### Opciones de Logging

| Opción | Tipo | Defecto | Descripción |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Habilitar logging |
| `level` | `'error' \| 'warn' \| 'info' \| 'debug' \| 'trace'` | `'info'` | Nivel de logging |
| `prefix` | `string` | `'[API]'` | Prefijo en los logs |
| `timestamp` | `boolean` | `true` | Incluir timestamp |
| `colorize` | `boolean` | `true` | Colorear logs en consola |
| `prettyPrint` | `boolean` | `true` | Formato legible |
| `logRequests` | `boolean` | `false` | Loggear peticiones |
| `logResponses` | `boolean` | `false` | Loggear respuestas |
| `logErrors` | `boolean` | `true` | Loggear errores |
| `logRetries` | `boolean` | `true` | Loggear reintentos |
| `logCache` | `boolean` | `false` | Loggear operaciones de cache |
| `logAuth` | `boolean` | `true` | Loggear operaciones de auth |
| `sensitiveFields` | `string[]` | Ver defecto | Campos a censurar |
| `maxLogLength` | `number` | `1000` | Longitud máxima de logs |

### Niveles de Logging

```typescript
// Solo errores críticos
const clientSilencioso = new ApiClient({
  logging: { level: 'error' }
});

// Todo el detalle para debugging
const clientVerboso = new ApiClient({
  logging: { 
    level: 'trace',
    logRequests: true,
    logResponses: true,
    logCache: true
  }
});

// Producción balanceado
const clientProduccion = new ApiClient({
  logging: {
    level: 'warn',
    logRequests: false,
    logResponses: false,
    logErrors: true
  }
});
```

### Adaptador Personalizado

```typescript
class WinstonLoggerAdapter implements LoggerAdapter {
  constructor(private winston: Logger) {}
  
  error(message: string, meta?: any): void {
    this.winston.error(message, meta);
  }
  
  warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }
  
  info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }
  
  debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }
  
  trace(message: string, meta?: any): void {
    this.winston.silly(message, meta);
  }
}

const client = new ApiClient({
  logging: {
    adapter: new WinstonLoggerAdapter(winstonLogger)
  }
});
```

---

## 🔀 Deduplicación

### Configuración Completa

```typescript
const client = new ApiClient({
  deduplication: {
    enabled: true,
    timeout: 30000, // 30 segundos
    
    // Generador de claves personalizado
    keyGenerator: (method, url, data, params) => {
      const paramStr = params ? JSON.stringify(params) : '';
      const dataStr = data ? JSON.stringify(data) : '';
      return `${method}:${url}:${paramStr}:${dataStr}`;
    }
  }
});
```

### Opciones de Deduplicación

| Opción | Tipo | Defecto | Descripción |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Habilitar deduplicación |
| `timeout` | `number` | `30000` | Timeout para peticiones (ms) |
| `keyGenerator` | `function` | Ver defecto | Generador de claves |

### Ejemplo Práctico

```typescript
// Estas 3 peticiones idénticas se ejecutarán como 1 sola
const [result1, result2, result3] = await Promise.all([
  client.get('/usuarios/123'),
  client.get('/usuarios/123'), // Deduplicada
  client.get('/usuarios/123')  // Deduplicada
]);

// Estadísticas
const stats = client.getDeduplicationStats();
console.log(`Tasa de deduplicación: ${stats.deduplicationRate}%`);
```

---

## 🌐 Ambientes

### Configuración por Ambiente

```typescript
const ambiente = process.env.NODE_ENV || 'development';

const configs = {
  development: {
    baseURL: 'http://localhost:3000',
    timeout: 10000,
    retry: { maxAttempts: 1 },
    logging: { level: 'debug' }
  },
  
  staging: {
    baseURL: 'https://staging.api.com',
    timeout: 20000,
    retry: { maxAttempts: 2 },
    logging: { level: 'info' }
  },
  
  production: {
    baseURL: 'https://api.ejemplo.com',
    timeout: 30000,
    retry: { maxAttempts: 5 },
    logging: { level: 'warn' }
  }
};

const client = new ApiClient({
  environment: ambiente,
  ...configs[ambiente]
});
```

### Detección Automática

```typescript
// La librería detecta automáticamente el ambiente
const client = new ApiClient({
  baseURL: 'https://api.ejemplo.com'
  // Se aplicará configuración automática según NODE_ENV
});
```

---

## ⚙️ Configuración Avanzada

### Configuración Dinámica

```typescript
const client = new ApiClient({
  baseURL: 'https://api.ejemplo.com'
});

// Actualizar configuración después de crear el cliente
client.updateConfig({
  retry: {
    enabled: true,
    maxAttempts: 10
  },
  headers: {
    'X-API-Key': 'nueva-clave'
  }
});

// Obtener configuración actual
const config = client.getConfig();
```

### Axios Personalizado

```typescript
const client = new ApiClient({
  baseURL: 'https://api.ejemplo.com',
  
  // Configuración específica de Axios
  axiosConfig: {
    withCredentials: true,
    responseType: 'json',
    decompress: true,
    maxContentLength: 10 * 1024 * 1024, // 10MB
    httpsAgent: new https.Agent({
      keepAlive: true,
      rejectUnauthorized: true
    })
  },
  
  // Validación personalizada de status
  validateStatus: (status) => {
    return status >= 200 && status <= 299 || status === 304;
  }
});

// Acceso directo a la instancia de Axios
const axiosInstance = client.getAxiosInstance();
axiosInstance.interceptors.request.use(customInterceptor);
```

### Interceptores Personalizados

```typescript
const client = new ApiClient({
  baseURL: 'https://api.ejemplo.com'
});

// Acceder a la instancia de Axios para interceptores personalizados
const axios = client.getAxiosInstance();

// Interceptor de petición
axios.interceptors.request.use(
  (config) => {
    config.headers['X-Timestamp'] = Date.now().toString();
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de respuesta
axios.interceptors.response.use(
  (response) => {
    // Transformar respuesta
    return response;
  },
  (error) => {
    // Manejo personalizado de errores
    return Promise.reject(error);
  }
);
```

---

## 📚 Ejemplos Prácticos

### E-commerce Completo

```typescript
const clientEcommerce = new ApiClient({
  baseURL: 'https://api.tienda.com',
  timeout: 30000,
  
  auth: {
    enabled: true,
    tokenStorage: 'memory',
    autoRefresh: true,
    refreshThreshold: 300000
  },
  
  cache: {
    enabled: true,
    defaultTTL: 600000, // 10 minutos para productos
    maxSize: 500
  },
  
  retry: {
    enabled: true,
    maxAttempts: 3,
    retryCondition: (error) => {
      // Reintentar errores de servidor y pagos
      return error.status >= 500 || 
             error.url?.includes('/checkout') ||
             error.code === 'NETWORK_ERROR';
    }
  },
  
  logging: {
    enabled: true,
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    logRequests: false,
    logErrors: true,
    sensitiveFields: ['password', 'creditCard', 'token']
  },
  
  deduplication: {
    enabled: true,
    timeout: 60000 // 1 minuto para carritos
  }
});

// Uso específico por operación
class EcommerceAPI {
  constructor(private client: ApiClient) {}
  
  // Productos - cache largo, pocos reintentos
  async getProductos() {
    return this.client.get('/productos', {
      cache: { ttl: 1800000 }, // 30 minutos
      retry: { maxAttempts: 1 }
    });
  }
  
  // Checkout - sin cache, muchos reintentos
  async checkout(data: any) {
    return this.client.post('/checkout', data, {
      skipCache: true,
      retry: { 
        maxAttempts: 5,
        baseDelay: 2000
      }
    });
  }
  
  // Búsqueda - sin cache, sin reintentos
  async buscar(query: string) {
    return this.client.get(`/buscar?q=${query}`, {
      skipCache: true,
      skipRetry: true
    });
  }
}
```

### API Corporativa

```typescript
const clientCorporativo = new ApiClient({
  baseURL: 'https://internal-api.empresa.com',
  
  headers: {
    'X-Service': 'frontend-app',
    'X-Version': '1.2.3'
  },
  
  auth: {
    enabled: true,
    tokenStorage: 'memory', // Por seguridad en ambiente corporativo
    customTokenStorage: new SecureVaultStorage(),
    refreshThreshold: 600000 // 10 minutos
  },
  
  retry: {
    enabled: true,
    maxAttempts: 5,
    backoffFactor: 1.5,
    retryCondition: (error) => {
      // Política corporativa: reintentar todo excepto 4xx
      return !(error.status >= 400 && error.status < 500);
    },
    onRetry: (attempt, error) => {
      // Notificar a sistema de monitoreo
      monitoring.recordRetry(attempt, error);
    }
  },
  
  logging: {
    enabled: true,
    adapter: new CorporateLoggerAdapter(),
    level: 'info',
    sensitiveFields: ['password', 'ssn', 'bankAccount', 'token'],
    logRequests: true,
    logResponses: false
  },
  
  cache: {
    enabled: true,
    adapter: new RedisCacheAdapter(redisClient),
    defaultTTL: 300000
  }
});
```

### Microservicio

```typescript
const clientMicroservicio = new ApiClient({
  baseURL: process.env.API_GATEWAY_URL,
  timeout: 5000, // Timeout agresivo
  
  headers: {
    'X-Service-Name': 'user-service',
    'X-Correlation-ID': () => generateCorrelationId()
  },
  
  retry: {
    enabled: true,
    maxAttempts: 2, // Pocos reintentos para evitar cascadas
    baseDelay: 100, // Delays cortos
    maxDelay: 1000,
    retryCondition: (error) => {
      // Solo reintentar timeouts y 503
      return error.code === 'TIMEOUT_ERROR' || error.status === 503;
    }
  },
  
  logging: {
    enabled: true,
    level: 'info',
    adapter: new StructuredLoggerAdapter(),
    logRequests: true,
    logResponses: true
  },
  
  deduplication: {
    enabled: false // Deshabilitado en microservicios
  },
  
  cache: {
    enabled: false // Cache manejado por Redis separado
  }
});
```

### Configuración por Feature Flag

```typescript
const featureFlags = await getFeatureFlags();

const client = new ApiClient({
  baseURL: 'https://api.ejemplo.com',
  
  cache: {
    enabled: featureFlags.enableCache,
    defaultTTL: featureFlags.cacheTimeToLive || 300000
  },
  
  retry: {
    enabled: featureFlags.enableRetry,
    maxAttempts: featureFlags.maxRetryAttempts || 3
  },
  
  deduplication: {
    enabled: featureFlags.enableDeduplication
  },
  
  logging: {
    enabled: true,
    level: featureFlags.logLevel || 'info'
  }
});
```

---

## 🚀 Comandos de Ejemplo

```bash
# Ejecutar ejemplos de configuración
npm run example:retry-config
npm run example:login
npm run example:cache

# Ver todos los ejemplos disponibles
npm run demo:full
```

---

## 📖 Referencias Adicionales

- [Documentación de Reintentos](./REINTENTOS.md)
- [Guía de Autenticación](./AUTH.md)
- [Configuración de Cache](./CACHE.md)
- [Ejemplos Avanzados](../examples/)

---

*Documentación generada para jarcos_network v1.0.0*
