// Ejemplo para usuarios de JavaScript puro (Node.js)
const { ApiClient, ApiError } = require('@jarcos/api-service-library');

// Configuración básica
const api = new ApiClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 30000,
  logging: {
    enabled: true,
    level: 'info'
  }
});

// Función de ejemplo
async function example() {
  try {
    console.log('🚀 Testing API Library in Node.js...\n');
    
    // GET request
    const posts = await api.get('/posts');
    console.log(`✅ Retrieved ${posts.data.length} posts`);
    
    // POST request
    const newPost = await api.post('/posts', {
      title: 'Test Post',
      body: 'This is a test post from Node.js',
      userId: 1
    });
    console.log(`✅ Created post with ID: ${newPost.data.id}`);
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`❌ API Error: ${error.message}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Status: ${error.status}`);
    } else {
      console.error('❌ Unexpected error:', error.message);
    }
  }
}

// Ejecutar ejemplo
if (require.main === module) {
  example();
}

module.exports = { example };