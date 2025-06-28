# 🚀 Guía Rápida de Inicio

## ⚡ Instalación en 1 Minuto

### 1. Instalar la librería

```bash
# Instalar desde GitHub
npm install git+https://github.com/jarc0s/jarcos_node_network.git

# Instalar dependencia requerida
npm install axios
```

### 2. Uso inmediato

```typescript
import { ApiClient } from '@jarc0s/jarcos-node-network';

const api = new ApiClient({
  baseURL: 'https://tu-api.com'
});

// ¡Ya está listo para usar!
const data = await api.get('/users');
```

---

## 🔥 Configuración Completa en 3 Minutos

### TypeScript/Next.js

```typescript
// lib/api.ts
import { ApiClient } from '@jarc0s/jarcos-node-network';

export const api = new ApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL!,
  auth: {
    enabled: true,
    tokenStorage: 'localStorage',
    loginEndpoint: '/auth/login',
    autoRefresh: true
  },
  cache: {
    enabled: true,
    defaultTTL: 300000 // 5 minutos
  },
  retry: {
    enabled: true,
    maxAttempts: 3
  }
});

// hooks/useApi.ts
import { useState } from 'react';

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  
  const execute = async (apiCall: () => Promise<{data: T}>) => {
    setLoading(true);
    try {
      const result = await apiCall();
      setData(result.data);
      return result.data;
    } finally {
      setLoading(false);
    }
  };
  
  return { data, loading, execute };
}

// Usar en componentes
function MyComponent() {
  const { data, loading, execute } = useApi<User[]>();
  
  useEffect(() => {
    execute(() => api.get('/users'));
  }, []);
  
  if (loading) return <div>Loading...</div>;
  return <div>{data?.length} users</div>;
}
```

### Node.js/Express

```javascript
// services/apiService.js
const { ApiClient } = require('@jarcos/api-service-library');

const externalApi = new ApiClient({
  baseURL: 'https://external-api.com',
  auth: { enabled: true, tokenStorage: 'memory' },
  cache: { enabled: true, defaultTTL: 600000 },
  retry: { enabled: true, maxAttempts: 3 }
});

class ApiService {
  async getUsers() {
    const response = await externalApi.get('/users');
    return response.data;
  }
  
  async createUser(userData) {
    const response = await externalApi.post('/users', userData);
    await externalApi.invalidateCache('/users'); // Limpiar cache
    return response.data;
  }
}

module.exports = new ApiService();

// routes/users.js
const express = require('express');
const apiService = require('../services/apiService');
const { ApiError } = require('@jarcos/api-service-library');

const router = express.Router();

router.get('/users', async (req, res) => {
  try {
    const users = await apiService.getUsers();
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

module.exports = router;
```

---

## 🛡️ Manejo de Errores Profesional

```typescript
import { ApiError, AuthError, NetworkError, ErrorCode } from '@jarc0s/jarcos-node-network';

// Función universal de manejo de errores
function handleApiError(error: unknown): string {
  if (error instanceof AuthError) {
    return 'Sesión expirada. Inicia sesión nuevamente.';
  }
  
  if (error instanceof NetworkError) {
    return 'Error de conexión. Verifica tu internet.';
  }
  
  if (error instanceof ApiError) {
    switch (error.code) {
      case ErrorCode.RATE_LIMITED:
        return 'Demasiadas solicitudes. Espera un momento.';
      case ErrorCode.NOT_FOUND:
        return 'Recurso no encontrado.';
      case ErrorCode.SERVER_ERROR:
        return 'Error del servidor. Intenta más tarde.';
      default:
        return error.message;
    }
  }
  
  return 'Error inesperado.';
}

// Usar en cualquier llamada a API
try {
  const data = await api.get('/users');
} catch (error) {
  const userMessage = handleApiError(error);
  showErrorToUser(userMessage);
}
```

---

## 📊 Configuraciones por Ambiente

```typescript
// config/api.ts
const configs = {
  development: {
    baseURL: 'http://localhost:3000/api',
    logging: { enabled: true, level: 'debug' },
    cache: { defaultTTL: 60000 }, // 1 minuto
    retry: { maxAttempts: 2 }
  },
  
  production: {
    baseURL: 'https://api.tuapp.com',
    logging: { enabled: true, level: 'warn' },
    cache: { defaultTTL: 600000 }, // 10 minutos
    retry: { maxAttempts: 3 }
  }
};

const environment = process.env.NODE_ENV || 'development';
export const api = new ApiClient(configs[environment]);
```

---

## 🎯 Casos de Uso Comunes

### 1. **Autenticación Automática**

```typescript
// Login una vez
await api.login({ email: 'user@example.com', password: 'password' });

// Todas las siguientes requests incluyen token automáticamente
const profile = await api.get('/profile');
const settings = await api.get('/settings');

// Si el token expira, se renueva automáticamente
```

### 2. **Cache Inteligente**

```typescript
// Primera llamada - va al servidor
const users1 = await api.get('/users'); // 500ms

// Segunda llamada - desde cache
const users2 = await api.get('/users'); // 5ms

// Cache con TTL personalizado
const posts = await api.get('/posts', { 
  cache: { ttl: 3600000 } // 1 hora
});

// Invalidar cache cuando sea necesario
await api.post('/users', newUser);
await api.invalidateCache('/users'); // Limpia cache de usuarios
```

### 3. **Reintentos Automáticos**

```typescript
// Se reintenta automáticamente en errores 5xx o red
const data = await api.get('/unstable-endpoint');

// Configurar reintentos por request
const criticalData = await api.get('/critical', {
  retry: { maxAttempts: 5, backoffFactor: 2 }
});

// Ver estadísticas de reintentos
console.log(api.getRetryStats());
```

### 4. **Logging y Debugging**

```typescript
// Logging automático en desarrollo
const api = new ApiClient({
  logging: {
    enabled: true,
    level: 'debug',
    logRequests: true,
    logResponses: true,
    logCache: true
  }
});

// Verás en consola:
// → GET /users (headers, timing)
// ← 200 OK [245ms] 
// ⚡ Cache hit: /users
```

---

## 🔧 Troubleshooting Rápido

### ❌ Error: "Cannot resolve module"
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### ❌ Error de TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

### ❌ Error 401 constante
```typescript
// Verificar configuración de auth
const api = new ApiClient({
  auth: {
    enabled: true,
    tokenStorage: 'localStorage', // o 'memory' en servidor
    refreshEndpoint: '/auth/refresh' // Asegúrate que existe
  }
});
```

### ❌ Requests muy lentos
```typescript
// Habilitar cache
const api = new ApiClient({
  cache: { enabled: true, defaultTTL: 300000 },
  // Verificar logs
  logging: { enabled: true, level: 'info' }
});
```

---

## 📈 Siguiente Nivel

### Monitoreo Avanzado
```typescript
// Métricas en tiempo real
setInterval(() => {
  const cache = api.getCacheStats();
  const retry = api.getRetryStats();
  
  console.log(`Cache: ${cache.hitRate*100}% hit rate`);
  console.log(`Retry: ${retry.successfulRetries} recoveries`);
}, 60000);
```

### Interceptores Personalizados
```typescript
const axiosInstance = api.getAxiosInstance();

// Agregar header personalizado
axiosInstance.interceptors.request.use(config => {
  config.headers['X-App-Version'] = '1.0.0';
  return config;
});

// Transformar todas las respuestas
axiosInstance.interceptors.response.use(response => {
  response.data = { 
    ...response.data, 
    timestamp: Date.now() 
  };
  return response;
});
```

¡Tu API library está lista para producción! 🚀