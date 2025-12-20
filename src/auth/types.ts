/**
 * JWT token pair response from /api/v2/token/new/
 */
export interface TokenPairResponse {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
}

/**
 * JWT refresh response from /api/v2/token/refresh/
 */
export interface TokenRefreshResponse {
  access: string;
  access_expires: number;
}

/**
 * Stored token information with expiry timestamps
 */
export interface StoredTokens {
  accessToken: string;
  accessExpiresAt: number;
  refreshToken: string;
  refreshExpiresAt: number;
}
