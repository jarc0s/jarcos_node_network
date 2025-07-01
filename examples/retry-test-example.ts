import { ApiClient, ApiError } from '../src';

// Cliente con retry habilitado
const clientWithRetry = new ApiClient({
  baseURL: 'http://192.168.50.105:3000',
  headers: {
    'accept': 'application/json',
    'Content-Type': 'application/json'
  },
  retry: {
    enabled: true,
    maxAttempts: 3,
    baseDelay: 1000
  },
  logging: {
    enabled: true,
    level: 'info',
    logRetries: true
  }
});

async function testRetryBehavior() {
  console.log('🔄 Probando comportamiento de reintentos\n');

  // Caso 1: Error 401 - NO debería reintentar
  console.log('❌ Caso 1: Error 401 (NO debería reintentar)');
  const start401 = Date.now();
  
  try {
    await clientWithRetry.post('/auth/login', {
      email: "usuario@example.com",
      password: "password123"
    });
  } catch (error) {
    const duration = Date.now() - start401;
    
    if (error instanceof ApiError) {
      console.log(`   Status: ${error.status}`);
      console.log(`   Código: ${error.code}`);
      console.log(`   Es retryable: ${error.isRetryable}`);
      console.log(`   Duración: ${duration}ms`);
      console.log(`   ${duration < 2000 ? '✅ NO se reintentó (correcto)' : '❌ Parece que se reintentó'}`);
    }
  }

  console.log('\n---\n');

  // Caso 2: Endpoint inexistente (probablemente 404) - NO debería reintentar
  console.log('🔍 Caso 2: Endpoint inexistente 404 (NO debería reintentar)');
  const start404 = Date.now();
  
  try {
    await clientWithRetry.get('/endpoint-que-no-existe');
  } catch (error) {
    const duration = Date.now() - start404;
    
    if (error instanceof ApiError) {
      console.log(`   Status: ${error.status}`);
      console.log(`   Código: ${error.code}`);
      console.log(`   Es retryable: ${error.isRetryable}`);
      console.log(`   Duración: ${duration}ms`);
      console.log(`   ${duration < 2000 ? '✅ NO se reintentó (correcto)' : '❌ Parece que se reintentó'}`);
    }
  }

  console.log('\n---\n');

  // Caso 3: Servidor incorrecto (network error) - SÍ debería reintentar
  console.log('🌐 Caso 3: Network error (SÍ debería reintentar)');
  
  const clientNetworkTest = new ApiClient({
    baseURL: 'http://192.168.50.999:3000', // IP inválida
    timeout: 2000,
    retry: {
      enabled: true,
      maxAttempts: 3,
      baseDelay: 500
    },
    logging: {
      enabled: true,
      level: 'info'
    }
  });

  const startNetwork = Date.now();
  
  try {
    await clientNetworkTest.get('/test');
  } catch (error) {
    const duration = Date.now() - startNetwork;
    
    if (error instanceof ApiError) {
      console.log(`   Código: ${error.code}`);
      console.log(`   Es retryable: ${error.isRetryable}`);
      console.log(`   Duración: ${duration}ms`);
      console.log(`   ${duration > 3000 ? '✅ SÍ se reintentó (correcto)' : '⚠️ Muy rápido, posible que no se reintentó'}`);
    }
  }

  // Mostrar estadísticas finales
  console.log('\n📊 Estadísticas de reintentos:');
  console.log(clientWithRetry.getRetryStats());

  // Limpiar
  clientWithRetry.destroy();
  clientNetworkTest.destroy();
  
  console.log('\n🎉 Pruebas completadas');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testRetryBehavior().catch(console.error);
}

export { testRetryBehavior };