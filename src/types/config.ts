/**
 * Request interceptor function type
 */
export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;

/**
 * Response interceptor function type
 */
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

/**
 * Request configuration
 */
export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Maximum number of retries (default: 2)
   */
  maxRetries?: number;

  /**
   * HTTP status codes to retry on (default: [429])
   */
  retryableStatusCodes?: number[];

  /**
   * Backoff strategy (default: 'linear')
   */
  backoff?: 'linear' | 'exponential';

  /**
   * Initial delay in milliseconds (default: 1000)
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds (default: 30000)
   */
  maxDelayMs?: number;

  /**
   * Respect Retry-After header from API (default: true)
   */
  respectRetryAfter?: boolean;
}

/**
 * GoCardless client configuration
 */
export interface GoCardlessClientConfig {
  /**
   * Secret ID from GoCardless Platform
   */
  secretId: string;

  /**
   * Secret Key from GoCardless Platform
   */
  secretKey: string;

  /**
   * Base URL for API (default: 'https://bankaccountdata.gocardless.com')
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: RetryConfig;

  /**
   * Request/response interceptors
   */
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG = {
  baseUrl: 'https://bankaccountdata.gocardless.com',
  timeout: 30000,
  retry: {
    maxRetries: 2,
    retryableStatusCodes: [429],
    backoff: 'linear' as const,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    respectRetryAfter: true,
  },
};
