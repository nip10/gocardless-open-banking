import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountsResource } from '../../../src/resources/accounts';
import type { HttpClient } from '../../../src/http/client';
import type {
  Account,
  AccountBalance,
  AccountDetail,
  AccountTransactions,
} from '../../../src/types/generated';

describe('AccountsResource', () => {
  let accountsResource: AccountsResource;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    accountsResource = new AccountsResource(mockHttpClient);
  });

  describe('get', () => {
    it('should get account metadata by ID', async () => {
      const mockAccount: Account = {
        id: 'acc123',
        created: '2024-01-01T00:00:00Z',
        last_accessed: '2024-01-15T12:00:00Z',
        iban: 'GB29NWBK60161331926819',
        institution_id: 'bank1',
        status: 'READY',
        owner_name: 'John Doe',
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAccount);

      const result = await accountsResource.get('acc123');

      expect(result).toEqual(mockAccount);
      expect(mockHttpClient.get).toHaveBeenCalledWith('api/v2/accounts/acc123/');
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Account not found');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(accountsResource.get('nonexistent')).rejects.toThrow(
        'Account not found',
      );
    });
  });

  describe('balances', () => {
    it('should get account balances by ID', async () => {
      const mockBalances: AccountBalance = {
        balances: [
          {
            balanceAmount: {
              amount: '1000.50',
              currency: 'GBP',
            },
            balanceType: 'expected',
          },
          {
            balanceAmount: {
              amount: '950.25',
              currency: 'GBP',
            },
            balanceType: 'interimAvailable',
          },
        ],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockBalances);

      const result = await accountsResource.balances('acc123');

      expect(result).toEqual(mockBalances);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/accounts/acc123/balances/',
      );
    });

    it('should handle empty balances', async () => {
      const mockBalances: AccountBalance = {
        balances: [],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockBalances);

      const result = await accountsResource.balances('acc456');

      expect(result).toEqual(mockBalances);
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Balances not available');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(accountsResource.balances('acc123')).rejects.toThrow(
        'Balances not available',
      );
    });
  });

  describe('details', () => {
    it('should get account details by ID', async () => {
      const mockDetails: AccountDetail = {
        account: {
          iban: 'GB29NWBK60161331926819',
          currency: 'GBP',
          ownerName: 'John Doe',
          name: 'Current Account',
        },
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockDetails);

      const result = await accountsResource.details('acc123');

      expect(result).toEqual(mockDetails);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/accounts/acc123/details/',
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Details not available');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(accountsResource.details('acc123')).rejects.toThrow(
        'Details not available',
      );
    });
  });

  describe('transactions', () => {
    it('should get account transactions without date filters', async () => {
      const mockTransactions: AccountTransactions = {
        transactions: {
          booked: [
            {
              transactionId: 'tx1',
              bookingDate: '2024-01-15',
              transactionAmount: {
                amount: '50.00',
                currency: 'GBP',
              },
              debtorName: 'Alice',
            },
          ],
          pending: [],
        },
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockTransactions);

      const result = await accountsResource.transactions('acc123');

      expect(result).toEqual(mockTransactions);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/accounts/acc123/transactions/',
      );
    });

    it('should get account transactions with dateFrom filter', async () => {
      const mockTransactions: AccountTransactions = {
        transactions: {
          booked: [],
          pending: [],
        },
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockTransactions);

      const result = await accountsResource.transactions('acc123', {
        dateFrom: '2024-01-01',
      });

      expect(result).toEqual(mockTransactions);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/accounts/acc123/transactions/?date_from=2024-01-01',
      );
    });

    it('should get account transactions with dateTo filter', async () => {
      const mockTransactions: AccountTransactions = {
        transactions: {
          booked: [],
          pending: [],
        },
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockTransactions);

      const result = await accountsResource.transactions('acc123', {
        dateTo: '2024-12-31',
      });

      expect(result).toEqual(mockTransactions);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/accounts/acc123/transactions/?date_to=2024-12-31',
      );
    });

    it('should get account transactions with both date filters', async () => {
      const mockTransactions: AccountTransactions = {
        transactions: {
          booked: [
            {
              transactionId: 'tx1',
              bookingDate: '2024-06-15',
              transactionAmount: {
                amount: '100.00',
                currency: 'GBP',
              },
              creditorName: 'Bob',
            },
            {
              transactionId: 'tx2',
              bookingDate: '2024-06-20',
              transactionAmount: {
                amount: '75.50',
                currency: 'GBP',
              },
              debtorName: 'Charlie',
            },
          ],
          pending: [],
        },
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockTransactions);

      const result = await accountsResource.transactions('acc123', {
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30',
      });

      expect(result).toEqual(mockTransactions);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/accounts/acc123/transactions/?date_from=2024-06-01&date_to=2024-06-30',
      );
    });

    it('should ignore undefined date filters', async () => {
      const mockTransactions: AccountTransactions = {
        transactions: {
          booked: [],
          pending: [],
        },
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockTransactions);

      const result = await accountsResource.transactions('acc123', {
        dateFrom: undefined,
        dateTo: undefined,
      });

      expect(result).toEqual(mockTransactions);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/accounts/acc123/transactions/',
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Transactions not available');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(accountsResource.transactions('acc123')).rejects.toThrow(
        'Transactions not available',
      );
    });
  });
});
