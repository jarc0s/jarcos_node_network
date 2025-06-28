import { ApiClient, ApiError, NetworkError, AuthError, ValidationError, RetryExhaustedError, ErrorCode } from '../src';

// Error handling examples
async function errorHandlingExample() {
  console.log('=== Error Handling Example ===\n');

  const api = new ApiClient({
    baseURL: 'https://httpbin.org',
    retry: {
      enabled: true,
      maxAttempts: 3,
      baseDelay: 1000
    },
    logging: {
      enabled: true,
      level: 'info',
      logErrors: true,
      logRetries: true
    }
  });

  // 1. Handle 404 Not Found
  try {
    console.log('1. Testing 404 Not Found...');
    await api.get('/status/404');
  } catch (error) {
    if (error instanceof ApiError) {
      console.log(`✓ Caught API Error: ${error.message}`);
      console.log(`✓ Error Code: ${error.code}`);
      console.log(`✓ HTTP Status: ${error.status}`);
      console.log(`✓ Is Retryable: ${error.isRetryable}\n`);
    }
  }

  // 2. Handle 500 Server Error (retryable)
  try {
    console.log('2. Testing 500 Server Error (with retries)...');
    await api.get('/status/500');
  } catch (error) {
    if (error instanceof ApiError) {
      console.log(`✓ Caught API Error after retries: ${error.message}`);
      console.log(`✓ Error Code: ${error.code}`);
      console.log(`✓ HTTP Status: ${error.status}`);
      console.log(`✓ Is Retryable: ${error.isRetryable}\n`);
    }
  }

  // 3. Handle 429 Rate Limited
  try {
    console.log('3. Testing 429 Rate Limited...');
    await api.get('/status/429');
  } catch (error) {
    if (error instanceof ApiError) {
      console.log(`✓ Caught Rate Limit Error: ${error.message}`);
      console.log(`✓ Error Code: ${error.code}`);
      console.log(`✓ Is Retryable: ${error.isRetryable}\n`);
    }
  }

  // 4. Handle network timeout
  try {
    console.log('4. Testing timeout...');
    const timeoutApi = new ApiClient({
      baseURL: 'https://httpbin.org',
      timeout: 1000, // Very short timeout
      logging: { enabled: false }
    });
    
    await timeoutApi.get('/delay/5'); // This endpoint delays for 5 seconds
  } catch (error) {
    if (error instanceof ApiError) {
      console.log(`✓ Caught Timeout Error: ${error.message}`);
      console.log(`✓ Error Code: ${error.code}\n`);
    }
  }
}

// Retry error handling example
async function retryErrorExample() {
  console.log('=== Retry Error Handling Example ===\n');

  const api = new ApiClient({
    baseURL: 'https://httpbin.org',
    retry: {
      enabled: true,
      maxAttempts: 3,
      baseDelay: 500,
      backoffFactor: 2
    },
    logging: {
      enabled: true,
      level: 'info',
      logRetries: true
    }
  });

  try {
    console.log('Testing retry exhaustion with 500 errors...');
    await api.get('/status/500');
  } catch (error) {
    if (error instanceof RetryExhaustedError) {
      console.log(`✓ Caught Retry Exhausted Error: ${error.message}`);
      console.log(`✓ Total Attempts: ${error.attempts}`);
      console.log(`✓ Last Error: ${error.lastError.message}\n`);
    }
  }

  // Show retry stats
  const retryStats = api.getRetryStats();
  console.log('Retry Statistics:');
  console.log(`✓ Total Attempts: ${retryStats.totalAttempts}`);
  console.log(`✓ Successful Retries: ${retryStats.successfulRetries}`);
  console.log(`✓ Failed Retries: ${retryStats.failedRetries}\n`);
}

