/**
 * GoCardless Open Banking SDK
 *
 * TypeScript SDK for GoCardless Bank Account Data API v2
 */

// Main client
export { GoCardlessClient } from './client.js';

// Error classes
export { GoCardlessAPIError } from './errors/api-error.js';

// Configuration types
export type {
  GoCardlessClientConfig,
  RetryConfig,
  RequestInterceptor,
  ResponseInterceptor,
  RequestConfig,
} from './types/config.js';

// Re-export generated types for public use (from types.gen.ts to avoid SDK imports)
export type {
  Account,
  AccountBalance,
  AccountDetail,
  AccountTransactions,
  BankTransaction,
  EndUserAgreement,
  EndUserAgreementRequest,
  EnduserAcceptanceDetailsRequest,
  ErrorResponse,
  Integration,
  PaginatedEndUserAgreementList,
  PaginatedRequisitionList,
  Requisition,
  RequisitionRequest,
  StatusEnum,
} from './types/generated/types.gen.js';
