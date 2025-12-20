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
    const searchParams = new URLSearchParams();
    if (options?.limit) searchParams.set('limit', options.limit.toString());
    if (options?.offset) searchParams.set('offset', options.offset.toString());

    const query = searchParams.toString();
    const url = `api/v2/agreements/enduser/${query ? `?${query}` : ''}`;

    return this.http.get<PaginatedEndUserAgreementList>(url);
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
