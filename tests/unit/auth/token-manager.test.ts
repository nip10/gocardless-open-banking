import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenManager } from '../../../src/auth/token-manager';
import { GoCardlessAPIError } from '../../../src/errors/api-error';
import type { HTTPError } from 'ky';

// Mock ky module using hoisted mock
const { mockKyPost } = vi.hoisted(() => ({
  mockKyPost: vi.fn(),
}));

vi.mock('ky', () => ({
  default: {
    post: mockKyPost,
  },
}));

describe('TokenManager', () => {
  let tokenManager: TokenManager;
  const SECRET_ID = 'test-secret-id';
  const SECRET_KEY = 'test-secret-key';
  const BASE_URL = 'https://bankaccountdata.gocardless.com';

  beforeEach(() => {
    tokenManager = new TokenManager(SECRET_ID, SECRET_KEY, BASE_URL);
    mockKyPost.mockReset();
  });

  describe('getAccessToken', () => {
    it('should generate new token pair on first call', async () => {
      const mockTokenPair = {
        access: 'access-token-123',
        access_expires: 86400,
        refresh: 'refresh-token-456',
        refresh_expires: 2592000,
      };

      // Mock ky.post() to return an object with a json() method
      mockKyPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockTokenPair),
      });

      const token = await tokenManager.getAccessToken();

      expect(token).toBe('access-token-123');
      expect(mockKyPost).toHaveBeenCalledWith(
        `${BASE_URL}/api/v2/token/new/`,
        expect.objectContaining({
          json: {
            secret_id: SECRET_ID,
            secret_key: SECRET_KEY,
          },
          timeout: 30000,
        }),
      );
    });

    it('should return cached token if still valid', async () => {
      const mockTokenPair = {
        access: 'access-token-123',
        access_expires: 86400,
        refresh: 'refresh-token-456',
        refresh_expires: 2592000,
      };

      mockKyPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockTokenPair),
      });

      // First call generates token
      const token1 = await tokenManager.getAccessToken();
      expect(token1).toBe('access-token-123');

      // Clear mock to ensure it's not called again
      mockKyPost.mockClear();

      // Second call should return cached token
      const token2 = await tokenManager.getAccessToken();
      expect(token2).toBe('access-token-123');
      expect(mockKyPost).not.toHaveBeenCalled();
    });

    it('should refresh access token when expiring soon', async () => {
      // First response: token pair that expires soon
      const mockTokenPair = {
        access: 'access-token-123',
        access_expires: 0.05, // 50ms - will expire soon
        refresh: 'refresh-token-456',
        refresh_expires: 2592000,
      };

      const mockRefreshResponse = {
        access: 'refreshed-access-token',
        access_expires: 86400,
      };

      // First call: generate token pair
      mockKyPost.mockReturnValueOnce({
        json: vi.fn().mockResolvedValue(mockTokenPair),
      });

      await tokenManager.getAccessToken();

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second call: refresh token
      mockKyPost.mockReturnValueOnce({
        json: vi.fn().mockResolvedValue(mockRefreshResponse),
      });

      const token = await tokenManager.getAccessToken();

      expect(token).toBe('refreshed-access-token');
      expect(mockKyPost).toHaveBeenCalledTimes(2);
      expect(mockKyPost).toHaveBeenNthCalledWith(
        2,
        `${BASE_URL}/api/v2/token/refresh/`,
        expect.objectContaining({
          json: {
            refresh: 'refresh-token-456',
          },
          timeout: 30000,
        }),
      );
    });

    it('should regenerate token pair when refresh token expired', async () => {
      // First response: tokens that expire immediately
      const mockTokenPair1 = {
        access: 'access-token-1',
        access_expires: 0.05,
        refresh: 'refresh-token-1',
        refresh_expires: 0.05, // Refresh expires in 50ms
      };

      const mockTokenPair2 = {
        access: 'access-token-2',
        access_expires: 86400,
        refresh: 'refresh-token-2',
        refresh_expires: 2592000,
      };

      // First call: generate initial token pair
      mockKyPost.mockReturnValueOnce({
        json: vi.fn().mockResolvedValue(mockTokenPair1),
      });

      await tokenManager.getAccessToken();

      // Wait for refresh token to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second call: regenerate token pair
      mockKyPost.mockReturnValueOnce({
        json: vi.fn().mockResolvedValue(mockTokenPair2),
      });

      const token = await tokenManager.getAccessToken();

      expect(token).toBe('access-token-2');
      expect(mockKyPost).toHaveBeenCalledTimes(2);
      expect(mockKyPost).toHaveBeenNthCalledWith(
        2,
        `${BASE_URL}/api/v2/token/new/`,
        expect.anything(),
      );
    });

    it('should handle concurrent token requests (thread-safe)', async () => {
      const mockTokenPair = {
        access: 'access-token-123',
        access_expires: 86400,
        refresh: 'refresh-token-456',
        refresh_expires: 2592000,
      };

      // Add delay to simulate slow network
      mockKyPost.mockReturnValue({
        json: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(mockTokenPair), 50);
            }),
        ),
      });

      // Make 3 concurrent requests
      const [token1, token2, token3] = await Promise.all([
        tokenManager.getAccessToken(),
        tokenManager.getAccessToken(),
        tokenManager.getAccessToken(),
      ]);

      expect(token1).toBe('access-token-123');
      expect(token2).toBe('access-token-123');
      expect(token3).toBe('access-token-123');

      // Should only call API once
      expect(mockKyPost).toHaveBeenCalledTimes(1);
    });

    it('should throw GoCardlessAPIError on failed token generation', async () => {
      const error = new Error('API Error') as HTTPError;
      (error as any).response = {
        status: 401,
        json: vi.fn().mockResolvedValue({
          summary: 'Authentication failed',
          detail: 'Invalid credentials',
          status_code: 401,
        }),
      };

      mockKyPost.mockReturnValue({
        json: vi.fn().mockRejectedValue(error),
      });

      await expect(tokenManager.getAccessToken()).rejects.toThrow(
        GoCardlessAPIError,
      );
      await expect(tokenManager.getAccessToken()).rejects.toMatchObject({
        statusCode: 401,
        code: 'AUTHENTICATION_FAILED',
      });
    });

    it('should handle 401 during refresh by regenerating tokens', async () => {
      // First response: token pair that expires soon
      const mockTokenPair = {
        access: 'access-token-1',
        access_expires: 0.05,
        refresh: 'refresh-token-1',
        refresh_expires: 2592000,
      };

      // Generate initial token pair
      mockKyPost.mockReturnValueOnce({
        json: vi.fn().mockResolvedValue(mockTokenPair),
      });

      await tokenManager.getAccessToken();

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh attempt with 401 error
      const refreshError = new Error('Unauthorized') as HTTPError;
      (refreshError as any).response = {
        status: 401,
        json: vi.fn().mockResolvedValue({
          summary: 'Unauthorized',
          detail: 'Invalid refresh token',
        }),
      };

      // Second call: refresh fails with 401
      mockKyPost.mockReturnValueOnce({
        json: vi.fn().mockRejectedValue(refreshError),
      });

      // Third call: generateTokenPair succeeds with new tokens
      const newTokenPair = {
        access: 'access-token-2',
        access_expires: 86400,
        refresh: 'refresh-token-2',
        refresh_expires: 2592000,
      };
      mockKyPost.mockReturnValueOnce({
        json: vi.fn().mockResolvedValue(newTokenPair),
      });

      // Should successfully get new token after 401 on refresh
      const token = await tokenManager.getAccessToken();
      expect(token).toBe('access-token-2');
    }, 10000);

    it('should throw error on non-401 refresh failure', async () => {
      // First response: token pair that expires soon
      const mockTokenPair = {
        access: 'access-token-1',
        access_expires: 0.05,
        refresh: 'refresh-token-1',
        refresh_expires: 2592000,
      };

      // First call: generate token pair
      mockKyPost.mockReturnValueOnce({
        json: vi.fn().mockResolvedValue(mockTokenPair),
      });

      await tokenManager.getAccessToken();

      // Clear and wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second call: refresh should fail with 500 error
      const refreshError = new Error('Server Error') as HTTPError;
      (refreshError as any).response = {
        status: 500,
        json: vi.fn().mockResolvedValue({
          summary: 'Internal Server Error',
          detail: 'Something went wrong',
        }),
      };

      mockKyPost.mockReturnValue({
        json: vi.fn().mockRejectedValue(refreshError),
      });

      await expect(tokenManager.getAccessToken()).rejects.toThrow(
        GoCardlessAPIError,
      );
      await expect(tokenManager.getAccessToken()).rejects.toMatchObject({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
      });
    });

    it('should handle token generation with invalid JSON response', async () => {
      const error = new Error('Parse Error') as HTTPError;
      (error as any).response = {
        status: 500,
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
      };

      mockKyPost.mockReturnValue({
        json: vi.fn().mockRejectedValue(error),
      });

      // Should handle JSON parsing errors gracefully
      await expect(tokenManager.getAccessToken()).rejects.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear stored tokens', async () => {
      const mockTokenPair = {
        access: 'access-token-123',
        access_expires: 86400,
        refresh: 'refresh-token-456',
        refresh_expires: 2592000,
      };

      mockKyPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockTokenPair),
      });

      // Generate token
      await tokenManager.getAccessToken();
      expect(mockKyPost).toHaveBeenCalledTimes(1);

      // Clear tokens
      tokenManager.clear();

      // Next call should generate new token
      await tokenManager.getAccessToken();
      expect(mockKyPost).toHaveBeenCalledTimes(2);
    });

    it('should clear refresh promise', async () => {
      const mockTokenPair = {
        access: 'access-token-123',
        access_expires: 86400,
        refresh: 'refresh-token-456',
        refresh_expires: 2592000,
      };

      mockKyPost.mockReturnValue({
        json: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(mockTokenPair), 100);
            }),
        ),
      });

      // Start token generation (don't wait)
      const promise = tokenManager.getAccessToken();

      // Clear while in progress
      tokenManager.clear();

      // Original promise should still resolve
      const token = await promise;
      expect(token).toBe('access-token-123');
    });
  });

  describe('edge cases', () => {
    it('should handle tokens with very short expiry times', async () => {
      const mockTokenPair = {
        access: 'access-token-123',
        access_expires: 0.001, // 1ms
        refresh: 'refresh-token-456',
        refresh_expires: 0.002, // 2ms
      };

      mockKyPost.mockReturnValue({
        json: vi.fn().mockResolvedValue(mockTokenPair),
      });

      const token = await tokenManager.getAccessToken();
      expect(token).toBe('access-token-123');
    });

    it('should handle tokens with zero expiry', async () => {
      const mockTokenPair = {
        access: 'access-token-123',
        access_expires: 0,
        refresh: 'refresh-token-456',
        refresh_expires: 0,
      };

      const mockTokenPair2 = {
        access: 'access-token-456',
        access_expires: 86400,
        refresh: 'refresh-token-789',
        refresh_expires: 2592000,
      };

      mockKyPost
        .mockReturnValueOnce({
          json: vi.fn().mockResolvedValue(mockTokenPair),
        })
        .mockReturnValueOnce({
          json: vi.fn().mockResolvedValue(mockTokenPair2),
        });

      // First call
      await tokenManager.getAccessToken();

      // Second call should regenerate immediately
      const token = await tokenManager.getAccessToken();
      expect(token).toBe('access-token-456');
      expect(mockKyPost).toHaveBeenCalledTimes(2);
    });

    it('should handle network errors during token generation', async () => {
      mockKyPost.mockReturnValue({
        json: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      await expect(tokenManager.getAccessToken()).rejects.toThrow(
        'Network error',
      );
    });

    it('should handle concurrent refresh and generation', async () => {
      // First token pair that expires soon
      const mockTokenPair1 = {
        access: 'access-token-1',
        access_expires: 0.05,
        refresh: 'refresh-token-1',
        refresh_expires: 2592000,
      };

      const mockRefreshResponse = {
        access: 'refreshed-access-token',
        access_expires: 86400,
      };

      // First call: generate token pair
      mockKyPost.mockReturnValueOnce({
        json: vi.fn().mockResolvedValue(mockTokenPair1),
      });

      await tokenManager.getAccessToken();

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Mock refresh with delay
      mockKyPost.mockReturnValue({
        json: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(mockRefreshResponse), 50);
            }),
        ),
      });

      // Make concurrent refresh requests
      const [token1, token2] = await Promise.all([
        tokenManager.getAccessToken(),
        tokenManager.getAccessToken(),
      ]);

      expect(token1).toBe('refreshed-access-token');
      expect(token2).toBe('refreshed-access-token');

      // Should only call refresh once (plus initial generation)
      expect(mockKyPost).toHaveBeenCalledTimes(2);
    });
  });
});
