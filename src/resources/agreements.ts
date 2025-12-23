import type { HttpClient } from '../http/client.js';
import type {
  PaginatedEndUserAgreementList,
  EndUserAgreement,
  EndUserAgreementRequest,
  EnduserAcceptanceDetailsRequest,
} from '../types/generated/index.js';

/**
 * Agreements Resource
 *
 * Operations for managing end-user agreements (EUA).
 */
export class AgreementsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all agreements with optional pagination
   *
   * @param options - Pagination options
   * @returns Paginated list of agreements
   */
  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedEndUserAgreementList> {
    return this.http.get<PaginatedEndUserAgreementList>(
      'api/v2/agreements/enduser/',
      {
        searchParams: {
          limit: options?.limit,
          offset: options?.offset,
        },
      },
    );
  }

  /**
   * Get agreement by ID
   *
   * @param agreementId - Agreement ID
   * @returns Agreement details
   */
  async get(agreementId: string): Promise<EndUserAgreement> {
    return this.http.get<EndUserAgreement>(
      `api/v2/agreements/enduser/${agreementId}/`,
    );
  }

  /**
   * Create a new agreement
   *
   * @param data - Agreement creation data
   * @returns Created agreement
   */
  async create(data: EndUserAgreementRequest): Promise<EndUserAgreement> {
    return this.http.post<EndUserAgreement>('api/v2/agreements/enduser/', data);
  }

  /**
   * Delete an agreement
   *
   * @param agreementId - Agreement ID
   */
  async delete(agreementId: string): Promise<void> {
    await this.http.delete(`api/v2/agreements/enduser/${agreementId}/`);
  }

  /**
   * Accept an agreement
   *
   * @param agreementId - Agreement ID
   * @param data - Acceptance details
   * @returns Accepted agreement
   */
  async accept(
    agreementId: string,
    data: EnduserAcceptanceDetailsRequest,
  ): Promise<EndUserAgreement> {
    return this.http.put<EndUserAgreement>(
      `api/v2/agreements/enduser/${agreementId}/accept/`,
      data,
    );
  }
}
