import { ApiClient } from '../src';

// EJEMPLO 1: Configuración global básica
const clientBasico = new ApiClient({
  baseURL: 'http://192.168.50.105:3000',
  retry: {
    enabled: true,
    maxAttempts: 5,        // Máximo 5 intentos (incluye el inicial)
    baseDelay: 1000,       // 1 segundo base
    backoffFactor: 2       // Exponencial: 1s, 2s, 4s, 8s...
  }
});

// EJEMPLO 2: Configuración avanzada
const clientAvanzado = new ApiClient({
  baseURL: 'http://192.168.50.105:3000',
  retry: {
    enabled: true,
    maxAttempts: 3,
    baseDelay: 500,        // 500ms inicial
    backoffFactor: 1.5,    // Crecimiento moderado: 500ms, 750ms, 1125ms
    maxDelay: 5000,        // Nunca más de 5 segundos
    jitter: true,          // Añadir variación aleatoria
    
    // Condición personalizada para reintentar
    retryCondition: (error: any) => {
      // Solo reintentar errores de red y 5xx
      return error.status >= 500 || 
             error.code === 'NETWORK_ERROR' || 
             error.code === 'TIMEOUT_ERROR';
    },
    
    // Callback cuando se hace un reintento
    onRetry: (attempt: number, error: Error) => {
      console.log(`🔄 Reintento ${attempt}: ${error.message}`);
    }
  },
  logging: {
    enabled: true,
    level: 'info',
    logRetries: true
  }
});

// EJEMPLO 3: Por endpoint específico
const clientEspecifico = new ApiClient({
  baseURL: 'http://192.168.50.105:3000',
  // Config global con pocos reintentos
  retry: {
    enabled: true,
    maxAttempts: 2
  }
});

async function ejemplosConfiguracion() {
  console.log('🔧 Ejemplos de configuración de reintentos\n');

  // =============================================
  // MÉTODO 1: Configuración global
  // =============================================
  console.log('📋 MÉTODO 1: Configuración global');
  console.log('Cliente configurado con 5 reintentos máximo\n');

  // =============================================
  // MÉTODO 2: Por petición específica
  // =============================================
  console.log('📋 MÉTODO 2: Configuración por petición');
  
  try {
    // Sobrescribir config global para esta petición específica
    await clientEspecifico.get('/endpoint-importante', {
      retry: {
        enabled: true,
        maxAttempts: 10     // 10 reintentos solo para esta petición
      }
    });
  } catch (error) {
    console.log('Error esperado para endpoint inexistente');
  }

  console.log('\n');

  // =============================================
  // MÉTODO 3: Deshabilitar reintentos específicos
  // =============================================
  console.log('📋 MÉTODO 3: Deshabilitar reintentos para petición específica');
  
  try {
    // Deshabilitar reintentos solo para esta petición
    await clientAvanzado.post('/auth/login', {
      email: "test@example.com",
      password: "wrongpassword"
    }, {
      skipRetry: true  // No reintentar esta petición
    });
  } catch (error) {
    console.log('Login falló sin reintentos (como esperado)');
  }

  console.log('\n');

  // =============================================
  // MÉTODO 4: Configuración según ambiente
  // =============================================
  console.log('📋 MÉTODO 4: Configuración por ambiente');
  
  const ambiente = process.env.NODE_ENV || 'development';
  
  const clientPorAmbiente = new ApiClient({
    baseURL: 'http://192.168.50.105:3000',
    retry: {
      enabled: true,
      // Más reintentos en producción, menos en desarrollo
      maxAttempts: ambiente === 'production' ? 5 : 2,
      baseDelay: ambiente === 'production' ? 1000 : 500,
      
      retryCondition: (error: any) => {
        if (ambiente === 'development') {
          // En desarrollo, solo reintentar errores obvios de red
          return error.code === 'NETWORK_ERROR';
        } else {
          // En producción, más tolerante
          return error.status >= 500 || error.code === 'NETWORK_ERROR';
        }
      }
    }
  });

  console.log(`Ambiente: ${ambiente}`);
  console.log(`Reintentos configurados: ${clientPorAmbiente.getConfig().retry?.maxAttempts}`);

  console.log('\n');

  // =============================================
  // MÉTODO 5: Actualizar configuración dinámicamente
  // =============================================
  console.log('📋 MÉTODO 5: Actualización dinámica de configuración');
  
  // Cambiar configuración después de crear el cliente
  clientBasico.updateConfig({
    retry: {
      enabled: true,
      maxAttempts: 7,      // Cambiar a 7 reintentos
      baseDelay: 1500      // Cambiar delay base
    }
  });
  
  console.log('Configuración actualizada dinámicamente');
  console.log('Nuevos reintentos máximos:', clientBasico.getConfig().retry?.maxAttempts);

  console.log('\n');

  // =============================================
  // MOSTRAR ESTADÍSTICAS
  // =============================================
  console.log('📊 Estadísticas de reintentos:');
  console.log('Cliente básico:', clientBasico.getRetryStats());
  console.log('Cliente avanzado:', clientAvanzado.getRetryStats());

  // Limpiar
  clientBasico.destroy();
  clientAvanzado.destroy();
  clientEspecifico.destroy();
  clientPorAmbiente.destroy();
}

// EJEMPLO PRÁCTICO: Caso de uso real
async function casoUsoReal() {
  console.log('\n🎯 CASO DE USO REAL: E-commerce con diferentes estrategias\n');

  const clientEcommerce = new ApiClient({
    baseURL: 'https://api.mitienda.com',
    retry: {
      enabled: true,
      maxAttempts: 3,      // Base: 3 reintentos
      baseDelay: 1000,
      backoffFactor: 2
    }
  });

  // Checkout crítico - más reintentos
  try {
    await clientEcommerce.post('/checkout', {
      items: [{ id: 1, quantity: 2 }],
      paymentMethod: 'credit_card'
    }, {
      retry: {
        maxAttempts: 5    // 5 reintentos para checkout
      }
    });
  } catch (error) {
    console.log('Checkout falló después de 5 intentos');
  }

  // Búsqueda de productos - menos crítico, sin reintentos
  try {
    await clientEcommerce.get('/productos?search=laptop', {
      skipRetry: true  // No reintentar búsquedas
    });
  } catch (error) {
    console.log('Búsqueda falló, pero no es crítico');
  }

  // Analytics - medio crítico
  try {
    await clientEcommerce.post('/analytics/event', {
      event: 'page_view',
      page: '/productos'
    }, {
      retry: {
        maxAttempts: 2    // Solo 2 reintentos para analytics
      }
    });
  } catch (error) {
    console.log('Analytics falló después de 2 intentos');
  }

  clientEcommerce.destroy();
}

// Ejecutar ejemplos
async function ejecutarEjemplos() {
  try {
    await ejemplosConfiguracion();
    await casoUsoReal();
    console.log('\n🎉 Todos los ejemplos completados');
  } catch (error) {
    console.error('Error en ejemplos:', error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  ejecutarEjemplos().catch(console.error);
}

export { ejecutarEjemplos, ejemplosConfiguracion, casoUsoReal };