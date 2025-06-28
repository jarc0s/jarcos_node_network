# 🎯 Ejemplos de Uso Prácticos

## 🚀 Ejemplo 1: Proyecto Next.js con Autenticación

```typescript
// lib/api.ts
import { ApiClient } from '@jarc0s/jarcos-node-network';

export const api = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  environment: process.env.NODE_ENV as any,
  auth: {
    enabled: true,
    tokenStorage: 'localStorage',
    loginEndpoint: '/auth/login',
    refreshEndpoint: '/auth/refresh',
    autoRefresh: true
  },
  cache: {
    enabled: true,
    defaultTTL: 300000 // 5 minutos
  },
  retry: {
    enabled: true,
    maxAttempts: 3
  },
  logging: {
    enabled: process.env.NODE_ENV === 'development',
    level: 'info'
  }
});

// hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = async (credentials: any) => {
    try {
      const authResponse = await api.login(credentials);
      setUser(authResponse.user);
      return authResponse;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const getProfile = async () => {
    try {
      const response = await api.get('/profile');
      setUser(response.data);
    } catch (error) {
      console.error('Error getting profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getProfile();
  }, []);

  return { user, login, logout, loading };
}

// pages/login.tsx
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ApiError, AuthError } from '@jarc0s/jarcos-node-network';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      // Redirect to dashboard
    } catch (error) {
      if (error instanceof AuthError) {
        setError('Credenciales inválidas');
      } else if (error instanceof ApiError) {
        setError(`Error: ${error.message}`);
      } else {
        setError('Error inesperado');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input 
        type="email" 
        value={email} 
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input 
        type="password" 
        value={password} 
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

## 🏗️ Ejemplo 2: API Node.js/Express con Cache

```typescript
// services/userService.ts
import { ApiClient } from '@jarc0s/jarcos-node-network';

const externalApi = new ApiClient({
  baseURL: 'https://external-api.com',
  auth: {
    enabled: true,
    tokenStorage: 'memory' // En servidor usar memory
  },
  cache: {
    enabled: true,
    defaultTTL: 600000 // 10 minutos
  },
  retry: {
    enabled: true,
    maxAttempts: 3,
    backoffFactor: 2
  }
});