// Custom error handling example
async function customErrorHandlingExample() {
  console.log('=== Custom Error Handling Example ===\n');

  const api = new ApiClient({
    baseURL: 'https://httpbin.org',
    logging: { enabled: false }
  });

  // Custom error handler function
  function handleApiError(error: unknown): void {
    if (error instanceof ApiError) {
      switch (error.code) {
        case ErrorCode.NOT_FOUND:
          console.log(`🔍 Resource not found: ${error.message}`);
          break;
        case ErrorCode.UNAUTHORIZED:
          console.log(`🔐 Authentication required: ${error.message}`);
          break;
        case ErrorCode.FORBIDDEN:
          console.log(`🚫 Access denied: ${error.message}`);
          break;
        case ErrorCode.RATE_LIMITED:
          console.log(`⏱️ Rate limited: ${error.message}`);
          break;
        case ErrorCode.SERVER_ERROR:
          console.log(`🔥 Server error: ${error.message}`);
          break;
        case ErrorCode.NETWORK_ERROR:
          console.log(`🌐 Network error: ${error.message}`);
          break;
        default:
          console.log(`❌ API error: ${error.message} (${error.code})`);
      }
      
      // Log additional error details if available
      if (error.status) {
        console.log(`   HTTP Status: ${error.status}`);
      }
      if (error.requestId) {
        console.log(`   Request ID: ${error.requestId}`);
      }
    } else {
      console.log(`💥 Unexpected error: ${error}`);
    }
  }

  // Test different error scenarios
  const testCases = [
    { url: '/status/400', description: 'Bad Request' },
    { url: '/status/401', description: 'Unauthorized' },
    { url: '/status/403', description: 'Forbidden' },
    { url: '/status/404', description: 'Not Found' },
    { url: '/status/429', description: 'Rate Limited' },
    { url: '/status/500', description: 'Server Error' }
  ];

  for (const testCase of testCases) {
    try {
      console.log(`Testing ${testCase.description}...`);
      await api.get(testCase.url);
    } catch (error) {
      handleApiError(error);
      console.log('');
    }
  }
}

// Error details and debugging example
async function errorDebuggingExample() {
  console.log('=== Error Debugging Example ===\n');

  const api = new ApiClient({
    baseURL: 'https://httpbin.org',
    logging: {
      enabled: true,
      level: 'debug',
      logErrors: true,
      logRequests: true,
      logResponses: true
    }
  });

  try {
    console.log('Making request with detailed error logging...');
    await api.post('/status/422', {
      invalid: 'data'
    });
  } catch (error) {
    if (error instanceof ApiError) {
      console.log('\n🐛 Detailed Error Information:');
      console.log(`Message: ${error.message}`);
      console.log(`Code: ${error.code}`);
      console.log(`Status: ${error.status}`);
      console.log(`URL: ${error.url}`);
      console.log(`Method: ${error.method}`);
      console.log(`Timestamp: ${new Date(error.timestamp).toISOString()}`);
      console.log(`Is Retryable: ${error.isRetryable}`);
      
      if (error.data) {
        console.log(`Response Data:`, JSON.stringify(error.data, null, 2));
      }
      
      if (error.headers) {
        console.log(`Response Headers:`, error.headers);
      }

      // Convert error to JSON for logging/reporting
      console.log('\n📄 Error as JSON:');
      console.log(JSON.stringify(error.toJSON(), null, 2));
    }
  }
}

// Validation error example
async function validationErrorExample() {
  console.log('=== Validation Error Example ===\n');

  try {
    // This should trigger validation errors
    const api = new ApiClient({
      baseURL: 'invalid-url', // Invalid URL
      timeout: -1000 // Invalid timeout
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`✓ Caught Validation Error: ${error.message}`);
      console.log(`✓ Field: ${error.field}`);
      console.log(`✓ Value: ${error.value}\n`);
    }
  }

  try {
    const api = new ApiClient();
    // Try to make request with invalid method
    await (api as any).request('INVALID_METHOD', '/test');
  } catch (error) {
    if (error instanceof ValidationError) {
      console.log(`✓ Caught Method Validation Error: ${error.message}\n`);
    }
  }
}

// Run the examples
if (require.main === module) {
  Promise.resolve()
    .then(() => errorHandlingExample())
    .then(() => retryErrorExample())
    .then(() => customErrorHandlingExample())
    .then(() => errorDebuggingExample())
    .then(() => validationErrorExample())
    .then(() => console.log('Error handling examples completed!'))
    .catch(console.error);
}

export { 
  errorHandlingExample, 
  retryErrorExample, 
  customErrorHandlingExample, 
  errorDebuggingExample,
  validationErrorExample 
};