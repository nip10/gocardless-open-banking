import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequisitionsResource } from '../../../src/resources/requisitions';
import type { HttpClient } from '../../../src/http/client';
import type {
  PaginatedRequisitionList,
  Requisition,
  RequisitionRequest,
} from '../../../src/types/generated';

describe('RequisitionsResource', () => {
  let requisitionsResource: RequisitionsResource;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    requisitionsResource = new RequisitionsResource(mockHttpClient);
  });

  describe('list', () => {
    it('should list requisitions without pagination', async () => {
      const mockRequisitionList: PaginatedRequisitionList = {
        count: 2,
        next: null,
        previous: null,
        results: [
          {
            id: 'req1',
            created: '2024-01-01T00:00:00Z',
            redirect: 'https://example.com/callback',
            status: 'LN',
            institution_id: 'bank1',
            agreement: 'agr1',
            reference: 'ref1',
            accounts: ['acc1', 'acc2'],
            user_language: 'en',
            link: 'https://ob.gocardless.com/req1',
            ssn: null,
            account_selection: false,
            redirect_immediate: false,
          },
          {
            id: 'req2',
            created: '2024-01-02T00:00:00Z',
            redirect: 'https://example.com/callback',
            status: 'CR',
            institution_id: 'bank2',
            agreement: 'agr2',
            reference: 'ref2',
            accounts: [],
            user_language: 'en',
            link: 'https://ob.gocardless.com/req2',
            ssn: null,
            account_selection: false,
            redirect_immediate: false,
          },
        ],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRequisitionList);

      const result = await requisitionsResource.list();

      expect(result).toEqual(mockRequisitionList);
      expect(mockHttpClient.get).toHaveBeenCalledWith('api/v2/requisitions/', {
        searchParams: {
          limit: undefined,
          offset: undefined,
        },
      });
    });

    it('should list requisitions with limit', async () => {
      const mockRequisitionList: PaginatedRequisitionList = {
        count: 100,
        next: 'https://api.example.com/requisitions/?limit=10&offset=10',
        previous: null,
        results: [],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRequisitionList);

      const result = await requisitionsResource.list({ limit: 10 });

      expect(result).toEqual(mockRequisitionList);
      expect(mockHttpClient.get).toHaveBeenCalledWith('api/v2/requisitions/', {
        searchParams: {
          limit: 10,
          offset: undefined,
        },
      });
    });

    it('should list requisitions with offset', async () => {
      const mockRequisitionList: PaginatedRequisitionList = {
        count: 100,
        next: null,
        previous: 'https://api.example.com/requisitions/?offset=10',
        results: [],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRequisitionList);

      const result = await requisitionsResource.list({ offset: 20 });

      expect(result).toEqual(mockRequisitionList);
      expect(mockHttpClient.get).toHaveBeenCalledWith('api/v2/requisitions/', {
        searchParams: {
          limit: undefined,
          offset: 20,
        },
      });
    });

    it('should list requisitions with limit and offset', async () => {
      const mockRequisitionList: PaginatedRequisitionList = {
        count: 100,
        next: 'https://api.example.com/requisitions/?limit=10&offset=30',
        previous: 'https://api.example.com/requisitions/?limit=10&offset=10',
        results: [],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRequisitionList);

      const result = await requisitionsResource.list({ limit: 10, offset: 20 });

      expect(result).toEqual(mockRequisitionList);
      expect(mockHttpClient.get).toHaveBeenCalledWith('api/v2/requisitions/', {
        searchParams: {
          limit: 10,
          offset: 20,
        },
      });
    });

    it('should ignore undefined pagination options', async () => {
      const mockRequisitionList: PaginatedRequisitionList = {
        count: 0,
        next: null,
        previous: null,
        results: [],
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRequisitionList);

      const result = await requisitionsResource.list({
        limit: undefined,
        offset: undefined,
      });

      expect(result).toEqual(mockRequisitionList);
      expect(mockHttpClient.get).toHaveBeenCalledWith('api/v2/requisitions/', {
        searchParams: {
          limit: undefined,
          offset: undefined,
        },
      });
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Network error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(requisitionsResource.list()).rejects.toThrow('Network error');
    });
  });

  describe('get', () => {
    it('should get requisition by ID', async () => {
      const mockRequisition: Requisition = {
        id: 'req123',
        created: '2024-01-01T00:00:00Z',
        redirect: 'https://example.com/callback',
        status: 'LN',
        institution_id: 'bank1',
        agreement: 'agr1',
        reference: 'ref1',
        accounts: ['acc1'],
        user_language: 'en',
        link: 'https://ob.gocardless.com/req123',
        ssn: null,
        account_selection: false,
        redirect_immediate: false,
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockRequisition);

      const result = await requisitionsResource.get('req123');

      expect(result).toEqual(mockRequisition);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/requisitions/req123/',
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Requisition not found');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(requisitionsResource.get('nonexistent')).rejects.toThrow(
        'Requisition not found',
      );
    });
  });

  describe('create', () => {
    it('should create a requisition', async () => {
      const requestData: RequisitionRequest = {
        redirect: 'https://example.com/callback',
        institution_id: 'bank1',
        reference: 'ref123',
        agreement: 'agr123',
        user_language: 'en',
      };

      const mockRequisition: Requisition = {
        id: 'req-new',
        created: '2024-01-15T10:00:00Z',
        redirect: 'https://example.com/callback',
        status: 'CR',
        institution_id: 'bank1',
        agreement: 'agr123',
        reference: 'ref123',
        accounts: [],
        user_language: 'en',
        link: 'https://ob.gocardless.com/req-new',
        ssn: null,
        account_selection: false,
        redirect_immediate: false,
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockRequisition);

      const result = await requisitionsResource.create(requestData);

      expect(result).toEqual(mockRequisition);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'api/v2/requisitions/',
        requestData,
      );
    });

    it('should create requisition with minimal data', async () => {
      const requestData: RequisitionRequest = {
        redirect: 'https://example.com/callback',
        institution_id: 'bank2',
      };

      const mockRequisition: Requisition = {
        id: 'req-minimal',
        created: '2024-01-15T10:00:00Z',
        redirect: 'https://example.com/callback',
        status: 'CR',
        institution_id: 'bank2',
        agreement: '',
        reference: '',
        accounts: [],
        user_language: 'en',
        link: 'https://ob.gocardless.com/req-minimal',
        ssn: null,
        account_selection: false,
        redirect_immediate: false,
      };

      vi.mocked(mockHttpClient.post).mockResolvedValue(mockRequisition);

      const result = await requisitionsResource.create(requestData);

      expect(result).toEqual(mockRequisition);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        'api/v2/requisitions/',
        requestData,
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Invalid data');
      const requestData: RequisitionRequest = {
        redirect: 'invalid',
        institution_id: 'unknown',
      };

      vi.mocked(mockHttpClient.post).mockRejectedValue(error);

      await expect(requisitionsResource.create(requestData)).rejects.toThrow(
        'Invalid data',
      );
    });
  });

  describe('delete', () => {
    it('should delete a requisition by ID', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await requisitionsResource.delete('req123');

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        'api/v2/requisitions/req123/',
      );
    });

    it('should delete different requisition IDs', async () => {
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await requisitionsResource.delete('req-to-delete');

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        'api/v2/requisitions/req-to-delete/',
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Delete failed');
      vi.mocked(mockHttpClient.delete).mockRejectedValue(error);

      await expect(requisitionsResource.delete('req123')).rejects.toThrow(
        'Delete failed',
      );
    });
  });
});
