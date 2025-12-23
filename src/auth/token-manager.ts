import ky from 'ky';
import type {
  StoredTokens,
  TokenPairResponse,
  TokenRefreshResponse,
} from './types.js';
import { GoCardlessAPIError } from '../errors/api-error.js';

/**
 * Token Manager
 *
 * Handles automatic JWT token lifecycle:
 * - Initial token generation from secrets
 * - Token caching with expiry tracking
 * - Automatic refresh at 24h (access token expiry)
 * - Automatic regeneration at 30d (refresh token expiry)
 * - Thread-safe token operations
 */
export class TokenManager {
  private tokens: StoredTokens | null = null;
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly secretId: string,
    private readonly secretKey: string,
    private readonly baseUrl: string,
  ) {}

  /**
   * Get valid access token (generates or refreshes as needed)
   */
  async getAccessToken(): Promise<string> {
    // If no tokens, generate new pair
    if (!this.tokens) {
      return this.generateTokenPair();
    }

    const now = Date.now();

    // If refresh token expired, generate new pair
    if (now >= this.tokens.refreshExpiresAt) {
      return this.generateTokenPair();
    }

    // If access token expired or expiring soon (within 1 minute), refresh it
    if (now >= this.tokens.accessExpiresAt - 60000) {
      return this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  /**
   * Generate new token pair from secrets
   */
  private async generateTokenPair(): Promise<string> {
    // Prevent concurrent token generation
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await ky
          .post(`${this.baseUrl}/api/v2/token/new/`, {
            json: {
              secret_id: this.secretId,
              secret_key: this.secretKey,
            },
            timeout: 30000,
          })
          .json<TokenPairResponse>();

        const now = Date.now();

        this.tokens = {
          accessToken: response.access,
          accessExpiresAt: now + response.access_expires * 1000,
          refreshToken: response.refresh,
          refreshExpiresAt: now + response.refresh_expires * 1000,
        };

        return this.tokens.accessToken;
      } catch (error) {
        if (error instanceof Error && 'response' in error) {
          const response = error.response as Response;
          const body = (await response.json().catch(() => ({}))) as {
            summary?: string;
            detail?: string;
            status_code?: number;
          };
          throw GoCardlessAPIError.fromResponse(response.status, body);
        }
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Refresh access token using refresh token
   */
  private async refreshAccessToken(): Promise<string> {
    // Prevent concurrent refresh
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokens) {
      return this.generateTokenPair();
    }

    this.refreshPromise = (async () => {
      try {
        const response = await ky
          .post(`${this.baseUrl}/api/v2/token/refresh/`, {
            json: {
              refresh: this.tokens!.refreshToken,
            },
            timeout: 30000,
          })
          .json<TokenRefreshResponse>();

        const now = Date.now();

        // Update access token, keep refresh token
        this.tokens = {
          ...this.tokens!,
          accessToken: response.access,
          accessExpiresAt: now + response.access_expires * 1000,
        };

        return this.tokens.accessToken;
      } catch (error) {
        // If refresh fails (e.g., refresh token expired), generate new pair
        if (error instanceof Error && 'response' in error) {
          const response = error.response as Response;
          if (response.status === 401) {
            // Clear refreshPromise before calling generateTokenPair to avoid circular reference
            this.refreshPromise = null;
            return this.generateTokenPair();
          }
          const body = (await response.json().catch(() => ({}))) as {
            summary?: string;
            detail?: string;
            status_code?: number;
          };
          throw GoCardlessAPIError.fromResponse(response.status, body);
        }
        throw error;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Clear stored tokens (useful for testing or logout)
   */
  clear(): void {
    this.tokens = null;
    this.refreshPromise = null;
  }
}
