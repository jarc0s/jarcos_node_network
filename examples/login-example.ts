import { ApiClient, ApiError, ErrorCode } from '../src';

// Configuración del cliente para tu servidor local
const client = new ApiClient({
  baseURL: 'http://192.168.50.105:3000',
  timeout: 10000,
  headers: {
    'accept': 'application/json',
    'Content-Type': 'application/json'
  },
  logging: {
    enabled: true,
    level: 'debug',
    logRequests: true,
    logResponses: true,
    logErrors: true
  },
  retry: {
    enabled: true,
    maxAttempts: 2
  }
});

// Interfaces para las respuestas
interface LoginSuccessResponse {
  message: string;
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    provider: string;
  };
}

// Función para probar login exitoso
async function testSuccessfulLogin() {
  console.log('🔐 Probando login exitoso...\n');
  
  try {
    const response = await client.post<LoginSuccessResponse>('/auth/login', {
      email: "jarcos@example.com",
      password: "password123"
    });

    console.log('✅ Login exitoso!');
    console.log('📄 Respuesta completa:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    
    console.log('\n🔑 Token obtenido:', response.data.token);
    console.log('👤 Usuario:', response.data.user);
    
    return response.data.token;
    
  } catch (error) {
    console.error('❌ Error inesperado en login exitoso:', error);
    throw error;
  }
}

// Función para probar login con error
async function testFailedLogin() {
  console.log('\n🔐 Probando login con credenciales incorrectas...\n');
  
  try {
    const response = await client.post<LoginSuccessResponse>('/auth/login', {
      email: "usuario@example.com",
      password: "password123"
    });

    // Si llegamos aquí, algo está mal porque debería fallar
    console.log('⚠️ Advertencia: Se esperaba un error pero el login fue exitoso');
    console.log('📄 Respuesta:', response.data);
    
  } catch (error) {
    console.log('✅ Error esperado capturado');
    
    if (error instanceof ApiError) {
      console.log('🔍 Detalles del error de API:');
      console.log('   - Código:', error.code);
      console.log('   - Mensaje:', error.message);
      console.log('   - Status HTTP:', error.status);
      console.log('   - Response data:', error.data);
      
      // Manejo específico según el tipo de error
      switch (error.code) {
        case ErrorCode.UNAUTHORIZED:
          console.log('🚫 Credenciales inválidas - como se esperaba');
          break;
        case ErrorCode.BAD_REQUEST:
          console.log('📝 Datos de petición incorrectos');
          break;
        default:
          console.log('❓ Tipo de error no manejado específicamente');
      }
      
    } else {
      console.log('❌ Error no relacionado con la API:', error);
    }
  }
}

// Función para probar con token obtenido
async function testAuthenticatedRequest(token: string) {
  console.log('\n🔒 Probando petición autenticada...\n');
  
  // Crear un nuevo cliente con el token
  const authenticatedClient = new ApiClient({
    baseURL: 'http://192.168.50.105:3000',
    headers: {
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json'
    },
    logging: {
      enabled: true,
      level: 'info'
    }
  });
  
  try {
    // Ejemplo de petición que podría requerir autenticación
    const response = await authenticatedClient.get('/profile');
    console.log('✅ Petición autenticada exitosa:', response.data);
    
  } catch (error) {
    console.log('📄 Endpoint /profile no disponible o requiere configuración adicional');
    console.log('🔑 Token listo para usar:', token.substring(0, 20) + '...');
  }
}

// Función principal para ejecutar todos los ejemplos
async function runLoginExamples() {
  console.log('🚀 Iniciando ejemplos de login con manejo de errores\n');
  console.log('🌐 Servidor: http://192.168.50.105:3000');
  console.log('📡 Endpoint: /auth/login\n');
  
  try {
    // Probar caso de éxito
    const token = await testSuccessfulLogin();
    
    // Probar caso de error
    await testFailedLogin();
    
    // Probar petición autenticada si obtuvimos token
    if (token) {
      await testAuthenticatedRequest(token);
    }
    
    console.log('\n🎉 Ejemplos completados');
    
  } catch (error) {
    console.error('\n💥 Error general en los ejemplos:', error);
  } finally {
    // Limpiar recursos
    client.destroy();
  }
}

// Función adicional para probar solo manejo de errores
async function testErrorHandling() {
  console.log('\n🔧 Ejemplo específico de manejo de errores\n');
  
  const testCases = [
    {
      name: 'Credenciales incorrectas',
      data: { email: "usuario@example.com", password: "password123" }
    },
    {
      name: 'Email malformado',
      data: { email: "email-invalido", password: "password123" }
    },
    {
      name: 'Campos faltantes',
      data: { email: "test@example.com" } // Sin password
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`🧪 Probando: ${testCase.name}`);
    
    try {
      await client.post('/auth/login', testCase.data);
      console.log('⚠️ Respuesta exitosa inesperada');
      
    } catch (error) {
      if (error instanceof ApiError) {
        console.log(`   ✅ Error capturado: ${error.message} (${error.status})`);
      } else {
        console.log(`   ❌ Error no manejado: ${error}`);
      }
    }
    
    console.log('');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  runLoginExamples()
    .then(() => testErrorHandling())
    .catch(console.error);
}

export { 
  runLoginExamples, 
  testSuccessfulLogin, 
  testFailedLogin, 
  testErrorHandling 
};