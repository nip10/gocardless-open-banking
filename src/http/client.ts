import ky, { type KyInstance, type Options } from 'ky';
import type { TokenManager } from '../auth/token-manager.js';
import type {
  RetryConfig,
  RequestInterceptor,
  ResponseInterceptor,
  RateLimitCallback,
} from '../types/config.js';
import { GoCardlessAPIError } from '../errors/api-error.js';
import { calculateBackoff, sleep } from '../utils/backoff.js';
import { parseRateLimitHeaders, type RateLimitInfo } from '../types/rate-limit.js';

/**
 * HTTP Client
 *
 * Wrapper around Ky that handles:
 * - Automatic authentication via token manager
 * - Retry logic with configurable backoff
 * - Request/response interceptors
 * - Error handling and transformation
 */
export class HttpClient {
  private readonly client: KyInstance;
  private readonly retryConfig: Required<RetryConfig>;
  private readonly requestInterceptors: RequestInterceptor[];
  private readonly responseInterceptors: ResponseInterceptor[];
  private readonly onRateLimit?: RateLimitCallback;
  private lastRateLimit?: RateLimitInfo;

  constructor(
    private readonly tokenManager: TokenManager,
    baseUrl: string,
    timeout: number,
    retryConfig: RetryConfig,
    interceptors?: {
      request?: RequestInterceptor[];
      response?: ResponseInterceptor[];
    },
    onRateLimit?: RateLimitCallback,
  ) {
    this.retryConfig = {
      maxRetries: retryConfig.maxRetries ?? 2,
      retryableStatusCodes: retryConfig.retryableStatusCodes ?? [429],
      backoff: retryConfig.backoff ?? 'linear',
      initialDelayMs: retryConfig.initialDelayMs ?? 1000,
      maxDelayMs: retryConfig.maxDelayMs ?? 30000,
      respectRetryAfter: retryConfig.respectRetryAfter ?? true,
    };

    this.requestInterceptors = interceptors?.request ?? [];
    this.responseInterceptors = interceptors?.response ?? [];
    this.onRateLimit = onRateLimit;

    // Create Ky instance with base configuration
    this.client = ky.create({
      prefixUrl: baseUrl,
      timeout,
      retry: {
        limit: 0, // We handle retries manually for more control
      },
      hooks: {
        beforeRequest: [
          async (request) => {
            // Add authentication header
            const token = await this.tokenManager.getAccessToken();
            request.headers.set('Authorization', `Bearer ${token}`);

            // Run user interceptors
            if (this.requestInterceptors.length > 0) {
              let config = {
                url: request.url,
                method: request.method,
                headers: Object.fromEntries(request.headers.entries()),
              };

              for (const interceptor of this.requestInterceptors) {
                config = await interceptor(config);
              }

              // Apply modified config back to request
              for (const [key, value] of Object.entries(config.headers)) {
                request.headers.set(key, value);
              }
            }
          },
        ],
        afterResponse: this.responseInterceptors.length > 0 ? [
          async (request, options, response) => {
            // Run user interceptors
            // Note: Interceptors receive native Response, not KyResponse
            let modifiedResponse = response as Response;
            for (const interceptor of this.responseInterceptors) {
              modifiedResponse = await interceptor(modifiedResponse);
            }
            return modifiedResponse as typeof response;
          },
        ] : undefined,
      },
    });
  }

  /**
   * Execute GET request with retry logic
   */
  async get<T>(url: string, options?: Options): Promise<T> {
    return this.requestWithRetry<T>('GET', url, options);
  }

  /**
   * Execute POST request with retry logic
   */
  async post<T>(url: string, body?: unknown, options?: Options): Promise<T> {
    return this.requestWithRetry<T>('POST', url, {
      ...options,
      json: body,
    });
  }

  /**
   * Execute PUT request with retry logic
   */
  async put<T>(url: string, body?: unknown, options?: Options): Promise<T> {
    return this.requestWithRetry<T>('PUT', url, {
      ...options,
      json: body,
    });
  }

  /**
   * Execute DELETE request with retry logic
   */
  async delete<T>(url: string, options?: Options): Promise<T> {
    return this.requestWithRetry<T>('DELETE', url, options);
  }

  /**
   * Get the last captured rate limit information
   */
  getLastRateLimitInfo(): RateLimitInfo | undefined {
    return this.lastRateLimit;
  }

  /**
   * Process rate limit headers from response
   */
  private processRateLimitHeaders(headers: Headers): void {
    const rateLimit = parseRateLimitHeaders(headers);
    if (rateLimit) {
      this.lastRateLimit = rateLimit;
      this.onRateLimit?.(rateLimit);
    }
  }

  /**
   * Execute request with automatic retry logic
   */
  private async requestWithRetry<T>(
    method: string,
    url: string,
    options?: Options,
  ): Promise<T> {
    let lastError: GoCardlessAPIError | null = null;
    let attemptNumber = 0;

    while (attemptNumber <= this.retryConfig.maxRetries) {
      try {
        const response = await this.client(url, {
          ...options,
          method,
        });

        // Process rate limit headers from successful response
        this.processRateLimitHeaders(response.headers);

        return (await response.json()) as T;
      } catch (error) {
        // Transform error to GoCardlessAPIError
        if (error instanceof Error && 'response' in error) {
          const response = error.response as Response;
          const body = (await response
            .json()
            .catch(() => ({}))) as {
            summary?: string;
            detail?: string;
            status_code?: number;
          };

          // Process rate limit headers from error response
          this.processRateLimitHeaders(response.headers);

          // Parse rate limit headers for error object
          const rateLimit = parseRateLimitHeaders(response.headers);

          // Parse retry-after time if available
          let retryAfter: number | null = null;
          if (response.status === 429) {
            const match = body.detail?.match(/try again in (\d+) second/i);
            if (match?.[1]) {
              retryAfter = parseInt(match[1], 10);
            }
          }

          lastError = GoCardlessAPIError.fromResponse(
            response.status,
            body,
            rateLimit,
            retryAfter ? { retryAfter } : undefined,
          );

          // Check if we should retry
          const shouldRetry =
            attemptNumber < this.retryConfig.maxRetries &&
            this.retryConfig.retryableStatusCodes.includes(response.status);

          if (!shouldRetry) {
            throw lastError;
          }

          // Calculate delay for retry
          let delayMs: number;
          if (
            this.retryConfig.respectRetryAfter &&
            retryAfter !== null &&
            response.status === 429
          ) {
            // Use API's retry-after time
            delayMs = Math.min(retryAfter * 1000, this.retryConfig.maxDelayMs);
          } else {
            // Use configured backoff strategy
            delayMs = calculateBackoff(
              attemptNumber + 1,
              this.retryConfig.backoff,
              this.retryConfig.initialDelayMs,
              this.retryConfig.maxDelayMs,
            );
          }

          // Wait before retry
          await sleep(delayMs);
          attemptNumber++;
          continue;
        }

        // Non-HTTP error, throw immediately
        throw error;
      }
    }

    // Max retries exceeded
    throw lastError;
  }
}
