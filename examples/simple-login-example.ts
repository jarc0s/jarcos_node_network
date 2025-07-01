import { ApiClient, ApiError } from '../src';

// Configuración simple del cliente
const client = new ApiClient({
  baseURL: 'http://192.168.50.105:3000',
  timeout: 10000,
  headers: {
    'accept': 'application/json',
    'Content-Type': 'application/json'
  },
  // Habilitar logging básico para probar el fix
  logging: {
    enabled: true,
    level: 'info'
  },
  // Desactivar retry para ver errores más directos
  retry: {
    enabled: false
  },
  // Habilitar interceptors para probar todo
  enableInterceptors: true
});

// Interface para respuesta exitosa
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

async function testLogin() {
  console.log('🚀 Probando login con jarcos_network library\n');

  try {
    // 1. Probar login exitoso
    console.log('✅ Caso 1: Login exitoso');
    try {
      const successResponse = await client.post<LoginSuccessResponse>('/auth/login', {
        email: "jarcos@example.com",
        password: "password123"
      });

      console.log('   Status:', successResponse.status);
      console.log('   Message:', successResponse.data.message);
      console.log('   User:', successResponse.data.user.username);
      console.log('   Token recibido:', successResponse.data.token ? '✓' : '✗');
      
    } catch (error) {
      console.error('   ❌ Error inesperado:', error instanceof Error ? error.message : error);
    }

    console.log('\n---\n');

    // 2. Probar login con error
    console.log('❌ Caso 2: Login con credenciales incorrectas');
    try {
      const errorResponse = await client.post('/auth/login', {
        email: "usuario@example.com",
        password: "password123"
      });

      console.log('   ⚠️ Respuesta inesperada (debería fallar):', errorResponse.status);
      
    } catch (error) {
      if (error instanceof ApiError) {
        console.log('   ✓ Error de API capturado correctamente');
        console.log('   Status:', error.status || 'N/A');
        console.log('   Código:', error.code);
        console.log('   Mensaje:', error.message);
        console.log('   Data:', error.data || 'N/A');
      } else {
        console.log('   Error general:', error instanceof Error ? error.message : error);
      }
    }

    console.log('\n---\n');

    // 3. Probar con datos inválidos
    console.log('🔧 Caso 3: Datos inválidos (email malformado)');
    try {
      const invalidResponse = await client.post('/auth/login', {
        email: "email-invalido",
        password: "password123"
      });

      console.log('   ⚠️ Respuesta inesperada:', invalidResponse.status);
      
    } catch (error) {
      if (error instanceof ApiError) {
        console.log('   ✓ Error capturado');
        console.log('   Status:', error.status || 'N/A');
        console.log('   Código:', error.code);
        console.log('   Mensaje:', error.message);
        console.log('   Data:', error.data || 'N/A');
      } else {
        console.log('   Error:', error instanceof Error ? error.message : error);
      }
    }

    console.log('\n---\n');

    // 4. Probar sin datos requeridos
    console.log('🚫 Caso 4: Datos faltantes (sin password)');
    try {
      const missingDataResponse = await client.post('/auth/login', {
        email: "test@example.com"
        // Sin password
      });

      console.log('   ⚠️ Respuesta inesperada:', missingDataResponse.status);
      
    } catch (error) {
      if (error instanceof ApiError) {
        console.log('   ✓ Error capturado');
        console.log('   Status:', error.status || 'N/A');
        console.log('   Código:', error.code);
        console.log('   Mensaje:', error.message);
        console.log('   Data:', error.data || 'N/A');
      } else {
        console.log('   Error:', error instanceof Error ? error.message : error);
      }
    }

  } catch (globalError) {
    console.error('❌ Error global:', globalError instanceof Error ? globalError.message : globalError);
  } finally {
    // Limpiar siempre
    try {
      client.destroy();
      console.log('\n🎉 Pruebas completadas - Cliente cerrado correctamente');
    } catch (cleanupError) {
      console.error('Error al limpiar:', cleanupError);
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  testLogin().catch(console.error);
}

export { testLogin };