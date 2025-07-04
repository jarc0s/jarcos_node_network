import { ApiClient, ApiError } from '../src';

// Replicar tu configuración exacta
const client = new ApiClient({
  baseURL: 'http://192.168.50.105:3000',
  headers: {
    'accept': 'application/json',
    'Content-Type': 'application/json'
  },
  retry: {
    enabled: true,
    maxAttempts: 2  // Como en tu config
  },
  logging: {
    enabled: true,
    level: 'debug'
  }
});

async function debugErrorHandling() {
  console.log('🔍 Debugging error structure...\n');
  
  try {
    await client.post('/auth/login', {
      email: "usuario@example.com",
      password: "password123"
    });
  } catch (error: any) {
    console.log("My name is Jarc0s and I'm here to help you with your code!");
    console.log('='.repeat(50));
    console.log('📊 COMPLETE ERROR ANALYSIS');
    console.log('='.repeat(50));
    
    // Análisis completo del error
    console.log('🏷️  Error Type:', error.constructor.name);
    console.log('🔑 Error Code:', error.code);
    console.log('📝 Error Message:', error.message);
    console.log('📈 Error Status:', error.status);
    console.log('🔄 Is Retryable:', error.isRetryable);
    
    console.log('\n📦 Full Error Object:');
    console.log(JSON.stringify({
      name: error.name,
      code: error.code,
      message: error.message,
      status: error.status,
      data: error.data,
      cause: error.cause ? {
        name: error.cause.name,
        code: error.cause.code,
        message: error.cause.message,
        status: error.cause.status,
        data: error.cause.data
      } : undefined,
      lastError: error.lastError ? {
        name: error.lastError.name,
        code: error.lastError.code, 
        message: error.lastError.message,
        status: error.lastError.status,
        data: error.lastError.data
      } : undefined
    }, null, 2));
    
    console.log('\n' + '='.repeat(50));
    console.log('🛠️  ERROR HANDLING LOGIC');
    console.log('='.repeat(50));
    
    // Replicar tu lógica exacta
    if (error.code === 'RETRY_EXHAUSTED' && error.lastError) {
      console.log('✅ Detected RETRY_EXHAUSTED with lastError');
      const originalError = error.lastError;
      console.log('📄 Original error data:', originalError.data);
      
      const errorMessage = originalError.data?.error || originalError.message || 'Error desconocido';
      const statusCode = originalError.status || 500;
      
      console.log('🎯 Extracted message:', errorMessage);
      console.log('🎯 Extracted status:', statusCode);
      
      console.log('\n✅ SOLUTION: Use this extracted message');
      return;
    }
    
    // Handle direct ApiError
    if (error instanceof ApiError) {
      console.log('✅ Detected direct ApiError');
      console.log(`✓ Caught API Error: ${error.message}`);
      console.log(`✓ Error Code: ${error.code}`);
      console.log(`✓ HTTP Status: ${error.status}`);
      console.log(`✓ Is Retryable: ${error.isRetryable}`);
      console.log('✓ Error Data:', error.data);
      
      const errorMessage = error.data?.error || error.message || 'Error desconocido';
      console.log('🎯 Extracted message:', errorMessage);
      
      console.log('\n✅ SOLUTION: Use this extracted message');
      return;
    }
    
    console.log('❌ Unhandled error type');
  }
}

// Función para probar sin retry (para comparar)
async function debugWithoutRetry() {
  console.log('\n🔍 Testing WITHOUT retry for comparison...\n');
  
  const clientNoRetry = new ApiClient({
    baseURL: 'http://192.168.50.105:3000',
    headers: {
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    retry: {
      enabled: false  // Sin retry
    },
    logging: {
      enabled: false
    }
  });
  
  try {
    await clientNoRetry.post('/auth/login', {
      email: "usuario@example.com", 
      password: "password123"
    });
  } catch (error: any) {
    console.log('📊 ERROR WITHOUT RETRY:');
    console.log('🏷️  Type:', error.constructor.name);
    console.log('🔑 Code:', error.code);
    console.log('📝 Message:', error.message);
    console.log('📈 Status:', error.status);
    console.log('📄 Data:', error.data);
    
    if (error.data?.error) {
      console.log('✅ Direct access to service message:', error.data.error);
    }
  }
  
  clientNoRetry.destroy();
}

// Función para mostrar la implementación corregida
function showCorrectedImplementation() {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 CORRECTED IMPLEMENTATION FOR YOUR PROJECT');
  console.log('='.repeat(60));
  
  console.log(`
// ✅ Improved error handling
catch (error: any) {
  console.log("My name is Jarc0s and I'm here to help you with your code!");
  console.log('Error during login:', error);
  
  let errorMessage = 'Error desconocido';
  let statusCode = 500;
  
  // Handle RetryExhaustedError which wraps the original ApiError
  if (error.code === 'RETRY_EXHAUSTED' && error.lastError) {
    console.log('🔄 Retry exhausted, extracting original error...');
    const originalError = error.lastError;
    console.log('📄 Original error data:', originalError.data);
    
    errorMessage = originalError.data?.error || originalError.message || 'Error de servicio';
    statusCode = originalError.status || 500;
    
    console.log('✅ Extracted service message:', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode, headers: corsHeaders }
    );
  }
  
  // Handle direct ApiError (when retry is disabled)
  if (error instanceof ApiError || error.code) {
    console.log('📡 Direct API Error detected');
    console.log('📄 Error data:', error.data);
    
    errorMessage = error.data?.error || error.message || 'Error de API';
    statusCode = error.status || 500;
    
    console.log('✅ Extracted service message:', errorMessage);
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode, headers: corsHeaders }
    );
  }
  
  // Fallback for unexpected errors
  console.error('❌ Unexpected error structure:', error);
  return NextResponse.json(
    { error: 'Error al iniciar sesión', details: 'Ocurrió un error inesperado' },
    { status: 500, headers: corsHeaders }
  );
}
  `);
}

async function runDebug() {
  try {
    await debugErrorHandling();
    await debugWithoutRetry();
    showCorrectedImplementation();
  } finally {
    client.destroy();
    console.log('\n🎉 Debug completed');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runDebug().catch(console.error);
}

export { runDebug };