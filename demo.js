#!/usr/bin/env node

// Demo script para mostrar todas las capacidades de la librería
const { ApiClient, ApiError, AuthError } = require('./dist/index.js');

console.log('🚀 API Service Library - Demostración Completa\n');

async function runDemo() {
  // Configuración para demo
  const api = new ApiClient({
    baseURL: 'https://jsonplaceholder.typicode.com',
    cache: {
      enabled: true,
      defaultTTL: 30000 // 30 segundos para la demo
    },
    retry: {
      enabled: true,
      maxAttempts: 3
    },
    logging: {
      enabled: true,
      level: 'info',
      logCache: true,
      logRetries: true
    }
  });

  try {
    console.log('=== 1. Tests Básicos ===');
    
    // GET request
    console.log('🔍 Obteniendo usuarios...');
    const users = await api.get('/users');
    console.log(`✅ ${users.data.length} usuarios obtenidos`);

    // POST request  
    console.log('📝 Creando nuevo post...');
    const newPost = await api.post('/posts', {
      title: 'Demo Post',
      body: 'Este post fue creado con la API library',
      userId: 1
    });
    console.log(`✅ Post creado con ID: ${newPost.data.id}`);

    console.log('\n=== 2. Test de Cache ===');
    
    // Primera request (sin cache)
    console.log('📡 Primera request a /posts...');
    const start1 = Date.now();
    const posts1 = await api.get('/posts');
    const time1 = Date.now() - start1;
    console.log(`✅ ${posts1.data.length} posts en ${time1}ms`);

    // Segunda request (con cache)
    console.log('⚡ Segunda request a /posts (desde cache)...');
    const start2 = Date.now();
    const posts2 = await api.get('/posts');
    const time2 = Date.now() - start2;
    console.log(`✅ ${posts2.data.length} posts en ${time2}ms`);
    console.log(`🚀 Mejora de velocidad: ${Math.round(((time1 - time2) / time1) * 100)}%`);

    console.log('\n=== 3. Estadísticas ===');
    
    // Estadísticas de cache
    const cacheStats = api.getCacheStats();
    console.log('📊 Cache Stats:');
    console.log(`   • Hits: ${cacheStats.hits}`);
    console.log(`   • Misses: ${cacheStats.misses}`);
    console.log(`   • Hit Rate: ${Math.round(cacheStats.hitRate * 100)}%`);

    // Estadísticas de retry
    const retryStats = api.getRetryStats();
    console.log('🔄 Retry Stats:');
    console.log(`   • Total Attempts: ${retryStats.totalAttempts}`);
    console.log(`   • Successful Retries: ${retryStats.successfulRetries}`);

    console.log('\n=== 4. Test de Manejo de Errores ===');
    
    try {
      console.log('🚨 Intentando endpoint inexistente...');
      await api.get('/nonexistent');
    } catch (error) {
      if (error instanceof ApiError) {
        console.log(`✅ Error manejado correctamente: ${error.code} - ${error.message}`);
      }
    }

    console.log('\n=== 5. Test de Configuración por Request ===');
    
    // Request sin cache
    console.log('🚫 Request sin cache...');
    const start3 = Date.now();
    const posts3 = await api.get('/posts', { skipCache: true });
    const time3 = Date.now() - start3;
    console.log(`✅ ${posts3.data.length} posts en ${time3}ms (sin cache)`);

    // Request con cache personalizado
    console.log('⏰ Request con TTL personalizado...');
    await api.get('/users/1', {
      cache: { ttl: 60000 } // 1 minuto
    });
    console.log('✅ Usuario cacheado por 1 minuto');

    console.log('\n🎉 ¡Demostración completada exitosamente!');
    console.log('\n📚 Para más ejemplos, revisa:');
    console.log('   • examples/ - Ejemplos detallados');
    console.log('   • USAGE-EXAMPLES.md - Casos de uso reales');
    console.log('   • QUICK-START.md - Guía rápida');

  } catch (error) {
    console.error('\n❌ Error en la demostración:', error.message);
    process.exit(1);
  }
}

// Ejecutar demo
if (require.main === module) {
  runDemo()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('💥 Demo falló:', error);
      process.exit(1);
    });
}

module.exports = { runDemo };