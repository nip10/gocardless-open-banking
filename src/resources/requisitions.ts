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
    return this.http.get<PaginatedRequisitionList>('api/v2/requisitions/', {
      searchParams: {
        limit: options?.limit,
        offset: options?.offset,
      },
    });
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
