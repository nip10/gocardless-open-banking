import type { HttpClient } from '../http/client.js';
import type {
  PaginatedRequisitionList,
  Requisition,
  RequisitionRequest,
} from '../types/generated/index.js';

/**
 * Requisitions Resource
 *
 * Operations for managing end-user requisitions.
 */
export class RequisitionsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * List all requisitions with optional pagination
   *
   * @param options - Pagination options
   * @returns Paginated list of requisitions
   */
  async list(options?: {
    limit?: number;
    offset?: number;
  }): Promise<PaginatedRequisitionList> {
    const searchParams = new URLSearchParams();
    if (options?.limit) searchParams.set('limit', options.limit.toString());
    if (options?.offset) searchParams.set('offset', options.offset.toString());

    const query = searchParams.toString();
    const url = `api/v2/requisitions/${query ? `?${query}` : ''}`;

    return this.http.get<PaginatedRequisitionList>(url);
  }

  /**
   * Get requisition by ID
   *
   * @param requisitionId - Requisition ID
   * @returns Requisition details
   */
  async get(requisitionId: string): Promise<Requisition> {
    return this.http.get<Requisition>(`api/v2/requisitions/${requisitionId}/`);
  }

  /**
   * Create a new requisition
   *
   * @param data - Requisition creation data
   * @returns Created requisition
   */
  async create(data: RequisitionRequest): Promise<Requisition> {
    return this.http.post<Requisition>('api/v2/requisitions/', data);
  }

  /**
   * Delete a requisition
   *
   * @param requisitionId - Requisition ID
   */
  async delete(requisitionId: string): Promise<void> {
    await this.http.delete(`api/v2/requisitions/${requisitionId}/`);
  }
}
