import type { HttpClient } from '../http/client.js';
import type { Integration } from '../types/generated/index.js';

/**
 * Institutions Resource
 *
 * Operations for retrieving supported banking institutions.
 */
export class InstitutionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all supported institutions in a given country
   *
   * @param country - ISO 3166 two-character country code
   * @returns List of institutions
   */
  async list(country: string): Promise<Integration[]> {
    return this.http.get<Integration[]>('api/v2/institutions/', {
      searchParams: { country },
    });
  }

  /**
   * Get institution by ID
   *
   * @param institutionId - Institution ID
   * @returns Institution details
   */
  async get(institutionId: string): Promise<Integration> {
    return this.http.get<Integration>(`api/v2/institutions/${institutionId}/`);
  }
}
