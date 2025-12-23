import type { HttpClient } from '../http/client.js';
import type {
  Account,
  AccountBalance,
  AccountDetail,
  AccountTransactions,
} from '../types/generated/index.js';

/**
 * Accounts Resource
 *
 * Operations for retrieving account metadata, balances, details, and transactions.
 */
export class AccountsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Get account metadata
   *
   * @param accountId - Account ID
   * @returns Account metadata
   */
  async get(accountId: string): Promise<Account> {
    return this.http.get<Account>(`api/v2/accounts/${accountId}/`);
  }

  /**
   * Get account balances
   *
   * @param accountId - Account ID
   * @returns Account balances
   */
  async balances(accountId: string): Promise<AccountBalance> {
    return this.http.get<AccountBalance>(
      `api/v2/accounts/${accountId}/balances/`,
    );
  }

  /**
   * Get account details
   *
   * @param accountId - Account ID
   * @returns Account details
   */
  async details(accountId: string): Promise<AccountDetail> {
    return this.http.get<AccountDetail>(
      `api/v2/accounts/${accountId}/details/`,
    );
  }

  /**
   * Get account transactions
   *
   * @param accountId - Account ID
   * @param options - Optional date filter
   * @returns Account transactions
   */
  async transactions(
    accountId: string,
    options?: { dateFrom?: string; dateTo?: string },
  ): Promise<AccountTransactions> {
    return this.http.get<AccountTransactions>(
      `api/v2/accounts/${accountId}/transactions/`,
      {
        searchParams: {
          date_from: options?.dateFrom,
          date_to: options?.dateTo,
        },
      },
    );
  }
}
