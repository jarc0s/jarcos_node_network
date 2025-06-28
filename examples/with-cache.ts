import { ApiClient } from '../src';

// Cache usage example
async function cacheExample() {
  console.log('=== Cache Usage Example ===\n');

  // Create API client with caching enabled
  const api = new ApiClient({
    baseURL: 'https://jsonplaceholder.typicode.com',
    cache: {
      enabled: true,
      defaultTTL: 30000, // 30 seconds
      maxSize: 100
    },
    logging: {
      enabled: true,
      level: 'info',
      logCache: true
    }
  });

  try {
    // 1. First request - will be cached
    console.log('1. First request (will be cached)...');
    const startTime1 = Date.now();
    const posts1 = await api.get('/posts');
    const duration1 = Date.now() - startTime1;
    console.log(`✓ Retrieved ${posts1.data.length} posts in ${duration1}ms`);
    console.log(`✓ From cache: ${posts1.fromCache ? 'Yes' : 'No'}\n`);

    // 2. Second request - should come from cache (faster)
    console.log('2. Second request (should be from cache)...');
    const startTime2 = Date.now();
    const posts2 = await api.get('/posts');
    const duration2 = Date.now() - startTime2;
    console.log(`✓ Retrieved ${posts2.data.length} posts in ${duration2}ms`);
    console.log(`✓ From cache: ${posts2.fromCache ? 'Yes' : 'No'}`);
    console.log(`✓ Speed improvement: ${Math.round(((duration1 - duration2) / duration1) * 100)}%\n`);

    // 3. Request with custom cache options
    console.log('3. Request with custom cache TTL...');
    const specificPost = await api.get('/posts/1', {
      cache: {
        ttl: 60000 // 1 minute
      }
    });
    console.log(`✓ Post cached with custom TTL: "${specificPost.data.title}"\n`);

    // 4. Request skipping cache
    console.log('4. Request skipping cache...');
    const startTime3 = Date.now();
    const posts3 = await api.get('/posts', {
      skipCache: true
    });
    const duration3 = Date.now() - startTime3;
    console.log(`✓ Retrieved ${posts3.data.length} posts in ${duration3}ms (cache skipped)`);
    console.log(`✓ From cache: ${posts3.fromCache ? 'Yes' : 'No'}\n`);

    // 5. Cache statistics
    console.log('5. Cache statistics:');
    const stats = api.getCacheStats();
    console.log(`✓ Hits: ${stats.hits}`);
    console.log(`✓ Misses: ${stats.misses}`);
    console.log(`✓ Hit rate: ${Math.round(stats.hitRate * 100)}%`);
    console.log(`✓ Current size: ${stats.size} items\n`);

    // 6. Cache invalidation
    console.log('6. Invalidating cache...');
    const invalidated = await api.invalidateCache('/posts');
    console.log(`✓ Invalidated ${invalidated} cache entries\n`);

    // 7. Request after cache invalidation
    console.log('7. Request after cache invalidation...');
    const startTime4 = Date.now();
    const posts4 = await api.get('/posts');
    const duration4 = Date.now() - startTime4;
    console.log(`✓ Retrieved ${posts4.data.length} posts in ${duration4}ms`);
    console.log(`✓ From cache: ${posts4.fromCache ? 'Yes' : 'No'}\n`);

  } catch (error) {
    console.error('✗ Error:', error);
  }
}

// Advanced cache example with different HTTP methods
async function advancedCacheExample() {
  console.log('=== Advanced Cache Example ===\n');

  const api = new ApiClient({
    baseURL: 'https://jsonplaceholder.typicode.com',
    cache: {
      enabled: true,
      defaultTTL: 10000, // 10 seconds for demo
      maxSize: 50
    },
    logging: {
      enabled: true,
      level: 'debug',
      logCache: true
    }
  });

  try {
    // Only GET requests are cached by default
    console.log('1. Testing different HTTP methods...');
    
    // GET - will be cached
    const getResponse = await api.get('/posts/1');
    console.log(`✓ GET from cache: ${getResponse.fromCache ? 'Yes' : 'No'}`);
    
    // GET again - should be from cache
    const getResponse2 = await api.get('/posts/1');
    console.log(`✓ GET from cache: ${getResponse2.fromCache ? 'Yes' : 'No'}`);

    // POST - will not be cached (cache is for GET only by default)
    const postResponse = await api.post('/posts', {
      title: 'Test',
      body: 'Test body',
      userId: 1
    });
    console.log(`✓ POST from cache: ${postResponse.fromCache ? 'Yes' : 'No'}\n`);

    // 2. Testing cache key generation
    console.log('2. Testing cache key variations...');
    
    // Same URL, different query params - different cache keys
    await api.get('/posts', { params: { userId: 1 } });
    await api.get('/posts', { params: { userId: 2 } });
    await api.get('/posts'); // No params
    
    const stats = api.getCacheStats();
    console.log(`✓ Cache entries after param variations: ${stats.size}\n`);

    // 3. Testing cache expiration
    console.log('3. Testing cache expiration...');
    console.log('Waiting for cache to expire...');
    
    // Wait for cache to expire (using short TTL)
    await new Promise(resolve => setTimeout(resolve, 11000));
    
    const expiredResponse = await api.get('/posts/1');
    console.log(`✓ After expiration, from cache: ${expiredResponse.fromCache ? 'Yes' : 'No'}\n`);

  } catch (error) {
    console.error('✗ Error:', error);
  }
}

// Cache with custom adapter example
async function customCacheExample() {
  console.log('=== Custom Cache Adapter Example ===\n');

  // Simple custom cache adapter (in-memory with logging)
  class LoggingCacheAdapter {
    private cache = new Map();

    get(key: string) {
      console.log(`🔍 Cache GET: ${key}`);
      return this.cache.get(key) || null;
    }

    set(key: string, value: any) {
      console.log(`💾 Cache SET: ${key}`);
      this.cache.set(key, value);
    }

    delete(key: string) {
      console.log(`🗑️ Cache DELETE: ${key}`);
      return this.cache.delete(key);
    }

    clear() {
      console.log(`🧹 Cache CLEAR: all entries`);
      this.cache.clear();
    }

    has(key: string) {
      return this.cache.has(key);
    }

    keys() {
      return Array.from(this.cache.keys());
    }

    size() {
      return this.cache.size;
    }
  }

  const api = new ApiClient({
    baseURL: 'https://jsonplaceholder.typicode.com',
    cache: {
      enabled: true,
      defaultTTL: 30000,
      adapter: new LoggingCacheAdapter()
    },
    logging: {
      enabled: false // Disable to see only cache logs
    }
  });

  try {
    console.log('Making requests with custom cache adapter...\n');
    
    await api.get('/posts/1');
    await api.get('/posts/1'); // Should hit cache
    await api.get('/posts/2');
    
    console.log('\n✓ Custom cache adapter example completed');

  } catch (error) {
    console.error('✗ Error:', error);
  }
}

// Run the examples
if (require.main === module) {
  Promise.resolve()
    .then(() => cacheExample())
    .then(() => advancedCacheExample())
    .then(() => customCacheExample())
    .then(() => console.log('Cache examples completed!'))
    .catch(console.error);
}

export { cacheExample, advancedCacheExample, customCacheExample };