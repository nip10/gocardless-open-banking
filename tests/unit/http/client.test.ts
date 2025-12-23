import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpClient } from '../../../src/http/client';
import { TokenManager } from '../../../src/auth/token-manager';
import { GoCardlessAPIError } from '../../../src/errors/api-error';
import type { HTTPError } from 'ky';

// Mock ky module
const { mockKy, mockKyCreate } = vi.hoisted(() => ({
  mockKy: vi.fn(),
  mockKyCreate: vi.fn(),
}));

// Configure mockKyCreate to return mockKy
mockKyCreate.mockReturnValue(mockKy);

vi.mock('ky', () => ({
  default: {
    create: mockKyCreate,
  },
}));

// Mock TokenManager
vi.mock('../../../src/auth/token-manager');

// Mock sleep to avoid delays in tests
const { mockSleep } = vi.hoisted(() => ({
  mockSleep: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/utils/backoff', async () => {
  const actual = await vi.importActual('../../../src/utils/backoff');
  return {
    ...actual,
    sleep: mockSleep,
  };
});

// Helper to create mock Headers object
function createMockHeaders(headers: Record<string, string> = {}): Headers {
  const mockHeaders = new Map(Object.entries(headers));
  return {
    get: (name: string) => mockHeaders.get(name.toLowerCase()) || null,
    has: (name: string) => mockHeaders.has(name.toLowerCase()),
    entries: () => mockHeaders.entries(),
  } as Headers;
}

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let mockTokenManager: TokenManager;
  const BASE_URL = 'https://bankaccountdata.gocardless.com';
  const TIMEOUT = 30000;

  beforeEach(() => {
    mockTokenManager = new TokenManager('test-id', 'test-key', BASE_URL);
    vi.mocked(mockTokenManager.getAccessToken).mockResolvedValue(
      'test-access-token',
    );
    mockKy.mockReset();
    mockKyCreate.mockClear();
    mockKyCreate.mockReturnValue(mockKy);
    mockSleep.mockClear();
  });

  describe('constructor', () => {
    it('should initialize with default retry config', () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});

      expect(httpClient).toBeInstanceOf(HttpClient);
    });

    it('should initialize with custom retry config', () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {
        maxRetries: 5,
        retryableStatusCodes: [429, 503],
        backoff: 'exponential',
        initialDelayMs: 500,
        maxDelayMs: 60000,
        respectRetryAfter: false,
      });

      expect(httpClient).toBeInstanceOf(HttpClient);
    });

    it('should initialize with request interceptors', () => {
      const requestInterceptor = vi.fn(async (config) => config);

      httpClient = new HttpClient(
        mockTokenManager,
        BASE_URL,
        TIMEOUT,
        {},
        {
          request: [requestInterceptor],
        },
      );

      expect(httpClient).toBeInstanceOf(HttpClient);
    });

    it('should initialize with response interceptors', () => {
      const responseInterceptor = vi.fn(async (response) => response);

      httpClient = new HttpClient(
        mockTokenManager,
        BASE_URL,
        TIMEOUT,
        {},
        {
          response: [responseInterceptor],
        },
      );

      expect(httpClient).toBeInstanceOf(HttpClient);
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});
    });

    describe('get', () => {
      it('should execute GET request successfully', async () => {
        const mockData = { id: '123', name: 'Test' };

        mockKy.mockResolvedValue({
          json: vi.fn().mockResolvedValue(mockData),
          headers: createMockHeaders(),
        });

        const result = await httpClient.get('/test');

        expect(result).toEqual(mockData);
        expect(mockKy).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            method: 'GET',
          }),
        );
      });

      it('should pass options to ky', async () => {
        const mockData = { id: '123' };

        mockKy.mockResolvedValue({
          json: vi.fn().mockResolvedValue(mockData),
          headers: createMockHeaders(),
        });

        await httpClient.get('/test', { searchParams: { foo: 'bar' } });

        expect(mockKy).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            method: 'GET',
            searchParams: { foo: 'bar' },
          }),
        );
      });
    });

    describe('post', () => {
      it('should execute POST request with body', async () => {
        const mockData = { id: '123' };
        const requestBody = { name: 'Test' };

        mockKy.mockResolvedValue({
          json: vi.fn().mockResolvedValue(mockData),
          headers: createMockHeaders(),
        });

        const result = await httpClient.post('/test', requestBody);

        expect(result).toEqual(mockData);
        expect(mockKy).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            method: 'POST',
            json: requestBody,
          }),
        );
      });

      it('should execute POST request without body', async () => {
        const mockData = { success: true };

        mockKy.mockResolvedValue({
          json: vi.fn().mockResolvedValue(mockData),
          headers: createMockHeaders(),
        });

        const result = await httpClient.post('/test');

        expect(result).toEqual(mockData);
        expect(mockKy).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            method: 'POST',
            json: undefined,
          }),
        );
      });
    });

    describe('put', () => {
      it('should execute PUT request with body', async () => {
        const mockData = { id: '123', updated: true };
        const requestBody = { name: 'Updated' };

        mockKy.mockResolvedValue({
          json: vi.fn().mockResolvedValue(mockData),
          headers: createMockHeaders(),
        });

        const result = await httpClient.put('/test', requestBody);

        expect(result).toEqual(mockData);
        expect(mockKy).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            method: 'PUT',
            json: requestBody,
          }),
        );
      });
    });

    describe('delete', () => {
      it('should execute DELETE request', async () => {
        const mockData = { deleted: true };

        mockKy.mockResolvedValue({
          json: vi.fn().mockResolvedValue(mockData),
          headers: createMockHeaders(),
        });

        const result = await httpClient.delete('/test');

        expect(result).toEqual(mockData);
        expect(mockKy).toHaveBeenCalledWith(
          '/test',
          expect.objectContaining({
            method: 'DELETE',
          }),
        );
      });
    });
  });

  describe('authentication', () => {
    it('should configure ky with beforeRequest hook for authentication', () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});

      // Verify ky.create was called with authentication hook
      expect(mockKyCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          hooks: expect.objectContaining({
            beforeRequest: expect.arrayContaining([expect.any(Function)]),
          }),
        }),
      );
    });
  });

  describe('request interceptors', () => {
    it('should configure ky with request interceptors', () => {
      const requestInterceptor = vi.fn(async (config) => config);

      httpClient = new HttpClient(
        mockTokenManager,
        BASE_URL,
        TIMEOUT,
        {},
        {
          request: [requestInterceptor],
        },
      );

      // Verify ky.create was called with beforeRequest hook
      expect(mockKyCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          hooks: expect.objectContaining({
            beforeRequest: expect.arrayContaining([expect.any(Function)]),
          }),
        }),
      );
    });

    it('should store multiple request interceptors', () => {
      const interceptor1 = vi.fn(async (config) => config);
      const interceptor2 = vi.fn(async (config) => config);

      httpClient = new HttpClient(
        mockTokenManager,
        BASE_URL,
        TIMEOUT,
        {},
        {
          request: [interceptor1, interceptor2],
        },
      );

      // HttpClient should be created successfully with multiple interceptors
      expect(httpClient).toBeInstanceOf(HttpClient);
    });
  });

  describe('response interceptors', () => {
    it('should configure ky with response interceptors', () => {
      const responseInterceptor = vi.fn(async (response) => response);

      httpClient = new HttpClient(
        mockTokenManager,
        BASE_URL,
        TIMEOUT,
        {},
        {
          response: [responseInterceptor],
        },
      );

      // Verify ky.create was called with afterResponse hook
      expect(mockKyCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          hooks: expect.objectContaining({
            afterResponse: expect.arrayContaining([expect.any(Function)]),
          }),
        }),
      );
    });
  });

  describe('retry logic', () => {
    beforeEach(() => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {
        maxRetries: 2,
        retryableStatusCodes: [429],
        backoff: 'linear',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        respectRetryAfter: true,
      });
    });

    it('should retry on 429 status code', async () => {
      const error = new Error('Too Many Requests') as HTTPError;
      (error as any).response = {
        status: 429,
        json: vi.fn().mockResolvedValue({
          summary: 'Rate limit exceeded',
          detail: 'Please try again in 60 seconds',
        }),
        headers: createMockHeaders(),
      };

      const mockData = { success: true };

      mockKy
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(mockData),
          headers: createMockHeaders(),
        });

      const result = await httpClient.get('/test');

      expect(result).toEqual(mockData);
      expect(mockKy).toHaveBeenCalledTimes(3);
    });

    it('should respect retry-after header', async () => {
      // Create client with higher maxDelayMs to avoid capping
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {
        maxRetries: 1,
        retryableStatusCodes: [429],
        maxDelayMs: 120000, // Allow up to 120 seconds
        respectRetryAfter: true,
      });

      const error = new Error('Too Many Requests') as HTTPError;
      (error as any).response = {
        status: 429,
        json: vi.fn().mockResolvedValue({
          summary: 'Rate limit exceeded',
          detail: 'Please try again in 60 seconds',
        }),
        headers: createMockHeaders(),
      };

      const mockData = { success: true };

      mockKy.mockRejectedValueOnce(error).mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue(mockData),
        headers: createMockHeaders(),
      });

      await httpClient.get('/test');

      expect(mockSleep).toHaveBeenCalledWith(60000); // 60 seconds * 1000
    });

    it('should not retry on non-retryable status codes', async () => {
      const error = new Error('Not Found') as HTTPError;
      (error as any).response = {
        status: 404,
        json: vi.fn().mockResolvedValue({
          summary: 'Not found',
          detail: 'Resource not found',
        }),
        headers: createMockHeaders(),
      };

      mockKy.mockRejectedValue(error);

      await expect(httpClient.get('/test')).rejects.toThrow(
        GoCardlessAPIError,
      );

      expect(mockKy).toHaveBeenCalledTimes(1);
    });

    it('should throw after max retries exceeded', async () => {
      const error = new Error('Too Many Requests') as HTTPError;
      (error as any).response = {
        status: 429,
        json: vi.fn().mockResolvedValue({
          summary: 'Rate limit exceeded',
          detail: 'Too many requests',
        }),
        headers: createMockHeaders(),
      };

      mockKy.mockRejectedValue(error);

      await expect(httpClient.get('/test')).rejects.toThrow(
        GoCardlessAPIError,
      );

      expect(mockKy).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should use exponential backoff when configured', async () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {
        maxRetries: 2,
        retryableStatusCodes: [429],
        backoff: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 60000, // Higher to avoid capping
        respectRetryAfter: false,
      });

      const error = new Error('Too Many Requests') as HTTPError;
      (error as any).response = {
        status: 429,
        json: vi.fn().mockResolvedValue({
          summary: 'Rate limit exceeded',
          detail: 'Too many requests',
        }),
        headers: createMockHeaders(),
      };

      mockKy.mockRejectedValue(error);

      await expect(httpClient.get('/test')).rejects.toThrow();

      // First retry (attempt 1): 1000 * 2^0 = 1000
      expect(mockSleep).toHaveBeenNthCalledWith(1, 1000);
      // Second retry (attempt 2): 1000 * 2^1 = 2000
      expect(mockSleep).toHaveBeenNthCalledWith(2, 2000);
    });

    it('should cap retry-after at maxDelayMs', async () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {
        maxRetries: 1,
        retryableStatusCodes: [429],
        maxDelayMs: 10000, // 10 seconds max
        respectRetryAfter: true,
      });

      const error = new Error('Too Many Requests') as HTTPError;
      (error as any).response = {
        status: 429,
        json: vi.fn().mockResolvedValue({
          summary: 'Rate limit exceeded',
          detail: 'Please try again in 60 seconds', // 60 seconds
        }),
        headers: createMockHeaders(),
      };

      mockKy.mockRejectedValue(error);

      await expect(httpClient.get('/test')).rejects.toThrow();

      expect(mockSleep).toHaveBeenCalledWith(10000); // Capped at 10 seconds
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});
    });

    it('should transform HTTP errors to GoCardlessAPIError', async () => {
      const error = new Error('Server Error') as HTTPError;
      (error as any).response = {
        status: 500,
        json: vi.fn().mockResolvedValue({
          summary: 'Internal Server Error',
          detail: 'Something went wrong',
        }),
        headers: createMockHeaders(),
      };

      mockKy.mockRejectedValue(error);

      await expect(httpClient.get('/test')).rejects.toThrow(
        GoCardlessAPIError,
      );
      await expect(httpClient.get('/test')).rejects.toMatchObject({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
      });
    });

    it('should handle invalid JSON in error response', async () => {
      const error = new Error('Server Error') as HTTPError;
      (error as any).response = {
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: createMockHeaders(),
      };

      mockKy.mockRejectedValue(error);

      await expect(httpClient.get('/test')).rejects.toThrow(
        GoCardlessAPIError,
      );
    });

    it('should throw non-HTTP errors immediately', async () => {
      const networkError = new Error('Network failure');

      mockKy.mockRejectedValue(networkError);

      await expect(httpClient.get('/test')).rejects.toThrow('Network failure');
    });

    it('should parse retry-after time from error detail', async () => {
      const error = new Error('Too Many Requests') as HTTPError;
      (error as any).response = {
        status: 429,
        json: vi.fn().mockResolvedValue({
          summary: 'Rate limit exceeded',
          detail: 'Please try again in 30 seconds',
        }),
        headers: createMockHeaders(),
      };

      mockKy.mockRejectedValue(error);

      try {
        await httpClient.get('/test');
      } catch (err) {
        expect(err).toBeInstanceOf(GoCardlessAPIError);
        if (err instanceof GoCardlessAPIError) {
          expect(err.meta).toEqual({ retryAfter: 30 });
        }
      }
    });
  });

  describe('edge cases', () => {
    beforeEach(() => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});
    });

    it('should handle concurrent requests', async () => {
      const mockData1 = { id: '1' };
      const mockData2 = { id: '2' };
      const mockData3 = { id: '3' };

      mockKy
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(mockData1),
          headers: createMockHeaders(),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(mockData2),
          headers: createMockHeaders(),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(mockData3),
          headers: createMockHeaders(),
        });

      const [result1, result2, result3] = await Promise.all([
        httpClient.get('/test1'),
        httpClient.get('/test2'),
        httpClient.get('/test3'),
      ]);

      expect(result1).toEqual(mockData1);
      expect(result2).toEqual(mockData2);
      expect(result3).toEqual(mockData3);
      expect(mockKy).toHaveBeenCalledTimes(3);
    });

    it('should handle empty response body', async () => {
      mockKy.mockResolvedValue({
        json: vi.fn().mockResolvedValue(null),
        headers: createMockHeaders(),
      });

      const result = await httpClient.get('/test');

      expect(result).toBeNull();
    });

    it('should handle different HTTP methods with same URL', async () => {
      const getData = { method: 'GET' };
      const postData = { method: 'POST' };
      const putData = { method: 'PUT' };
      const deleteData = { method: 'DELETE' };

      mockKy
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(getData),
          headers: createMockHeaders(),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(postData),
          headers: createMockHeaders(),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(putData),
          headers: createMockHeaders(),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(deleteData),
          headers: createMockHeaders(),
        });

      await httpClient.get('/test');
      await httpClient.post('/test', {});
      await httpClient.put('/test', {});
      await httpClient.delete('/test');

      expect(mockKy).toHaveBeenNthCalledWith(
        1,
        '/test',
        expect.objectContaining({ method: 'GET' }),
      );
      expect(mockKy).toHaveBeenNthCalledWith(
        2,
        '/test',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(mockKy).toHaveBeenNthCalledWith(
        3,
        '/test',
        expect.objectContaining({ method: 'PUT' }),
      );
      expect(mockKy).toHaveBeenNthCalledWith(
        4,
        '/test',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('rate limiting', () => {
    it('should capture rate limit info from successful response headers', async () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});

      const mockData = { id: '123' };
      const rateLimitHeaders = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-reset': '1640000000',
      };

      mockKy.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
        headers: createMockHeaders(rateLimitHeaders),
      });

      await httpClient.get('/test');

      const rateLimit = httpClient.getLastRateLimitInfo();
      expect(rateLimit).toBeDefined();
      expect(rateLimit?.general).toEqual({
        limit: 100,
        remaining: 95,
        reset: 1640000000,
      });
    });

    it('should capture account success rate limit headers', async () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});

      const mockData = { balance: 1000 };
      const rateLimitHeaders = {
        'x-ratelimit-account-success-limit': '50',
        'x-ratelimit-account-success-remaining': '48',
        'x-ratelimit-account-success-reset': '1640000000',
      };

      mockKy.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
        headers: createMockHeaders(rateLimitHeaders),
      });

      await httpClient.get('/accounts/123/balances');

      const rateLimit = httpClient.getLastRateLimitInfo();
      expect(rateLimit).toBeDefined();
      expect(rateLimit?.accountSuccess).toEqual({
        limit: 50,
        remaining: 48,
        reset: 1640000000,
      });
    });

    it('should capture both general and account success headers', async () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});

      const mockData = { transactions: [] };
      const rateLimitHeaders = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-reset': '1640000000',
        'x-ratelimit-account-success-limit': '50',
        'x-ratelimit-account-success-remaining': '48',
        'x-ratelimit-account-success-reset': '1640000100',
      };

      mockKy.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
        headers: createMockHeaders(rateLimitHeaders),
      });

      await httpClient.get('/accounts/123/transactions');

      const rateLimit = httpClient.getLastRateLimitInfo();
      expect(rateLimit).toBeDefined();
      expect(rateLimit?.general).toEqual({
        limit: 100,
        remaining: 95,
        reset: 1640000000,
      });
      expect(rateLimit?.accountSuccess).toEqual({
        limit: 50,
        remaining: 48,
        reset: 1640000100,
      });
    });

    it('should invoke onRateLimit callback when rate limit headers present', async () => {
      const onRateLimit = vi.fn();
      httpClient = new HttpClient(
        mockTokenManager,
        BASE_URL,
        TIMEOUT,
        {},
        undefined,
        onRateLimit,
      );

      const mockData = { id: '123' };
      const rateLimitHeaders = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '95',
        'x-ratelimit-reset': '1640000000',
      };

      mockKy.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
        headers: createMockHeaders(rateLimitHeaders),
      });

      await httpClient.get('/test');

      expect(onRateLimit).toHaveBeenCalledTimes(1);
      expect(onRateLimit).toHaveBeenCalledWith({
        general: {
          limit: 100,
          remaining: 95,
          reset: 1640000000,
        },
      });
    });

    it('should not invoke callback when no rate limit headers present', async () => {
      const onRateLimit = vi.fn();
      httpClient = new HttpClient(
        mockTokenManager,
        BASE_URL,
        TIMEOUT,
        {},
        undefined,
        onRateLimit,
      );

      const mockData = { id: '123' };

      mockKy.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
        headers: createMockHeaders(),
      });

      await httpClient.get('/test');

      expect(onRateLimit).not.toHaveBeenCalled();
    });

    it('should capture rate limit info from error responses', async () => {
      const onRateLimit = vi.fn();
      httpClient = new HttpClient(
        mockTokenManager,
        BASE_URL,
        TIMEOUT,
        { maxRetries: 0 }, // Disable retries to test callback once
        undefined,
        onRateLimit,
      );

      const error = new Error('Too Many Requests') as HTTPError;
      const rateLimitHeaders = {
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '0',
        'x-ratelimit-reset': '1640000000',
      };

      (error as any).response = {
        status: 429,
        json: vi.fn().mockResolvedValue({
          summary: 'Rate limit exceeded',
          detail: 'Please try again in 60 seconds',
        }),
        headers: createMockHeaders(rateLimitHeaders),
      };

      mockKy.mockRejectedValue(error);

      try {
        await httpClient.get('/test');
      } catch {
        // Expected to throw
      }

      expect(onRateLimit).toHaveBeenCalledTimes(1);
      expect(onRateLimit).toHaveBeenCalledWith({
        general: {
          limit: 100,
          remaining: 0,
          reset: 1640000000,
        },
      });

      const rateLimit = httpClient.getLastRateLimitInfo();
      expect(rateLimit?.general?.remaining).toBe(0);
    });

    it('should return undefined when no rate limit has been captured', () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});

      const rateLimit = httpClient.getLastRateLimitInfo();
      expect(rateLimit).toBeUndefined();
    });

    it('should update rate limit on each request', async () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});

      // First request
      mockKy.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ id: '1' }),
        headers: createMockHeaders({
          'x-ratelimit-remaining': '100',
        }),
      });

      await httpClient.get('/test1');
      let rateLimit = httpClient.getLastRateLimitInfo();
      expect(rateLimit?.general?.remaining).toBe(100);

      // Second request with updated headers
      mockKy.mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ id: '2' }),
        headers: createMockHeaders({
          'x-ratelimit-remaining': '99',
        }),
      });

      await httpClient.get('/test2');
      rateLimit = httpClient.getLastRateLimitInfo();
      expect(rateLimit?.general?.remaining).toBe(99);
    });

    it('should handle invalid rate limit header values', async () => {
      httpClient = new HttpClient(mockTokenManager, BASE_URL, TIMEOUT, {});

      const mockData = { id: '123' };
      const invalidHeaders = {
        'x-ratelimit-limit': 'invalid', // Not a number
        'x-ratelimit-remaining': 'abc', // Not a number
        'x-ratelimit-reset': 'xyz', // Not a number
      };

      mockKy.mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockData),
        headers: createMockHeaders(invalidHeaders),
      });

      await httpClient.get('/test');

      // Should not capture invalid headers
      const rateLimit = httpClient.getLastRateLimitInfo();
      expect(rateLimit).toBeUndefined();
    });
  });
});