export class UserService {
  async getAllUsers() {
    try {
      // Se cachea automáticamente
      const response = await externalApi.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getUserById(id: string) {
    try {
      const response = await externalApi.get(`/users/${id}`, {
        cache: { ttl: 300000 } // Cache 5 minutos para usuarios específicos
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }

  async createUser(userData: any) {
    try {
      const response = await externalApi.post('/users', userData);
      
      // Invalidar cache de usuarios después de crear uno nuevo
      await externalApi.invalidateCache('/users');
      
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async refreshUserCache() {
    // Invalidar todo el cache de usuarios
    const invalidated = await externalApi.invalidateCache('/users');
    console.log(`Invalidated ${invalidated} cache entries`);
  }
}

// routes/users.ts
import express from 'express';
import { UserService } from '../services/userService';
import { ApiError } from '@jarc0s/jarcos-node-network';

const router = express.Router();
const userService = new UserService();

router.get('/users', async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json(users);
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.status || 500).json({
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

router.post('/users', async (req, res) => {
  try {
    const newUser = await userService.createUser(req.body);
    res.status(201).json(newUser);
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.status || 500).json({
        error: error.message,
        code: error.code
      });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
```

## 🔧 Ejemplo 3: Configuración Avanzada

```typescript
// config/api.ts
import { ApiClient } from '@jarc0s/jarcos-node-network';

// Cliente para API principal
export const mainApi = new ApiClient({
  baseURL: process.env.MAIN_API_URL!,
  timeout: 30000,
  auth: {
    enabled: true,
    tokenStorage: 'localStorage',
    autoRefresh: true,
    refreshThreshold: 300000 // 5 minutos
  },
  cache: {
    enabled: true,
    defaultTTL: 600000, // 10 minutos
    maxSize: 1000
  },
  retry: {
    enabled: true,
    maxAttempts: 3,
    baseDelay: 1000,
    backoffFactor: 2
  },
  logging: {
    enabled: true,
    level: 'info',
    logRequests: true,
    logResponses: false, // No loguear responses en producción
    logErrors: true
  }
});

// Cliente para API externa sin auth
export const externalApi = new ApiClient({
  baseURL: 'https://api.github.com',
  timeout: 15000,
  auth: { enabled: false },
  cache: {
    enabled: true,
    defaultTTL: 3600000 // 1 hora para datos externos
  },
  retry: {
    enabled: true,
    maxAttempts: 2 // Menos reintentos para APIs externas
  },
  headers: {
    'User-Agent': 'MyApp/1.0.0'
  }
});

// Cliente para uploads con configuración específica
export const uploadApi = new ApiClient({
  baseURL: process.env.UPLOAD_API_URL!,
  timeout: 120000, // 2 minutos para uploads
  auth: { enabled: true },
  cache: { enabled: false }, // No cachear uploads
  retry: { enabled: false }, // No reintentar uploads
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

// services/githubService.ts
export class GitHubService {
  async getUser(username: string) {
    try {
      const response = await externalApi.get(`/users/${username}`, {
        cache: { ttl: 1800000 } // Cache 30 minutos
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching GitHub user:', error);
      throw error;
    }
  }

  async getRepos(username: string) {
    try {
      const response = await externalApi.get(`/users/${username}/repos`, {
        params: { sort: 'updated', per_page: 50 }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching GitHub repos:', error);
      throw error;
    }
  }
}
```

## 🛡️ Ejemplo 4: Manejo de Errores Comprehensive

```typescript
// utils/errorHandler.ts
import { 
  ApiError, 
  AuthError, 
  NetworkError, 
  ValidationError, 
  RetryExhaustedError,
  ErrorCode 
} from '@jarc0s/jarcos-node-network';

export class ErrorHandler {
  static handle(error: unknown): { message: string; shouldRetry: boolean; statusCode: number } {
    if (error instanceof AuthError) {
      return {
        message: 'Sesión expirada. Por favor inicia sesión nuevamente.',
        shouldRetry: false,
        statusCode: 401
      };
    }

    if (error instanceof NetworkError) {
      return {
        message: 'Error de conexión. Verifica tu internet.',
        shouldRetry: true,
        statusCode: 503
      };
    }

    if (error instanceof ValidationError) {
      return {
        message: `Datos inválidos: ${error.message}`,
        shouldRetry: false,
        statusCode: 400
      };
    }

    if (error instanceof RetryExhaustedError) {
      return {
        message: 'El servicio no está disponible. Intenta más tarde.',
        shouldRetry: false,
        statusCode: 503
      };
    }

    if (error instanceof ApiError) {
      switch (error.code) {
        case ErrorCode.RATE_LIMITED:
          return {
            message: 'Demasiadas solicitudes. Espera un momento.',
            shouldRetry: true,
            statusCode: 429
          };
        case ErrorCode.NOT_FOUND:
          return {
            message: 'Recurso no encontrado.',
            shouldRetry: false,
            statusCode: 404
          };
        case ErrorCode.SERVER_ERROR:
          return {
            message: 'Error del servidor. Intenta más tarde.',
            shouldRetry: true,
            statusCode: 500
          };
        default:
          return {
            message: error.message,
            shouldRetry: error.isRetryable,
            statusCode: error.status || 500
          };
      }
    }

    return {
      message: 'Error inesperado.',
      shouldRetry: false,
      statusCode: 500
    };
  }

  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const errorInfo = this.handle(error);

        if (!errorInfo.shouldRetry || attempt === maxRetries) {
          throw error;
        }

        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }

    throw lastError;
  }
}

// hooks/useApiCall.ts (React)
import { useState, useCallback } from 'react';
import { ErrorHandler } from '../utils/errorHandler';

export function useApiCall<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await ErrorHandler.withRetry(apiCall);
      setData(result);
      return result;
    } catch (err) {
      const errorInfo = ErrorHandler.handle(err);
      setError(errorInfo.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, execute };
}
```

## 📊 Ejemplo 5: Monitoreo y Métricas

```typescript
// utils/apiMonitor.ts
import { ApiClient } from '@jarc0s/jarcos-node-network';

export class ApiMonitor {
  private metrics = {
    requests: 0,
    successes: 0,
    failures: 0,
    cacheHits: 0,
    retries: 0
  };

  setupMonitoring(api: ApiClient) {
    // Interceptar requests para contar métricas
    const axiosInstance = api.getAxiosInstance();

    axiosInstance.interceptors.request.use(
      (config) => {
        this.metrics.requests++;
        return config;
      }
    );

    axiosInstance.interceptors.response.use(
      (response) => {
        this.metrics.successes++;
        if ((response as any).fromCache) {
          this.metrics.cacheHits++;
        }
        return response;
      },
      (error) => {
        this.metrics.failures++;
        if (error.retryAttempt > 0) {
          this.metrics.retries++;
        }
        return Promise.reject(error);
      }
    );
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.requests > 0 
        ? (this.metrics.successes / this.metrics.requests) * 100 
        : 0,
      cacheHitRate: this.metrics.requests > 0
        ? (this.metrics.cacheHits / this.metrics.requests) * 100
        : 0
    };
  }

  logMetrics() {
    const metrics = this.getMetrics();
    console.log('📊 API Metrics:', metrics);
    
    // Enviar a servicio de monitoreo
    // sendToAnalytics(metrics);
  }
}

// app.ts
const monitor = new ApiMonitor();
monitor.setupMonitoring(api);

// Loguear métricas cada 5 minutos
setInterval(() => {
  monitor.logMetrics();
}, 5 * 60 * 1000);
```

Estos ejemplos muestran cómo usar la librería en diferentes escenarios reales, desde aplicaciones Next.js hasta APIs de Node.js, con manejo completo de errores y monitoreo.