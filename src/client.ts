import { TokenManager } from './auth/token-manager.js';
import { HttpClient } from './http/client.js';
import { AccountsResource } from './resources/accounts.js';
import { RequisitionsResource } from './resources/requisitions.js';
import { AgreementsResource } from './resources/agreements.js';
import { InstitutionsResource } from './resources/institutions.js';
import type { GoCardlessClientConfig } from './types/config.js';
import { DEFAULT_CONFIG } from './types/config.js';

/**
 * GoCardless Open Banking Client
 *
 * Main client for interacting with the GoCardless Bank Account Data API v2.
 *
 * @example
 * ```typescript
 * import { GoCardlessClient } from 'gocardless-open-banking';
 *
 * const client = new GoCardlessClient({
 *   secretId: process.env.GOCARDLESS_SECRET_ID,
 *   secretKey: process.env.GOCARDLESS_SECRET_KEY,
 * });
 *
 * // Get account
 * const account = await client.accounts.get('account-id');
 *
 * // Get transactions
 * const transactions = await client.accounts.transactions('account-id', {
 *   dateFrom: '2024-01-01',
 *   dateTo: '2024-12-31',
 * });
 * ```
 */
export class GoCardlessClient {
  /**
   * Accounts resource for account operations
   */
  public readonly accounts: AccountsResource;

  /**
   * Requisitions resource for managing requisitions
   */
  public readonly requisitions: RequisitionsResource;

  /**
   * Agreements resource for managing end-user agreements
   */
  public readonly agreements: AgreementsResource;

  /**
   * Institutions resource for retrieving supported banks
   */
  public readonly institutions: InstitutionsResource;

  private readonly tokenManager: TokenManager;
  private readonly httpClient: HttpClient;

  constructor(config: GoCardlessClientConfig) {
    // Merge with defaults
    const baseUrl = config.baseUrl ?? DEFAULT_CONFIG.baseUrl;
    const timeout = config.timeout ?? DEFAULT_CONFIG.timeout;
    const retryConfig = {
      ...DEFAULT_CONFIG.retry,
      ...config.retry,
    };

    // Initialize token manager
    this.tokenManager = new TokenManager(
      config.secretId,
      config.secretKey,
      baseUrl,
    );

    // Initialize HTTP client
    this.httpClient = new HttpClient(
      this.tokenManager,
      baseUrl,
      timeout,
      retryConfig,
      config.interceptors,
    );

    // Initialize resource groups
    this.accounts = new AccountsResource(this.httpClient);
    this.requisitions = new RequisitionsResource(this.httpClient);
    this.agreements = new AgreementsResource(this.httpClient);
    this.institutions = new InstitutionsResource(this.httpClient);
  }
}
