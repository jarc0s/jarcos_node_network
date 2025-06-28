import { ApiClient, ApiError, AuthError } from '../src';

// Authentication example
async function authExample() {
  console.log('=== Authentication Example ===\n');

  // Create API client with authentication enabled
  const api = new ApiClient({
    baseURL: 'https://reqres.in/api',
    auth: {
      enabled: true,
      tokenStorage: 'memory', // Use memory storage for demo
      loginEndpoint: '/login',
      refreshEndpoint: '/refresh', // Note: reqres.in doesn't support refresh
      autoRefresh: true,
      refreshThreshold: 300000 // 5 minutes
    },
    logging: {
      enabled: true,
      level: 'info',
      logAuth: true
    }
  });

  try {
    // 1. Login with valid credentials
    console.log('1. Logging in...');
    const authResponse = await api.login({
      email: 'eve.holt@reqres.in',
      password: 'cityslicka'
    });
    console.log(`✓ Login successful! Token: ${authResponse.accessToken.substring(0, 20)}...\n`);

    // 2. Make an authenticated request (token will be added automatically)
    console.log('2. Making authenticated request...');
    const users = await api.get('/users', {
      // Auth token will be added automatically via interceptor
    });
    console.log(`✓ Retrieved ${users.data.data.length} users\n`);

    // 3. Make a request without auth (skip auth interceptor)
    console.log('3. Making request without auth...');
    const publicData = await api.get('/users', {
      skipAuth: true // This will skip adding the auth token
    });
    console.log(`✓ Retrieved public data: ${publicData.data.data.length} users\n`);

    // 4. Logout
    console.log('4. Logging out...');
    await api.logout();
    console.log('✓ Logged out successfully\n');

    // 5. Try to make authenticated request after logout (should work but without token)
    console.log('5. Making request after logout...');
    const afterLogout = await api.get('/users');
    console.log(`✓ Request successful (no auth required by this endpoint)\n`);

  } catch (error) {
    if (error instanceof AuthError) {
      console.error(`✗ Authentication Error: ${error.message} (Code: ${error.code})`);
      if (error.status) {
        console.error(`✗ HTTP Status: ${error.status}`);
      }
    } else if (error instanceof ApiError) {
      console.error(`✗ API Error: ${error.message} (Code: ${error.code})`);
    } else {
      console.error('✗ Unexpected error:', error);
    }
  }
}

// Advanced authentication example with manual token management
async function manualTokenExample() {
  console.log('=== Manual Token Management Example ===\n');

  const api = new ApiClient({
    baseURL: 'https://httpbin.org',
    auth: {
      enabled: true,
      tokenStorage: 'memory'
    },
    logging: {
      enabled: true,
      level: 'debug'
    }
  });

  // Manually set a token (simulating getting it from somewhere else)
  await (api as any).authManager.setTokens({
    accessToken: 'my-custom-token-12345',
    tokenType: 'Bearer'
  });

  try {
    // This request will include the Authorization header
    console.log('Making request with manual token...');
    const response = await api.get('/headers');
    
    // Check if our token was included
    const headers = response.data.headers;
    console.log('Request headers sent:');
    console.log(`Authorization: ${headers.Authorization || 'Not present'}\n`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Error handling example
async function authErrorExample() {
  console.log('=== Authentication Error Handling Example ===\n');

  const api = new ApiClient({
    baseURL: 'https://reqres.in/api',
    auth: {
      enabled: true,
      tokenStorage: 'memory'
    },
    logging: {
      enabled: true,
      level: 'warn'
    }
  });

  try {
    // Try to login with invalid credentials
    console.log('Attempting login with invalid credentials...');
    await api.login({
      email: 'invalid@email.com',
      password: 'wrongpassword'
    });
    
  } catch (error) {
    if (error instanceof AuthError) {
      console.log(`✓ Caught expected auth error: ${error.message}`);
      console.log(`✓ Error code: ${error.code}`);
      console.log(`✓ HTTP status: ${error.status}\n`);
    }
  }

  // Try to refresh token without having one
  try {
    console.log('Attempting to refresh token without valid token...');
    await api.refreshToken();
    
  } catch (error) {
    if (error instanceof AuthError) {
      console.log(`✓ Caught expected refresh error: ${error.message}`);
      console.log(`✓ Error code: ${error.code}\n`);
    }
  }
}

// Run the examples
if (require.main === module) {
  Promise.resolve()
    .then(() => authExample())
    .then(() => manualTokenExample())
    .then(() => authErrorExample())
    .then(() => console.log('Authentication examples completed!'))
    .catch(console.error);
}

export { authExample, manualTokenExample, authErrorExample };