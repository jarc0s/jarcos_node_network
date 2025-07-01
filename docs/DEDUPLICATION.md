# Deduplicación de Peticiones

## Resumen

La funcionalidad de **deduplicación de peticiones** previene que se ejecuten múltiples peticiones HTTP idénticas de forma simultánea. Si se detectan peticiones duplicadas mientras una ya está en progreso, las peticiones adicionales comparten el resultado de la primera petición en lugar de crear nuevas conexiones HTTP.

## ¿Por qué es importante?

En aplicaciones web modernas es común que se ejecuten peticiones duplicadas por varios motivos:

- **Doble clic del usuario**: El usuario hace clic múltiples veces en un botón
- **Múltiples componentes**: Diferentes componentes React/Vue que solicitan los mismos datos
- **Navegación rápida**: El usuario navega rápidamente entre páginas que requieren los mismos datos
- **Actualizaciones automáticas**: Timers o eventos que disparan peticiones mientras otras están en progreso

## Configuración

### Habilitación básica

```typescript
import { ApiClient } from '@jarc0s/jarcos-node-network';

const client = new ApiClient({
  baseURL: 'https://api.example.com',
  deduplication: {
    enabled: true,  // Habilitar deduplicación (default: true)
    timeout: 30000  // Tiempo en ms para considerar una petición como expirada (default: 30000)
  }
});
```

### Configuración avanzada

```typescript
const client = new ApiClient({
  baseURL: 'https://api.example.com',
  deduplication: {
    enabled: true,
    timeout: 60000,  // 1 minuto
    keyGenerator: (method, url, data, params) => {
      // Generador personalizado de keys para determinar qué peticiones son "idénticas"
      // Por defecto incluye método, URL, datos y parámetros
      return `${method}:${url}:${JSON.stringify(data)}:${JSON.stringify(params)}`;
    }
  }
});
```

## Cómo funciona

### Identificación de peticiones idénticas

Una petición se considera idéntica a otra si tienen:

1. **Mismo método HTTP** (GET, POST, PUT, etc.)
2. **Misma URL**
3. **Mismos datos** (body de la petición)
4. **Mismos parámetros** (query parameters)

### Ejemplo de deduplicación

```typescript
// Estas tres peticiones se ejecutan simultáneamente
const promise1 = client.get('/users/123');
const promise2 = client.get('/users/123'); // DUPLICADA - compartirá resultado de promise1
const promise3 = client.get('/users/456'); // DIFERENTE - se ejecutará independientemente

const results = await Promise.all([promise1, promise2, promise3]);

// promise1 y promise2 tendrán el mismo resultado
// promise3 tendrá un resultado independiente
console.log(results[0] === results[1]); // true
console.log(results[0] === results[2]); // false
```

### Con diferentes métodos

```typescript
// Estas peticiones NO se deduplican porque tienen métodos diferentes
await Promise.all([
  client.get('/users/123'),    // Se ejecuta
  client.post('/users/123', { name: 'Juan' }),  // Se ejecuta (método diferente)
  client.put('/users/123', { name: 'Juan' })    // Se ejecuta (método diferente)
]);
```

### Con diferentes datos

```typescript
// Estas peticiones NO se deduplican porque tienen datos diferentes
await Promise.all([
  client.post('/users', { name: 'Juan' }),   // Se ejecuta
  client.post('/users', { name: 'María' }),  // Se ejecuta (datos diferentes)
  client.post('/users', { name: 'Juan' })    // DUPLICADA - compartirá resultado de la primera
]);
```

## Estadísticas

Puedes obtener estadísticas de deduplicación para monitorear su efectividad:

```typescript
const stats = client.getDeduplicationStats();

console.log(stats);
// {
//   totalRequests: 100,        // Total de peticiones procesadas
//   deduplicatedRequests: 25,  // Peticiones que fueron deduplicadas
//   activeRequests: 2,         // Peticiones actualmente en progreso
//   deduplicationRate: 25.0    // Porcentaje de deduplicación
// }
```

## Casos de uso comunes

### 1. Prevenir doble envío de formularios

```typescript
const submitButton = document.getElementById('submit');

submitButton.addEventListener('click', async () => {
  // Múltiples clics en el botón solo ejecutarán la petición una vez
  try {
    const result = await client.post('/form/submit', formData);
    showSuccessMessage(result);
  } catch (error) {
    showErrorMessage(error);
  }
});
```

### 2. Componentes React que comparten datos

```typescript
// UserProfile.tsx
const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Si múltiples componentes UserProfile se montan al mismo tiempo
    // con el mismo userId, solo se ejecutará una petición
    client.get(`/users/${userId}`)
      .then(setUser);
  }, [userId]);
  
  // ...
};

// UserAvatar.tsx  
const UserAvatar = ({ userId }) => {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Esta petición se deduplicará con la de UserProfile si ocurre simultáneamente
    client.get(`/users/${userId}`)
      .then(setUser);
  }, [userId]);
  
  // ...
};
```

### 3. Polling con protección

```typescript
let isPolling = false;

const startPolling = () => {
  if (isPolling) return;
  isPolling = true;
  
  const poll = async () => {
    try {
      // Si el polling se ejecuta más rápido que las respuestas,
      // las peticiones duplicadas serán deduplicadas automáticamente
      const data = await client.get('/status');
      updateUI(data);
    } catch (error) {
      console.error('Polling error:', error);
    }
    
    if (isPolling) {
      setTimeout(poll, 1000);
    }
  };
  
  poll();
};
```

## Consideraciones importantes

### 1. Peticiones secuenciales vs simultáneas

```typescript
// Peticiones secuenciales - NO se deduplican (comportamiento deseado)
const user1 = await client.get('/users/123');
const user2 = await client.get('/users/123'); // Se ejecuta normalmente

// Peticiones simultáneas - SÍ se deduplican
const [user1, user2] = await Promise.all([
  client.get('/users/123'),
  client.get('/users/123')  // Deduplicada
]);
```

### 2. Manejo de errores

```typescript
// Si una petición falla, todas las peticiones deduplicadas también fallarán
try {
  const results = await Promise.all([
    client.get('/users/123'),
    client.get('/users/123'),  // Compartirá el mismo error si falla
    client.get('/users/123')   // Compartirá el mismo error si falla
  ]);
} catch (error) {
  // Todas las promesas rechazarán con el mismo error
  console.error('All requests failed:', error);
}
```

### 3. Timeout de limpieza

Las peticiones en progreso se limpian automáticamente después del timeout configurado (default: 30 segundos) para evitar memory leaks.

## Deshabilitación

Si necesitas deshabilitar la deduplicación temporalmente:

```typescript
// Deshabilitar globalmente
const client = new ApiClient({
  baseURL: 'https://api.example.com',
  deduplication: {
    enabled: false
  }
});

// O usar un cliente separado sin deduplicación para casos específicos
const nonDeduplicatedClient = new ApiClient({
  baseURL: 'https://api.example.com',
  deduplication: { enabled: false }
});
```

## Rendimiento

La deduplicación tiene un overhead mínimo:

- **Memoria**: Mantiene un Map de peticiones en progreso
- **CPU**: Generación de keys y lookup en Map (O(1))
- **Red**: Reduce significativamente el tráfico de red al eliminar peticiones duplicadas

Los beneficios superan ampliamente el overhead, especialmente en aplicaciones con muchas peticiones simultáneas.