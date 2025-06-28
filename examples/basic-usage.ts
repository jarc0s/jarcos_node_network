import { ApiClient, ApiError } from '../src';

// Basic usage example
async function basicExample() {
  console.log('=== Basic Usage Example ===\n');

  // Create a simple API client
  const api = new ApiClient({
    baseURL: 'https://jsonplaceholder.typicode.com',
    timeout: 5000,
    logging: {
      enabled: true,
      level: 'info'
    }
  });

  try {
    // GET request
    console.log('1. Fetching posts...');
    const posts = await api.get('/posts');
    console.log(`✓ Retrieved ${posts.data.length} posts\n`);

    // GET request with parameters
    console.log('2. Fetching specific post...');
    const post = await api.get('/posts/1');
    console.log(`✓ Post title: "${post.data.title}"\n`);

    // POST request
    console.log('3. Creating new post...');
    const newPost = await api.post('/posts', {
      title: 'My New Post',
      body: 'This is the content of my new post.',
      userId: 1
    });
    console.log(`✓ Created post with ID: ${newPost.data.id}\n`);

    // PUT request
    console.log('4. Updating post...');
    const updatedPost = await api.put('/posts/1', {
      id: 1,
      title: 'Updated Post Title',
      body: 'Updated content.',
      userId: 1
    });
    console.log(`✓ Updated post title: "${updatedPost.data.title}"\n`);

    // DELETE request
    console.log('5. Deleting post...');
    await api.delete('/posts/1');
    console.log('✓ Post deleted successfully\n');

  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`✗ API Error: ${error.message} (Code: ${error.code})`);
      if (error.status) {
        console.error(`✗ HTTP Status: ${error.status}`);
      }
    } else {
      console.error('✗ Unexpected error:', error);
    }
  }
}

// Run the example
if (require.main === module) {
  basicExample()
    .then(() => console.log('Example completed!'))
    .catch(console.error);
}

export { basicExample };