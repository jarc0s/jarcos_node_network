import { DeduplicationManager } from '../src/deduplication/deduplication-manager';
import { Logger } from '../src/logging/logger';

describe('DeduplicationManager', () => {
  let deduplicationManager: DeduplicationManager;
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger({ enabled: true, level: 'debug' });
    deduplicationManager = new DeduplicationManager({ enabled: true }, logger);
  });

  afterEach(() => {
    deduplicationManager.clear();
  });

  describe('Basic Deduplication', () => {
    test('should deduplicate identical requests', async () => {
      let callCount = 0;
      const mockRequest = jest.fn(async () => {
        callCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
        return { data: `Result ${callCount}`, status: 200 };
      });

      // Execute two identical requests simultaneously
      const [result1, result2] = await Promise.all([
        deduplicationManager.executeRequest('GET', '/api/users', mockRequest),
        deduplicationManager.executeRequest('GET', '/api/users', mockRequest)
      ]);

      // Should only call the request once
      expect(mockRequest).toHaveBeenCalledTimes(1);
      
      // Both results should be identical
      expect(result1).toEqual(result2);
      expect(result1.data).toBe('Result 1');
    });

    test('should not deduplicate different requests', async () => {
      const mockRequest = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: 'Result', status: 200 };
      });

      // Execute different requests simultaneously
      await Promise.all([
        deduplicationManager.executeRequest('GET', '/api/users', mockRequest),
        deduplicationManager.executeRequest('GET', '/api/posts', mockRequest)
      ]);

      // Should call the request twice for different endpoints
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    test('should not deduplicate requests with different methods', async () => {
      const mockRequest = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: 'Result', status: 200 };
      });

      // Execute requests with different methods
      await Promise.all([
        deduplicationManager.executeRequest('GET', '/api/users', mockRequest),
        deduplicationManager.executeRequest('POST', '/api/users', mockRequest, { name: 'John' })
      ]);

      // Should call the request twice for different methods
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    test('should not deduplicate requests with different data', async () => {
      const mockRequest = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: 'Result', status: 200 };
      });

      // Execute POST requests with different data
      await Promise.all([
        deduplicationManager.executeRequest('POST', '/api/users', mockRequest, { name: 'John' }),
        deduplicationManager.executeRequest('POST', '/api/users', mockRequest, { name: 'Jane' })
      ]);

      // Should call the request twice for different data
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('Sequential Requests', () => {
    test('should allow sequential identical requests', async () => {
      const mockRequest = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: 'Result', status: 200 };
      });

      // Execute first request
      await deduplicationManager.executeRequest('GET', '/api/users', mockRequest);
      
      // Execute second identical request after first completes
      await deduplicationManager.executeRequest('GET', '/api/users', mockRequest);

      // Should call the request twice since they're sequential
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    test('should propagate errors to all duplicate requests', async () => {
      const mockError = new Error('Request failed');
      const mockRequest = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        throw mockError;
      });

      // Execute two identical requests that will fail
      const promises = [
        deduplicationManager.executeRequest('GET', '/api/users', mockRequest),
        deduplicationManager.executeRequest('GET', '/api/users', mockRequest)
      ];

      // Both should reject with the same error
      await expect(Promise.all(promises)).rejects.toEqual(mockError);
      
      // Should only call the request once
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('Stats Tracking', () => {
    test('should track deduplication stats correctly', async () => {
      // Create a fresh instance for this test to avoid interference
      const debugLogger = new Logger({ enabled: true, level: 'debug' });
      const freshManager = new DeduplicationManager({ enabled: true }, debugLogger);
      
      let usersCallCount = 0;
      let postsCallCount = 0;
      
      const mockUsersRequest = async () => {
        usersCallCount++;
        console.log(`Users request ${usersCallCount} called`);
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: `UsersResult${usersCallCount}`, status: 200 };
      };
      
      const mockPostsRequest = async () => {
        postsCallCount++;
        console.log(`Posts request ${postsCallCount} called`);
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: `PostsResult${postsCallCount}`, status: 200 };
      };

      console.log('Starting requests...');
      
      // Execute some requests one by one to check the behavior
      console.log('First request to /api/users...');
      const promise1 = freshManager.executeRequest('GET', '/api/users', mockUsersRequest);
      
      console.log('Second request to /api/users (should be deduplicated)...');
      const promise2 = freshManager.executeRequest('GET', '/api/users', mockUsersRequest);
      
      console.log('Third request to /api/posts (different endpoint)...');
      const promise3 = freshManager.executeRequest('GET', '/api/posts', mockPostsRequest);

      const results = await Promise.all([promise1, promise2, promise3]);
      console.log('Results:', results);

      const stats = freshManager.getStats();
      console.log('Final stats:', stats);
      
      expect(stats.totalRequests).toBe(3);
      expect(stats.deduplicatedRequests).toBe(1);
      expect(stats.activeRequests).toBe(0); // All completed
      
      // Should only call users once and posts once
      expect(usersCallCount).toBe(1);
      expect(postsCallCount).toBe(1);
      
      // First two results should be identical (from the same users request)
      expect(results[0]).toEqual(results[1]);
      // Third result should be different (from posts request)
      expect(results[2]).not.toEqual(results[0]);
      
      // Calculate expected rate: 1 deduplicated out of 3 total = 33.33%
      const expectedRate = (1 / 3) * 100;
      expect(stats.deduplicationRate).toBeCloseTo(expectedRate, 0);
      
      // Clean up
      freshManager.clear();
    });
  });

  describe('Configuration', () => {
    test('should respect enabled/disabled state', async () => {
      const disabledManager = new DeduplicationManager({ enabled: false }, logger);
      
      const mockRequest = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return { data: 'Result', status: 200 };
      });

      // Execute identical requests with disabled deduplication
      await Promise.all([
        disabledManager.executeRequest('GET', '/api/users', mockRequest),
        disabledManager.executeRequest('GET', '/api/users', mockRequest)
      ]);

      // Should call the request twice since deduplication is disabled
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    test('should use custom key generator when provided', async () => {
      const customKeyGen = jest.fn((method: string, url: string) => `custom:${method}:${url}`);
      const customManager = new DeduplicationManager(
        { enabled: true, keyGenerator: customKeyGen },
        logger
      );

      const mockRequest = jest.fn(async () => ({ data: 'Result', status: 200 }));

      await customManager.executeRequest('GET', '/api/users', mockRequest);

      expect(customKeyGen).toHaveBeenCalledWith('GET', '/api/users', undefined, undefined);
      
      customManager.clear();
    });
  });

  describe('Cleanup', () => {
    test('should clear all pending requests', () => {
      expect(deduplicationManager.getPendingRequestsCount()).toBe(0);
      
      // Start a long running request
      const mockRequest = jest.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { data: 'Result', status: 200 };
      });

      deduplicationManager.executeRequest('GET', '/api/users', mockRequest);
      
      expect(deduplicationManager.getPendingRequestsCount()).toBe(1);
      
      deduplicationManager.clear();
      
      expect(deduplicationManager.getPendingRequestsCount()).toBe(0);
    });
  });
});