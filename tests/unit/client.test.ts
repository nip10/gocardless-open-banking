import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoCardlessClient } from '../../src/client';
import type { GoCardlessClientConfig } from '../../src/types/config';

// Mock all dependencies
vi.mock('../../src/auth/token-manager');
vi.mock('../../src/http/client');
vi.mock('../../src/resources/accounts');
vi.mock('../../src/resources/requisitions');
vi.mock('../../src/resources/agreements');
vi.mock('../../src/resources/institutions');

describe('GoCardlessClient', () => {
  let client: GoCardlessClient;
  const SECRET_ID = 'test-secret-id';
  const SECRET_KEY = 'test-secret-key';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with minimal config', async () => {
      const { TokenManager } = await import('../../src/auth/token-manager');
      const { HttpClient } = await import('../../src/http/client');
      const { AccountsResource } = await import('../../src/resources/accounts');
      const { RequisitionsResource } = await import(
        '../../src/resources/requisitions'
      );
      const { AgreementsResource } = await import(
        '../../src/resources/agreements'
      );
      const { InstitutionsResource } = await import(
        '../../src/resources/institutions'
      );

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
      });

      // Verify TokenManager was created with defaults
      expect(TokenManager).toHaveBeenCalledWith(
        SECRET_ID,
        SECRET_KEY,
        'https://bankaccountdata.gocardless.com',
      );

      // Verify HttpClient was created with defaults
      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(), // TokenManager instance
        'https://bankaccountdata.gocardless.com',
        30000,
        {
          maxRetries: 2,
          retryableStatusCodes: [429],
          backoff: 'linear',
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          respectRetryAfter: true,
        },
        undefined, // No interceptors
      );

      // Verify all resources were created
      expect(AccountsResource).toHaveBeenCalledWith(expect.anything());
      expect(RequisitionsResource).toHaveBeenCalledWith(expect.anything());
      expect(AgreementsResource).toHaveBeenCalledWith(expect.anything());
      expect(InstitutionsResource).toHaveBeenCalledWith(expect.anything());
    });

    it('should initialize with custom baseUrl', async () => {
      const { TokenManager } = await import('../../src/auth/token-manager');
      const { HttpClient } = await import('../../src/http/client');

      const customBaseUrl = 'https://custom.api.example.com';
      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        baseUrl: customBaseUrl,
      });

      expect(TokenManager).toHaveBeenCalledWith(
        SECRET_ID,
        SECRET_KEY,
        customBaseUrl,
      );

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        customBaseUrl,
        30000,
        expect.anything(),
        undefined,
      );
    });

    it('should initialize with custom timeout', async () => {
      const { HttpClient } = await import('../../src/http/client');

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        timeout: 60000,
      });

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        60000,
        expect.anything(),
        undefined,
      );
    });

    it('should initialize with custom retry config', async () => {
      const { HttpClient } = await import('../../src/http/client');

      const customRetryConfig = {
        maxRetries: 5,
        retryableStatusCodes: [429, 503],
        backoff: 'exponential' as const,
        initialDelayMs: 2000,
        maxDelayMs: 60000,
        respectRetryAfter: false,
      };

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        retry: customRetryConfig,
      });

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        customRetryConfig,
        undefined,
      );
    });

    it('should merge partial retry config with defaults', async () => {
      const { HttpClient } = await import('../../src/http/client');

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        retry: {
          maxRetries: 3,
          backoff: 'exponential',
        },
      });

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        {
          maxRetries: 3,
          retryableStatusCodes: [429],
          backoff: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          respectRetryAfter: true,
        },
        undefined,
      );
    });

    it('should initialize with request interceptors', async () => {
      const { HttpClient } = await import('../../src/http/client');

      const requestInterceptor = vi.fn(async (config) => config);
      const config: GoCardlessClientConfig = {
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        interceptors: {
          request: [requestInterceptor],
        },
      };

      client = new GoCardlessClient(config);

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        {
          request: [requestInterceptor],
        },
      );
    });

    it('should initialize with response interceptors', async () => {
      const { HttpClient } = await import('../../src/http/client');

      const responseInterceptor = vi.fn(async (response) => response);
      const config: GoCardlessClientConfig = {
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        interceptors: {
          response: [responseInterceptor],
        },
      };

      client = new GoCardlessClient(config);

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        {
          response: [responseInterceptor],
        },
      );
    });

    it('should initialize with both request and response interceptors', async () => {
      const { HttpClient } = await import('../../src/http/client');

      const requestInterceptor = vi.fn(async (config) => config);
      const responseInterceptor = vi.fn(async (response) => response);
      const config: GoCardlessClientConfig = {
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        interceptors: {
          request: [requestInterceptor],
          response: [responseInterceptor],
        },
      };

      client = new GoCardlessClient(config);

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        {
          request: [requestInterceptor],
          response: [responseInterceptor],
        },
      );
    });

    it('should initialize with all custom options', async () => {
      const { TokenManager } = await import('../../src/auth/token-manager');
      const { HttpClient } = await import('../../src/http/client');

      const customBaseUrl = 'https://custom.api.example.com';
      const requestInterceptor = vi.fn(async (config) => config);
      const responseInterceptor = vi.fn(async (response) => response);

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        baseUrl: customBaseUrl,
        timeout: 60000,
        retry: {
          maxRetries: 5,
          backoff: 'exponential',
        },
        interceptors: {
          request: [requestInterceptor],
          response: [responseInterceptor],
        },
      });

      expect(TokenManager).toHaveBeenCalledWith(
        SECRET_ID,
        SECRET_KEY,
        customBaseUrl,
      );

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        customBaseUrl,
        60000,
        {
          maxRetries: 5,
          retryableStatusCodes: [429],
          backoff: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          respectRetryAfter: true,
        },
        {
          request: [requestInterceptor],
          response: [responseInterceptor],
        },
      );
    });
  });

  describe('resource access', () => {
    beforeEach(() => {
      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
      });
    });

    it('should expose accounts resource', () => {
      expect(client.accounts).toBeDefined();
    });

    it('should expose requisitions resource', () => {
      expect(client.requisitions).toBeDefined();
    });

    it('should expose agreements resource', () => {
      expect(client.agreements).toBeDefined();
    });

    it('should expose institutions resource', () => {
      expect(client.institutions).toBeDefined();
    });

    it('should have all resources as readonly properties', () => {
      const accounts = client.accounts;
      const requisitions = client.requisitions;
      const agreements = client.agreements;
      const institutions = client.institutions;

      // Resources should be defined and unchanged
      expect(client.accounts).toBe(accounts);
      expect(client.requisitions).toBe(requisitions);
      expect(client.agreements).toBe(agreements);
      expect(client.institutions).toBe(institutions);
    });
  });

  describe('edge cases', () => {
    it('should handle zero timeout', async () => {
      const { HttpClient } = await import('../../src/http/client');

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        timeout: 0,
      });

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        0,
        expect.anything(),
        undefined,
      );
    });

    it('should handle empty retry config', async () => {
      const { HttpClient } = await import('../../src/http/client');

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        retry: {},
      });

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        {
          maxRetries: 2,
          retryableStatusCodes: [429],
          backoff: 'linear',
          initialDelayMs: 1000,
          maxDelayMs: 30000,
          respectRetryAfter: true,
        },
        undefined,
      );
    });

    it('should handle empty interceptors config', async () => {
      const { HttpClient } = await import('../../src/http/client');

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        interceptors: {},
      });

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        {},
      );
    });

    it('should handle multiple request interceptors', async () => {
      const { HttpClient } = await import('../../src/http/client');

      const interceptor1 = vi.fn(async (config) => config);
      const interceptor2 = vi.fn(async (config) => config);
      const interceptor3 = vi.fn(async (config) => config);

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        interceptors: {
          request: [interceptor1, interceptor2, interceptor3],
        },
      });

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        {
          request: [interceptor1, interceptor2, interceptor3],
        },
      );
    });

    it('should handle multiple response interceptors', async () => {
      const { HttpClient } = await import('../../src/http/client');

      const interceptor1 = vi.fn(async (response) => response);
      const interceptor2 = vi.fn(async (response) => response);

      client = new GoCardlessClient({
        secretId: SECRET_ID,
        secretKey: SECRET_KEY,
        interceptors: {
          response: [interceptor1, interceptor2],
        },
      });

      expect(HttpClient).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        {
          response: [interceptor1, interceptor2],
        },
      );
    });
  });
});
