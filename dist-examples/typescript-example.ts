// Ejemplo para usuarios de TypeScript
import { ApiClient, ApiError, AuthError } from '@jarcos/api-service-library';

// Definir interfaces para tu API
interface User {
  id: number;
  name: string;
  email: string;
}

interface Post {
  id: number;
  title: string;
  body: string;
  userId: number;
}

// Configuración con tipos
const api = new ApiClient({
  baseURL: 'https://jsonplaceholder.typicode.com',
  timeout: 30000,
  environment: 'development',
  auth: {
    enabled: false // Para este ejemplo
  },
  cache: {
    enabled: true,
    defaultTTL: 300000 // 5 minutos
  },
  retry: {
    enabled: true,
    maxAttempts: 3,
    baseDelay: 1000
  },
  logging: {
    enabled: true,
    level: 'info',
    logRequests: true,
    logResponses: false
  }
});

// Clase de servicio tipada
class JsonPlaceholderService {
  async getUsers(): Promise<User[]> {
    try {
      const response = await api.get<User[]>('/users');
      return response.data;
    } catch (error) {
      this.handleError('getUsers', error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<User> {
    try {
      const response = await api.get<User>(`/users/${id}`);
      return response.data;
    } catch (error) {
      this.handleError('getUserById', error);
      throw error;
    }
  }

  async getPosts(): Promise<Post[]> {
    try {
      const response = await api.get<Post[]>('/posts', {
        cache: { ttl: 600000 } // 10 minutos para posts
      });
      return response.data;
    } catch (error) {
      this.handleError('getPosts', error);
      throw error;
    }
  }

  async createPost(post: Omit<Post, 'id'>): Promise<Post> {
    try {
      const response = await api.post<Post>('/posts', post);
      return response.data;
    } catch (error) {
      this.handleError('createPost', error);
      throw error;
    }
  }

  private handleError(method: string, error: unknown): void {
    if (error instanceof ApiError) {
      console.error(`❌ ${method} failed:`, {
        message: error.message,
        code: error.code,
        status: error.status,
        url: error.url,
        method: error.method
      });
    } else {
      console.error(`❌ ${method} unexpected error:`, error);
    }
  }
}

// Función de ejemplo principal
async function typescriptExample(): Promise<void> {
  console.log('🚀 Testing API Library in TypeScript...\n');
  
  const service = new JsonPlaceholderService();

  try {
    // Test 1: Get all users
    console.log('1. Fetching users...');
    const users = await service.getUsers();
    console.log(`✅ Retrieved ${users.length} users`);
    console.log(`   First user: ${users[0]?.name} (${users[0]?.email})\n`);

    // Test 2: Get specific user
    console.log('2. Fetching specific user...');
    const user = await service.getUserById(1);
    console.log(`✅ User: ${user.name}`);
    console.log(`   Email: ${user.email}\n`);

    // Test 3: Get posts (with cache)
    console.log('3. Fetching posts (will be cached)...');
    const startTime = Date.now();
    const posts = await service.getPosts();
    const duration1 = Date.now() - startTime;
    console.log(`✅ Retrieved ${posts.length} posts in ${duration1}ms`);

    // Test 4: Get posts again (from cache)
    console.log('4. Fetching posts again (should be faster from cache)...');
    const startTime2 = Date.now();
    const cachedPosts = await service.getPosts();
    const duration2 = Date.now() - startTime2;
    console.log(`✅ Retrieved ${cachedPosts.length} posts in ${duration2}ms`);
    console.log(`   Speed improvement: ${Math.round(((duration1 - duration2) / duration1) * 100)}%\n`);

    // Test 5: Create new post
    console.log('5. Creating new post...');
    const newPost = await service.createPost({
      title: 'TypeScript Test Post',
      body: 'This post was created using TypeScript with full type safety!',
      userId: 1
    });
    console.log(`✅ Created post with ID: ${newPost.id}`);
    console.log(`   Title: "${newPost.title}"\n`);

    // Test 6: Get cache statistics
    console.log('6. Cache statistics:');
    const cacheStats = api.getCacheStats();
    console.log(`✅ Cache hits: ${cacheStats.hits}`);
    console.log(`✅ Cache misses: ${cacheStats.misses}`);
    console.log(`✅ Hit rate: ${Math.round(cacheStats.hitRate * 100)}%\n`);

    // Test 7: Get retry statistics
    console.log('7. Retry statistics:');
    const retryStats = api.getRetryStats();
    console.log(`✅ Total attempts: ${retryStats.totalAttempts}`);
    console.log(`✅ Successful retries: ${retryStats.successfulRetries}`);
    console.log(`✅ Failed retries: ${retryStats.failedRetries}\n`);

    console.log('🎉 All TypeScript tests passed!');

  } catch (error) {
    if (error instanceof AuthError) {
      console.error('🔐 Authentication error:', error.message);
    } else if (error instanceof ApiError) {
      console.error('🚨 API error:', {
        message: error.message,
        code: error.code,
        status: error.status
      });
    } else {
      console.error('💥 Unexpected error:', error);
    }
  }
}

// Ejecutar ejemplo si es el archivo principal
if (require.main === module) {
  typescriptExample()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Example failed:', error);
      process.exit(1);
    });
}

export { typescriptExample, JsonPlaceholderService };