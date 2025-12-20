---
"gocardless-open-banking": major
---

Initial release of GoCardless Open Banking SDK

### Features

- **Full TypeScript Support**: Auto-generated types from OpenAPI spec with complete type safety
- **Automatic JWT Token Management**: Handles token generation, caching, and automatic refresh
- **Smart Retry Logic**: Configurable retry strategies with linear and exponential backoff
- **Request/Response Interceptors**: Transform requests and responses with custom hooks
- **Comprehensive Error Handling**: Custom `GoCardlessAPIError` with detailed error information
- **Complete API Coverage**: Support for all GoCardless Bank Account Data API v2 endpoints
  - Institutions: List and retrieve supported banking institutions
  - Agreements: Create and manage end-user agreements
  - Requisitions: Create and manage account access requisitions
  - Accounts: Retrieve account metadata, balances, details, and transactions
- **Modern Module Support**: ESM and CJS builds with tree-shakeable exports
- **Well Tested**: 91.7% test coverage with 156+ comprehensive unit tests
- **Rate Limit Handling**: Automatic retry with Retry-After header support
- **Configurable Options**: Timeout, retry settings, and base URL customization

### Documentation

- Comprehensive README with usage examples for all endpoints
- Complete API reference documentation
- TypeScript type definitions for all API operations
- Error handling guide with common error codes
- Configuration options guide with retry strategies
