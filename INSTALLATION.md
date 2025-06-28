# 📦 Guía de Instalación

## 🚀 Instalación desde GitHub

### Método 1: Instalación directa
```bash
npm install git+https://github.com/jarcos/api-service-library.git
```

### Método 2: Con tag específico
```bash
npm install git+https://github.com/jarcos/api-service-library.git#v1.0.0
```

### Método 3: Desde una rama específica
```bash
npm install git+https://github.com/jarcos/api-service-library.git#main
```

## 🔧 Instalación de dependencias

La librería requiere Axios como peer dependency:

```bash
npm install axios
```

## 📋 Verificación de instalación

Después de instalar, puedes verificar que funciona:

```typescript
import { ApiClient } from '@jarcos/api-service-library';

const api = new ApiClient({
  baseURL: 'https://jsonplaceholder.typicode.com'
});

// Test básico
api.get('/posts/1')
  .then(response => console.log('✅ Librería funcionando!', response.data))
  .catch(error => console.error('❌ Error:', error));
```

## 🏗️ Para desarrollo local

Si quieres modificar la librería:

```bash
# Clonar repositorio
git clone https://github.com/jarcos/api-service-library.git
cd api-service-library

# Instalar dependencias
npm install

# Compilar
npm run build

# Correr ejemplos
npm run example:basic
```

## 🔄 Actualización

Para actualizar a la última versión:

```bash
npm update @jarcos/api-service-library
```

O reinstalar:

```bash
npm uninstall @jarcos/api-service-library
npm install git+https://github.com/jarcos/api-service-library.git
```

## 🧪 Testing

Para asegurar que todo funciona en tu proyecto:

```bash
# En tu proyecto
npm test
```

## 🆘 Solución de problemas

### Error: "Cannot resolve module"
```bash
# Limpiar cache y reinstalar
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Error de TypeScript
Asegúrate de que tu `tsconfig.json` incluye:
```json
{
  "compilerOptions": {
    "moduleResolution": "node",
    "esModuleInterop": true
  }
}
```

### Error de peer dependencies
```bash
npm install axios@^1.0.0
```