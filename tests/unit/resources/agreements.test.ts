import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgreementsResource } from '../../../src/resources/agreements';
import type { HttpClient } from '../../../src/http/client';
import type {
  PaginatedEndUserAgreementList,
  EndUserAgreement,
  EndUserAgreementRequest,
  EnduserAcceptanceDetailsRequest,
} from '../../../src/types/generated';

describe('AgreementsResource', () => {
  let agreementsResource: AgreementsResource;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    agreementsResource = new AgreementsResource(mockHttpClient);
  });

  describe('list', () => {
    it('should list agreements without pagination', async () => {
      const mockAgreementList: PaginatedEndUserAgreementList = {
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 'agr1',
            created: '2024-01-01T00:00:00Z',
            max_historical_days: 90,
            access_valid_for_days: 90,
            access_scope: ['balances', 'details', 'transactions'],
            accepted: '2024-01-01T10:00:00Z',
            institution_id: 'bank1',
          },
          {
            id: 'agr2',
            created: '2024-01-02T00:00:00Z',
            max_historical_days: 180,
            access_valid_for_days: 180,
            access_scope: ['balances'],
            accepted: null,
            institution_id: 'bank2',
          },
        ],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAgreementList);

      const result = await agreementsResource.list();

      expect(result).toEqual(mockAgreementList);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/',
      );
    });

    it('should list agreements with limit', async () => {
      const mockAgreementList: PaginatedEndUserAgreementList = {
        count: 100,
        next: 'https://api.example.com/agreements/?limit=10&offset=10',
        previous: null,
        results: [],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAgreementList);

      const result = await agreementsResource.list({ limit: 10 });

      expect(result).toEqual(mockAgreementList);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/?limit=10',
      );
    });

    it('should list agreements with offset', async () => {
      const mockAgreementList: PaginatedEndUserAgreementList = {
        count: 100,
        next: null,
        previous: 'https://api.example.com/agreements/?offset=10',
        results: [],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAgreementList);

      const result = await agreementsResource.list({ offset: 20 });

      expect(result).toEqual(mockAgreementList);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/?offset=20',
      );
    });

    it('should list agreements with limit and offset', async () => {
      const mockAgreementList: PaginatedEndUserAgreementList = {
        count: 100,
        next: 'https://api.example.com/agreements/?limit=10&offset=30',
        previous: 'https://api.example.com/agreements/?limit=10&offset=10',
        results: [],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAgreementList);

      const result = await agreementsResource.list({ limit: 10, offset: 20 });

      expect(result).toEqual(mockAgreementList);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/?limit=10&offset=20',
      );
    });

    it('should ignore undefined pagination options', async () => {
      const mockAgreementList: PaginatedEndUserAgreementList = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAgreementList);

      const result = await agreementsResource.list({
        limit: undefined,
        offset: undefined,
      });

      expect(result).toEqual(mockAgreementList);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/',
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Network error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(agreementsResource.list()).rejects.toThrow('Network error');
    });
  });

  describe('get', () => {
    it('should get agreement by ID', async () => {
      const mockAgreement: EndUserAgreement = {
        id: 'agr123',
        created: '2024-01-01T00:00:00Z',
        max_historical_days: 90,
        access_valid_for_days: 90,
        access_scope: ['balances', 'details', 'transactions'],
        accepted: '2024-01-01T10:00:00Z',
        institution_id: 'bank1',
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAgreement);

      const result = await agreementsResource.get('agr123');

      expect(result).toEqual(mockAgreement);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/agr123/',
      );
    });

    it('should get agreement with different ID', async () => {
      const mockAgreement: EndUserAgreement = {
        id: 'agr-different',
        created: '2024-02-01T00:00:00Z',
        max_historical_days: 180,
        access_valid_for_days: 180,
        access_scope: ['balances'],
        accepted: null,
        institution_id: 'bank2',
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockAgreement);

      const result = await agreementsResource.get('agr-different');

      expect(result).toEqual(mockAgreement);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/agr-different/',
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Agreement not found');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(agreementsResource.get('nonexistent')).rejects.toThrow(
        'Agreement not found',
      );
    });
  });

  describe('create', () => {
    it('should create an agreement', async () => {
      const requestData: EndUserAgreementRequest = {
        institution_id: 'bank1',
        max_historical_days: 90,
        access_valid_for_days: 90,
        access_scope: ['balances', 'details', 'transactions'],
      };

      const mockAgreement: EndUserAgreement = {
        id: 'agr-new',
        created: '2024-01-15T10:00:00Z',
        max_historical_days: 90,
        access_valid_for_days: 90,
        access_scope: ['balances', 'details', 'transactions'],
        accepted: null,
        institution_id: 'bank1',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockAgreement);

      const result = await agreementsResource.create(requestData);

      expect(result).toEqual(mockAgreement);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/',
        requestData,
      );
    });

    it('should create agreement with limited scope', async () => {
      const requestData: EndUserAgreementRequest = {
        institution_id: 'bank2',
        max_historical_days: 30,
        access_valid_for_days: 30,
        access_scope: ['balances'],
      };

      const mockAgreement: EndUserAgreement = {
        id: 'agr-limited',
        created: '2024-01-15T10:00:00Z',
        max_historical_days: 30,
        access_valid_for_days: 30,
        access_scope: ['balances'],
        accepted: null,
        institution_id: 'bank2',
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockAgreement);

      const result = await agreementsResource.create(requestData);

      expect(result).toEqual(mockAgreement);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/',
        requestData,
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Invalid data');
      const requestData: EndUserAgreementRequest = {
        institution_id: 'unknown',
        max_historical_days: 90,
        access_valid_for_days: 90,
        access_scope: ['balances'],
      };

      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(agreementsResource.create(requestData)).rejects.toThrow(
        'Invalid data',
      );
    });
  });

  describe('delete', () => {
    it('should delete an agreement by ID', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await agreementsResource.delete('agr123');

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/agr123/',
      );
    });

    it('should delete different agreement IDs', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await agreementsResource.delete('agr-to-delete');

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/agr-to-delete/',
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Delete failed');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(agreementsResource.delete('agr123')).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('accept', () => {
    it('should accept an agreement', async () => {
      const acceptanceData: EnduserAcceptanceDetailsRequest = {
        user_agent: 'Mozilla/5.0',
        ip_address: '192.168.1.1',
      };

      const mockAgreement: EndUserAgreement = {
        id: 'agr123',
        created: '2024-01-01T00:00:00Z',
        max_historical_days: 90,
        access_valid_for_days: 90,
        access_scope: ['balances', 'details', 'transactions'],
        accepted: '2024-01-15T10:00:00Z',
        institution_id: 'bank1',
      };

      vi.mocked(mockHttpClient.put).mockResolvedValue(mockAgreement);

      const result = await agreementsResource.accept('agr123', acceptanceData);

      expect(result).toEqual(mockAgreement);
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/agr123/accept/',
        acceptanceData,
      );
    });

    it('should accept agreement with different details', async () => {
      const acceptanceData: EnduserAcceptanceDetailsRequest = {
        user_agent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ip_address: '10.0.0.5',
      };

      const mockAgreement: EndUserAgreement = {
        id: 'agr-different',
        created: '2024-02-01T00:00:00Z',
        max_historical_days: 180,
        access_valid_for_days: 180,
        access_scope: ['balances'],
        accepted: '2024-02-15T14:30:00Z',
        institution_id: 'bank2',
      };

      vi.mocked(mockHttpClient.put).mockResolvedValue(mockAgreement);

      const result = await agreementsResource.accept(
        'agr-different',
        acceptanceData,
      );

      expect(result).toEqual(mockAgreement);
      expect(mockHttpClient.put).toHaveBeenCalledWith(
        'api/v2/agreements/enduser/agr-different/accept/',
        acceptanceData,
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Acceptance failed');
      const acceptanceData: EnduserAcceptanceDetailsRequest = {
        user_agent: 'Mozilla/5.0',
        ip_address: '192.168.1.1',
      };

      vi.mocked(mockHttpClient.put).mockRejectedValue(error);

      await expect(
        agreementsResource.accept('agr123', acceptanceData),
      ).rejects.toThrow('Acceptance failed');
    });
  });
});
