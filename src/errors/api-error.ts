/**
 * GoCardless API Error
 *
 * Generic error class for all API errors with error codes and metadata.
 */
export class GoCardlessAPIError extends Error {
  /**
   * HTTP status code
   */
  public readonly statusCode: number;

  /**
   * Error code for programmatic handling
   */
  public readonly code: string;

  /**
   * Detailed error message from API
   */
  public readonly detail: string;

  /**
   * Summary error message from API
   */
  public readonly summary: string;

  /**
   * Additional metadata (e.g., retryAfter for rate limits)
   */
  public readonly meta?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    detail: string,
    summary: string,
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'GoCardlessAPIError';
    this.statusCode = statusCode;
    this.code = code;
    this.detail = detail;
    this.summary = summary;
    this.meta = meta;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GoCardlessAPIError);
    }
  }

  /**
   * Create error from API response
   */
  static fromResponse(
    statusCode: number,
    body: { summary?: string; detail?: string; status_code?: number },
    meta?: Record<string, unknown>,
  ): GoCardlessAPIError {
    const code = GoCardlessAPIError.getErrorCode(statusCode, body);
    const summary = body.summary || 'API Error';
    const detail = body.detail || 'An error occurred';
    const message = `${summary}: ${detail}`;

    return new GoCardlessAPIError(
      message,
      statusCode,
      code,
      detail,
      summary,
      meta,
    );
  }

  /**
   * Map status code and response to error code
   */
  private static getErrorCode(
    statusCode: number,
    body: { summary?: string; detail?: string },
  ): string {
    // Check summary for specific error types
    const summary = body.summary?.toLowerCase() || '';

    if (statusCode === 404) {
      if (summary.includes('account')) return 'ACCOUNT_NOT_FOUND';
      if (summary.includes('transaction')) return 'TRANSACTION_NOT_FOUND';
      if (summary.includes('requisition')) return 'REQUISITION_NOT_FOUND';
      if (summary.includes('agreement')) return 'AGREEMENT_NOT_FOUND';
      return 'NOT_FOUND';
    }

    if (statusCode === 429) return 'RATE_LIMIT_EXCEEDED';
    if (statusCode === 401) return 'AUTHENTICATION_FAILED';
    if (statusCode === 403) {
      if (summary.includes('ip')) return 'IP_NOT_WHITELISTED';
      return 'FORBIDDEN';
    }
    if (statusCode === 400) return 'VALIDATION_ERROR';
    if (statusCode === 500) return 'INTERNAL_SERVER_ERROR';
    if (statusCode === 502) return 'BAD_GATEWAY';
    if (statusCode === 503) return 'SERVICE_UNAVAILABLE';
    if (statusCode === 504) return 'GATEWAY_TIMEOUT';

    return 'UNKNOWN_ERROR';
  }

  /**
   * Parse retry-after time from error detail
   */
  getRetryAfter(): number | null {
    if (this.code !== 'RATE_LIMIT_EXCEEDED') return null;

    // Parse "Please try again in X seconds" from detail
    const match = this.detail.match(/try again in (\d+) second/i);
    if (match?.[1]) {
      return parseInt(match[1], 10);
    }

    return null;
  }
}
