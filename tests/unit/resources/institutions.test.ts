import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstitutionsResource } from '../../../src/resources/institutions';
import type { HttpClient } from '../../../src/http/client';
import type { Integration } from '../../../src/types/generated';

describe('InstitutionsResource', () => {
  let institutionsResource: InstitutionsResource;
  let mockHttpClient: HttpClient;

  beforeEach(() => {
    mockHttpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as HttpClient;

    institutionsResource = new InstitutionsResource(mockHttpClient);
  });

  describe('list', () => {
    it('should list institutions for a country', async () => {
      const mockInstitutions: Integration[] = [
        {
          id: 'bank1',
          name: 'Test Bank 1',
          bic: 'TESTBIC1',
          transaction_total_days: '90',
          countries: ['GB'],
          logo: 'https://example.com/logo1.png',
        },
        {
          id: 'bank2',
          name: 'Test Bank 2',
          bic: 'TESTBIC2',
          transaction_total_days: '90',
          countries: ['GB'],
          logo: 'https://example.com/logo2.png',
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockInstitutions);

      const result = await institutionsResource.list('GB');

      expect(result).toEqual(mockInstitutions);
      expect(mockHttpClient.get).toHaveBeenCalledWith('api/v2/institutions/', {
        searchParams: { country: 'GB' },
      });
    });

    it('should list institutions for different countries', async () => {
      const mockInstitutions: Integration[] = [
        {
          id: 'de-bank1',
          name: 'German Bank',
          bic: 'DEBIC001',
          transaction_total_days: '90',
          countries: ['DE'],
          logo: 'https://example.com/de-logo.png',
        },
      ];

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockInstitutions);

      const result = await institutionsResource.list('DE');

      expect(result).toEqual(mockInstitutions);
      expect(mockHttpClient.get).toHaveBeenCalledWith('api/v2/institutions/', {
        searchParams: { country: 'DE' },
      });
    });

    it('should return empty array when no institutions found', async () => {
      vi.mocked(mockHttpClient.get).mockResolvedValue([]);

      const result = await institutionsResource.list('XX');

      expect(result).toEqual([]);
      expect(mockHttpClient.get).toHaveBeenCalledWith('api/v2/institutions/', {
        searchParams: { country: 'XX' },
      });
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Network error');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(institutionsResource.list('GB')).rejects.toThrow(
        'Network error',
      );
    });
  });

  describe('get', () => {
    it('should get institution by ID', async () => {
      const mockInstitution: Integration = {
        id: 'bank1',
        name: 'Test Bank',
        bic: 'TESTBIC1',
        transaction_total_days: '90',
        countries: ['GB'],
        logo: 'https://example.com/logo.png',
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockInstitution);

      const result = await institutionsResource.get('bank1');

      expect(result).toEqual(mockInstitution);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/institutions/bank1/',
      );
    });

    it('should get institution with different ID', async () => {
      const mockInstitution: Integration = {
        id: 'different-bank',
        name: 'Different Bank',
        bic: 'DIFFBIC',
        transaction_total_days: '180',
        countries: ['FR', 'DE'],
        logo: 'https://example.com/different.png',
      };

      vi.mocked(mockHttpClient.get).mockResolvedValue(mockInstitution);

      const result = await institutionsResource.get('different-bank');

      expect(result).toEqual(mockInstitution);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        'api/v2/institutions/different-bank/',
      );
    });

    it('should propagate errors from http client', async () => {
      const error = new Error('Not found');
      vi.mocked(mockHttpClient.get).mockRejectedValue(error);

      await expect(institutionsResource.get('nonexistent')).rejects.toThrow(
        'Not found',
      );
    });
  });
});
