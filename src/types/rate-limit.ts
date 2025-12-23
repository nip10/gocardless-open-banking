/**
 * Rate Limit Information
 *
 * Parsed from GoCardless API response headers.
 */
export interface RateLimitInfo {
  /**
   * General rate limits (applicable to all API requests)
   */
  general?: {
    /** Maximum number of allowed requests within the time window */
    limit?: number;
    /** Number of remaining requests in the current time window */
    remaining?: number;
    /** Time remaining in the current window (seconds) */
    reset?: number;
  };

  /**
   * Account success request limits (per access scope)
   * Only present for successful account resource requests (details, balances, transactions)
   */
  accountSuccess?: {
    /** Maximum number of allowed requests within the time window */
    limit?: number;
    /** Number of remaining requests in the current time window */
    remaining?: number;
    /** Time remaining in the current window (seconds) */
    reset?: number;
  };
}

/**
 * Parse rate limit headers from Response
 */
export function parseRateLimitHeaders(
  headers: Headers,
): RateLimitInfo | undefined {
  const general = {
    limit: parseHeader(headers, 'x-ratelimit-limit'),
    remaining: parseHeader(headers, 'x-ratelimit-remaining'),
    reset: parseHeader(headers, 'x-ratelimit-reset'),
  };

  const accountSuccess = {
    limit: parseHeader(headers, 'x-ratelimit-account-success-limit'),
    remaining: parseHeader(headers, 'x-ratelimit-account-success-remaining'),
    reset: parseHeader(headers, 'x-ratelimit-account-success-reset'),
  };

  // Only return if we have at least some rate limit data
  const hasGeneralData = Object.values(general).some((v) => v !== undefined);
  const hasAccountData = Object.values(accountSuccess).some(
    (v) => v !== undefined,
  );

  if (!hasGeneralData && !hasAccountData) {
    return undefined;
  }

  return {
    general: hasGeneralData ? general : undefined,
    accountSuccess: hasAccountData ? accountSuccess : undefined,
  };
}

/**
 * Parse a numeric header value
 */
function parseHeader(headers: Headers, name: string): number | undefined {
  const value = headers.get(name);
  if (!value) return undefined;

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}
