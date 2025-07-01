import { ApiClient } from '../src';

// Configuración básica con deduplicación habilitada
const client = new ApiClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
  deduplication: {
    enabled: true,
    timeout: 30000 // 30 segundos
  },
  logging: {
    enabled: true,
    level: 'debug'
  }
});

async function demonstrateDeduplication() {
  console.log('🔄 Demostración de Deduplicación de Peticiones\n');

  // Simular múltiples clics o llamadas simultáneas al mismo endpoint
  console.log('📡 Ejecutando 3 peticiones idénticas simultáneamente...');
  
  const startTime = Date.now();
  
  try {
    // Estas 3 peticiones son idénticas - solo se ejecutará 1
    const promises = [
      client.get('/users/1'),
      client.get('/users/1'), // Duplicada - será deduplicada
      client.get('/users/1')  // Duplicada - será deduplicada
    ];
    
    const results = await Promise.all(promises);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Peticiones completadas en ${duration}ms`);
    console.log('📊 Resultados:');
    results.forEach((result, index) => {
      console.log(`   Petición ${index + 1}: Usuario ${result.data.name} (ID: ${result.data.id})`);
    });
    
    // Mostrar estadísticas de deduplicación
    const stats = client.getDeduplicationStats();
    console.log('\n📈 Estadísticas de Deduplicación:');
    console.log(`   Total de peticiones: ${stats.totalRequests}`);
    console.log(`   Peticiones deduplicadas: ${stats.deduplicatedRequests}`);
    console.log(`   Peticiones activas: ${stats.activeRequests}`);
    console.log(`   Tasa de deduplicación: ${stats.deduplicationRate.toFixed(2)}%`);
    
  } catch (error) {
    console.error('❌ Error en las peticiones:', error);
  }

  console.log('\n---\n');

  // Demostrar que peticiones diferentes NO son deduplicadas
  console.log('📡 Ejecutando peticiones diferentes simultáneamente...');
  
  try {
    const differentPromises = [
      client.get('/users/1'),
      client.get('/users/2'), // Diferente usuario
      client.get('/posts/1')  // Diferente endpoint
    ];
    
    const differentResults = await Promise.all(differentPromises);
    
    console.log('✅ Peticiones diferentes completadas');
    console.log('📊 Resultados:');
    console.log(`   Usuario 1: ${differentResults[0].data.name}`);
    console.log(`   Usuario 2: ${differentResults[1].data.name}`);
    console.log(`   Post: "${differentResults[2].data.title}"`);
    
    // Mostrar estadísticas actualizadas
    const finalStats = client.getDeduplicationStats();
    console.log('\n📈 Estadísticas Finales:');
    console.log(`   Total de peticiones: ${finalStats.totalRequests}`);
    console.log(`   Peticiones deduplicadas: ${finalStats.deduplicatedRequests}`);
    console.log(`   Tasa de deduplicación: ${finalStats.deduplicationRate.toFixed(2)}%`);
    
  } catch (error) {
    console.error('❌ Error en las peticiones diferentes:', error);
  }
}

// Función para demostrar deduplicación con POST (diferentes datos)
async function demonstratePostDeduplication() {
  console.log('\n🔄 Demostración con Peticiones POST\n');
  
  try {
    // Estas peticiones POST tienen datos diferentes, NO serán deduplicadas
    const postPromises = [
      client.post('/posts', { 
        title: 'Post 1', 
        body: 'Contenido del post 1',
        userId: 1
      }),
      client.post('/posts', { 
        title: 'Post 1', 
        body: 'Contenido del post 1',
        userId: 1
      }), // Idéntica - será deduplicada
      client.post('/posts', { 
        title: 'Post 2', 
        body: 'Contenido del post 2',
        userId: 1
      })  // Datos diferentes - NO será deduplicada
    ];
    
    const postResults = await Promise.all(postPromises);
    
    console.log('✅ Peticiones POST completadas');
    console.log('📊 Resultados:');
    postResults.forEach((result, index) => {
      console.log(`   Post ${index + 1}: "${result.data.title}" (ID: ${result.data.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error en las peticiones POST:', error);
  }
}

// Ejecutar las demostraciones
async function runDemo() {
  try {
    await demonstrateDeduplication();
    await demonstratePostDeduplication();
  } finally {
    // Limpiar recursos
    client.destroy();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };