# GoCardless Open Banking SDK - Specification

**Package:** `gocardless-open-banking`
**Version:** 1.0.0
**Target:** Node.js (TypeScript)
**Purpose:** Internal use + Open Source contribution

---

## 1. Scope & Vision

### API Coverage
- **Focused SDK** for GoCardless Bank Account Data API v2 exclusively
- 14 endpoints, 34 schemas
- Authentication endpoints included (`/api/v2/token/new/`, `/api/v2/token/refresh/`)
- No multi-API support (future consideration if needed)

### Design Principles
- **Trust the API:** Assume well-formed responses, throw on critical errors
- **Developer Experience:** Clean, intuitive API surface with full TypeScript autocomplete
- **Reliability:** Automatic authentication and rate limit handling
- **Simplicity:** Standard patterns, minimal dependencies, zero magic

---

## 2. SDK Architecture

### Client Structure
Single client with resource-based method groups (AWS SDK / Stripe style):

```typescript
const client = new GoCardlessClient({
  secretId: 'your-secret-id',
  secretKey: 'your-secret-key',
  // Optional configuration
  baseUrl: 'https://bankaccountdata.gocardless.com', // default
  retry: { maxRetries: 2 },
  interceptors: { ... }
});

// Resource groups
await client.accounts.get(accountId);
await client.accounts.balances(accountId);
await client.accounts.details(accountId);
await client.accounts.transactions(accountId, options);

await client.transactions.list(accountId, options);

await client.details.get(accountId);

await client.requisitions.list(options);
await client.requisitions.get(requisitionId);
await client.requisitions.create(data);
await client.requisitions.delete(requisitionId);

await client.agreements.list(options);
await client.agreements.get(agreementId);
await client.agreements.create(data);
await client.agreements.delete(agreementId);
```

### Resource Groups (Based on OpenAPI Spec)
- `accounts` - Account metadata and related operations
- `transactions` - Transaction retrieval
- `details` - Account details
- `balances` - Account balances
- `requisitions` - End-user requisitions (paginated)
- `agreements` - End-user agreements (paginated)

---

## 3. Authentication System

### Token Management
Fully automatic, transparent to users:

**Input:** User provides `secretId` + `secretKey`

**SDK Handles:**
1. Initial token generation (`POST /api/v2/token/new/`)
2. Token pair caching (access + refresh tokens)
3. Token expiry tracking
4. Automatic refresh at 24h (access token expiry)
5. Automatic regeneration at 30d (refresh token expiry)
6. Thread-safe token operations

**Token Lifecycle:**
```
User provides secrets
    ↓
SDK: POST /api/v2/token/new/
    ↓
Response: { access, access_expires: 86400, refresh, refresh_expires: 2592000 }
    ↓
Cache tokens with expiry times
    ↓
[24 hours pass]
    ↓
SDK: POST /api/v2/token/refresh/ with refresh token
    ↓
Response: { access, access_expires: 86400 }
    ↓
Update cached access token
    ↓
[30 days pass - refresh expired]
    ↓
SDK: POST /api/v2/token/new/ with secrets
    ↓
New token pair...
```

### Request Authorization
All API requests include: `Authorization: Bearer {access_token}`

### Error Handling
- **401 (Invalid/Expired Token):** Automatic token refresh + request retry
- **403 (IP Not Whitelisted):** Throw error with clear message
- Thread-safe: Multiple concurrent 401s trigger single refresh

---

## 4. Type System

### Code Generation Strategy
**Hybrid Approach:**
- **Auto-generated types** from OpenAPI spec using `@hey-api/openapi-ts`
- **Hand-crafted client** implementation
- **Build-time generation** (types not committed to git)

### Build Process
```json
{
  "scripts": {
    "generate:types": "openapi-ts -i docs/spec.json -o src/types/generated -c @hey-api/client-ky",
    "build": "pnpm generate:types && tsup",
    "dev": "pnpm generate:types && tsup --watch"
  }
}
```

### Type Exports
All generated types exported for public use:

```typescript
// Users can import types
import type {
  Account,
  Transaction,
  AccountDetails,
  Balance,
  Requisition,
  Agreement
} from 'gocardless-open-banking';

// Type-safe function parameters
const processAccount = (account: Account) => {
  // Full autocomplete and type safety
};
```

### Type Safety Level
- **Standard TypeScript interfaces** from OpenAPI schemas
- **No runtime validation** (trust API responses)
- **No branded types** for IDs (keep it simple: string)
- **Defensive programming** for critical paths (null checks, etc.)

---

## 5. Error Handling

### Error Class
Single generic error class with error codes:

```typescript
class GoCardlessAPIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public detail: string,
    public summary: string,
    public meta?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'GoCardlessAPIError';
  }
}
```

### Error Codes
Mapped from API responses:
- `ACCOUNT_NOT_FOUND` (404)
- `TRANSACTION_NOT_FOUND` (404)
- `REQUISITION_NOT_FOUND` (404)
- `RATE_LIMIT_EXCEEDED` (429)
- `AUTHENTICATION_FAILED` (401)
- `IP_NOT_WHITELISTED` (403)
- `VALIDATION_ERROR` (400)
- `INTERNAL_SERVER_ERROR` (500)
- `BAD_GATEWAY` (502)
- `SERVICE_UNAVAILABLE` (503)
- `GATEWAY_TIMEOUT` (504)

### Usage Pattern
```typescript
try {
  const account = await client.accounts.get('invalid-id');
} catch (error) {
  if (error instanceof GoCardlessAPIError) {
    switch (error.code) {
      case 'ACCOUNT_NOT_FOUND':
        console.log('Account does not exist');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        console.log('Rate limited, SDK will auto-retry');
        break;
      default:
        console.error(`API Error: ${error.summary}`, error.detail);
    }
  }
  throw error;
}
```

---

## 6. Retry & Rate Limiting

### Automatic Retry Configuration
Conservative defaults with user control:

```typescript
interface RetryConfig {
  maxRetries: number;              // Default: 2 (3 total attempts)
  retryableStatusCodes: number[];  // Default: [429]
  backoff: 'linear' | 'exponential'; // Default: 'linear'
  initialDelayMs: number;          // Default: 1000
  maxDelayMs: number;              // Default: 30000
  respectRetryAfter: boolean;      // Default: true
}
```

**Note:** The SDK leverages Ky's built-in retry mechanism and extends it with custom backoff strategies and retry-after header parsing specific to GoCardless API behavior.

### Default Behavior
- **429 (Rate Limit):** Automatic retry with linear backoff
- **5xx (Server Errors):** NO automatic retry (user must opt-in)
- **Other errors:** No retry

### Backoff Strategies
**Linear (Default):**
- Retry 1: 1 second
- Retry 2: 2 seconds
- Total: 3 attempts over ~3 seconds

**Exponential (Opt-in):**
- Retry 1: 1 second
- Retry 2: 2 seconds
- Retry 3: 4 seconds
- Total: up to maxRetries

### Retry-After Handling
SDK parses API error messages for retry timing:
- Message format: `"Please try again in <time_left> seconds"`
- Extract `time_left` and use as delay
- Override calculated backoff if present

### User Configuration
```typescript
const client = new GoCardlessClient({
  secretId: '...',
  secretKey: '...',
  retry: {
    maxRetries: 3,
    retryableStatusCodes: [429, 500, 502, 503], // Add 5xx
    backoff: 'exponential',
  }
});
```

---

## 7. Request/Response Handling

### HTTP Client
- Use `ky` (lightweight fetch wrapper)
- Built-in retry logic, timeout, JSON handling
- Extends fetch with better DX
- Smaller and simpler than axios
- Native Node.js 18+ fetch under the hood

### Request Interceptors
```typescript
interface RequestInterceptor {
  (config: RequestConfig): RequestConfig | Promise<RequestConfig>;
}

interface ResponseInterceptor {
  (response: Response): Response | Promise<Response>;
}

const client = new GoCardlessClient({
  secretId: '...',
  secretKey: '...',
  interceptors: {
    request: (config) => {
      // Log, modify headers, etc.
      console.log(`[API] ${config.method} ${config.url}`);
      return config;
    },
    response: (response) => {
      // Log, metrics, mocking in tests
      console.log(`[API] ${response.status}`);
      return response;
    },
  }
});
```

### Content Type
- Request: `application/json`
- Response: `application/json`
- Token endpoints also support: `application/x-www-form-urlencoded`, `multipart/form-data`

---

## 8. Pagination

### Paginated Endpoints
Only 2 endpoints support pagination:
- `/api/v2/requisitions/` (limit, offset)
- `/api/v2/agreements/enduser/` (limit, offset)

### Implementation
Manual pagination (no async iterators):

```typescript
// Requisitions
const page1 = await client.requisitions.list({
  limit: 50,
  offset: 0
});

const page2 = await client.requisitions.list({
  limit: 50,
  offset: 50
});

// Agreements
const agreements = await client.agreements.list({
  limit: 100,
  offset: 0
});
```

### Non-Paginated Endpoints
Most endpoints return all data or filter by date range:

```typescript
// Returns all transactions in date range
const transactions = await client.transactions.list(accountId, {
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31'
});
```

---

## 9. Testing Support

### Interceptors for Testing
Primary testing mechanism via request/response interceptors:

```typescript
// In tests
const client = new GoCardlessClient({
  secretId: 'test-id',
  secretKey: 'test-key',
  interceptors: {
    response: (response) => {
      // Mock responses in test environment
      if (process.env.NODE_ENV === 'test') {
        return new Response(JSON.stringify(mockData), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      }
      return response;
    }
  }
});
```

### Mock Examples
Documentation will include examples for:
- Jest mocking
- Vitest mocking
- Using interceptors for controlled responses

### No Dedicated Mock Client
- Keep SDK simple
- Users can mock using standard test frameworks
- Interceptors provide flexibility when needed

---

## 10. Configuration

### Client Options
```typescript
interface GoCardlessClientConfig {
  // Required
  secretId: string;
  secretKey: string;

  // Optional
  baseUrl?: string;                    // Default: 'https://bankaccountdata.gocardless.com'
  retry?: RetryConfig;                 // Default: see section 6
  timeout?: number;                    // Request timeout in ms, default: 30000
  interceptors?: {
    request?: RequestInterceptor[];
    response?: ResponseInterceptor[];
  };
}
```

### Environment Variables
SDK supports environment-based configuration:

```typescript
// If not provided in config, read from env
const client = new GoCardlessClient({
  secretId: process.env.GOCARDLESS_SECRET_ID!,
  secretKey: process.env.GOCARDLESS_SECRET_KEY!,
});
```

---

## 11. API Surface Reference

### Accounts Resource
```typescript
client.accounts.get(accountId: string): Promise<Account>
client.accounts.balances(accountId: string): Promise<Balance[]>
client.accounts.details(accountId: string): Promise<AccountDetails>
client.accounts.transactions(
  accountId: string,
  options?: { dateFrom?: string; dateTo?: string }
): Promise<Transaction[]>
```

### Transactions Resource
```typescript
client.transactions.list(
  accountId: string,
  options?: { dateFrom?: string; dateTo?: string }
): Promise<Transaction[]>
```

### Details Resource
```typescript
client.details.get(accountId: string): Promise<AccountDetails>
```

### Balances Resource
```typescript
client.balances.get(accountId: string): Promise<Balance[]>
```

### Requisitions Resource
```typescript
client.requisitions.list(
  options?: { limit?: number; offset?: number }
): Promise<RequisitionList>

client.requisitions.get(requisitionId: string): Promise<Requisition>

client.requisitions.create(
  data: CreateRequisitionRequest
): Promise<Requisition>

client.requisitions.delete(requisitionId: string): Promise<void>
```

### Agreements Resource
```typescript
client.agreements.list(
  options?: { limit?: number; offset?: number }
): Promise<AgreementList>

client.agreements.get(agreementId: string): Promise<Agreement>

client.agreements.create(
  data: CreateAgreementRequest
): Promise<Agreement>

client.agreements.delete(agreementId: string): Promise<void>
```

---

## 12. Implementation Phases

### Phase 1: Core Foundation
- [ ] Project setup with TypeScript boilerplate
- [ ] Configure `@hey-api/openapi-ts` code generation
- [ ] Generate types from OpenAPI spec
- [ ] Implement base HTTP client (fetch wrapper)
- [ ] Authentication system (token management)
- [ ] Error handling (GoCardlessAPIError)

### Phase 2: Resources & Retry
- [ ] Implement all resource groups (accounts, transactions, etc.)
- [ ] Retry logic with configurable backoff
- [ ] Request/response interceptors
- [ ] Configuration system

### Phase 3: Quality & Documentation
- [ ] Unit tests (vitest)
- [ ] Integration tests (optional, against sandbox)
- [ ] API documentation (TypeDoc)
- [ ] README with examples
- [ ] Testing guide with mock examples

### Phase 4: Polish & Release
- [ ] ESLint/Prettier configuration
- [ ] Build optimization (tsup)
- [ ] Changesets setup
- [ ] GitHub Actions CI/CD
- [ ] npm publish preparation
- [ ] Open source release (if applicable)

---

## 13. Dependencies

### Production Dependencies
```json
{
  "dependencies": {
    "ky": "^1.7.3"  // Lightweight fetch wrapper with retry, timeout, JSON handling
  }
}
```

### Development Dependencies
```json
{
  "devDependencies": {
    "@hey-api/openapi-ts": "^0.x.x",
    "@hey-api/client-ky": "^0.x.x",
    "@types/node": "^20.x.x",
    "typescript": "^5.9.3",
    "tsup": "^8.5.0",
    "vitest": "^4.0.8",
    "eslint": "^9.39.1",
    "prettier": "^3.6.2",
    "@changesets/cli": "^2.29.7"
  }
}
```

### Node.js Requirements
- **Minimum:** Node.js 18+ (required for Ky's native fetch support)
- **Recommended:** Node.js 20 LTS

---

## 14. File Structure

```
gocardless-open-banking/
├── docs/
│   └── GoCardless Bank Account Data API (v2) (1).json
├── src/
│   ├── client.ts                 # Main GoCardlessClient class
│   ├── resources/
│   │   ├── accounts.ts           # Accounts resource
│   │   ├── transactions.ts       # Transactions resource
│   │   ├── details.ts            # Details resource
│   │   ├── balances.ts           # Balances resource
│   │   ├── requisitions.ts       # Requisitions resource
│   │   └── agreements.ts         # Agreements resource
│   ├── auth/
│   │   ├── token-manager.ts      # Token lifecycle management
│   │   └── types.ts              # Auth types
│   ├── http/
│   │   ├── client.ts             # HTTP client wrapper
│   │   ├── retry.ts              # Retry logic
│   │   └── interceptors.ts       # Interceptor system
│   ├── errors/
│   │   └── api-error.ts          # GoCardlessAPIError class
│   ├── types/
│   │   ├── generated/            # Auto-generated (gitignored)
│   │   │   ├── index.ts
│   │   │   └── types.ts
│   │   ├── config.ts             # Client config types
│   │   └── index.ts              # Public type exports
│   ├── utils/
│   │   └── backoff.ts            # Backoff calculations
│   └── index.ts                  # Main exports
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── .changeset/
├── README.md
└── SDK_SPECIFICATION.md          # This file
```

---

## 15. Examples

### Basic Usage
```typescript
import { GoCardlessClient } from 'gocardless-open-banking';

const client = new GoCardlessClient({
  secretId: process.env.GOCARDLESS_SECRET_ID!,
  secretKey: process.env.GOCARDLESS_SECRET_KEY!,
});

// Get account
const account = await client.accounts.get('account-id');
console.log(`Account IBAN: ${account.iban}`);

// Get transactions with date filter
const transactions = await client.transactions.list('account-id', {
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
});
console.log(`Found ${transactions.length} transactions`);

// Get balances
const balances = await client.balances.get('account-id');
console.log('Account balances:', balances);
```

### With Custom Configuration
```typescript
const client = new GoCardlessClient({
  secretId: process.env.GOCARDLESS_SECRET_ID!,
  secretKey: process.env.GOCARDLESS_SECRET_KEY!,
  retry: {
    maxRetries: 3,
    retryableStatusCodes: [429, 500, 502, 503],
    backoff: 'exponential',
  },
  timeout: 60000,
  interceptors: {
    request: (config) => {
      console.log(`[${new Date().toISOString()}] ${config.method} ${config.url}`);
      return config;
    },
    response: (response) => {
      console.log(`[${new Date().toISOString()}] ${response.status}`);
      return response;
    },
  },
});
```

### Error Handling
```typescript
import { GoCardlessClient, GoCardlessAPIError } from 'gocardless-open-banking';

const client = new GoCardlessClient({ ... });

try {
  const account = await client.accounts.get('invalid-id');
} catch (error) {
  if (error instanceof GoCardlessAPIError) {
    console.error(`Error ${error.code}: ${error.summary}`);
    console.error(`Details: ${error.detail}`);
    console.error(`Status: ${error.statusCode}`);

    if (error.code === 'ACCOUNT_NOT_FOUND') {
      // Handle specific error
    }
  } else {
    // Network error, etc.
    throw error;
  }
}
```

### Pagination
```typescript
// Get all requisitions with pagination
let offset = 0;
const limit = 50;
const allRequisitions = [];

while (true) {
  const page = await client.requisitions.list({ limit, offset });
  allRequisitions.push(...page.results);

  if (!page.next) break; // No more pages
  offset += limit;
}

console.log(`Total requisitions: ${allRequisitions.length}`);
```

### Testing with Interceptors
```typescript
import { describe, it, expect } from 'vitest';
import { GoCardlessClient } from 'gocardless-open-banking';

describe('Account Service', () => {
  it('should process account data', async () => {
    const client = new GoCardlessClient({
      secretId: 'test-id',
      secretKey: 'test-key',
      interceptors: {
        response: () => {
          return new Response(JSON.stringify({
            id: 'acc_123',
            iban: 'GB123456',
            status: 'READY',
          }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          });
        }
      }
    });

    const account = await client.accounts.get('acc_123');
    expect(account.iban).toBe('GB123456');
  });
});
```

---

## 16. Success Criteria

### Technical Requirements
- [x] TypeScript with full type safety
- [x] Zero runtime dependencies
- [x] ESM + CJS exports
- [x] Node.js 18+ support
- [x] Automatic token management
- [x] Configurable retry logic
- [x] Comprehensive error handling
- [x] Auto-generated types from OpenAPI spec

### Developer Experience
- [ ] Intuitive API surface
- [ ] Full autocomplete support
- [ ] Clear error messages
- [ ] Comprehensive documentation
- [ ] Working code examples
- [ ] Testing guide

### Quality Metrics
- [ ] 80%+ test coverage
- [ ] All endpoints implemented
- [ ] No ESLint errors
- [ ] Formatted with Prettier
- [ ] Type-safe exports verified (@arethetypeswrong/cli)

### Open Source Readiness
- [ ] MIT License
- [ ] Contributing guide
- [ ] Changelog (via Changesets)
- [ ] CI/CD pipeline
- [ ] npm package published

---

## 17. Future Considerations

### Not in v1.0 Scope
- Async iterators for pagination (add if requested)
- Mock client helpers (add if requested)
- Test fixtures (users can create their own)
- Webhook handling/verification (requires research)
- Multi-API support (different package if needed)
- Browser support (Node.js only for now)

### Potential v2.0 Features
- Streaming responses for large datasets
- Request caching layer
- Metrics/telemetry helpers
- Connection pooling optimization
- TypeScript 5.x advanced features

---

**End of Specification**

_Last Updated: 2024-12-20_
_Status: Ready for Implementation_
