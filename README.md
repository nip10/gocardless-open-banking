# GoCardless Open Banking SDK

A modern, type-safe TypeScript SDK for the GoCardless Bank Account Data API v2.

[![npm version](https://img.shields.io/npm/v/gocardless-open-banking.svg)](https://www.npmjs.com/package/gocardless-open-banking)
[![CI](https://github.com/nip10/gocardless-open-banking/actions/workflows/main.yml/badge.svg)](https://github.com/nip10/gocardless-open-banking/actions/workflows/main.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-91.7%25-brightgreen.svg)](https://github.com/nip10/gocardless-open-banking)

## Features

- 🎯 **Type-Safe**: Full TypeScript support with auto-generated types from OpenAPI spec
- 🔄 **Automatic Token Management**: Handles JWT token generation, refresh, and expiry
- 🔁 **Smart Retry Logic**: Configurable retry with linear/exponential backoff
- ⚡ **Modern API**: Clean, Promise-based interface
- 🪝 **Interceptors**: Request/response transformation hooks
- 📦 **Tree-Shakeable**: ESM and CJS builds with minimal bundle size
- ✅ **Well Tested**: 91.7% test coverage with 156+ tests

## Installation

```bash
npm install gocardless-open-banking
```

```bash
pnpm add gocardless-open-banking
```

```bash
yarn add gocardless-open-banking
```

## Quick Start

```typescript
import { GoCardlessClient } from 'gocardless-open-banking';

// Initialize the client
const client = new GoCardlessClient({
  secretId: process.env.GOCARDLESS_SECRET_ID!,
  secretKey: process.env.GOCARDLESS_SECRET_KEY!,
});

// List available institutions in the UK
const institutions = await client.institutions.list('GB');

// Create an end-user agreement
const agreement = await client.agreements.create({
  institution_id: 'SANDBOXFINANCE_SFIN0000',
  max_historical_days: 90,
  access_valid_for_days: 90,
  access_scope: ['balances', 'details', 'transactions'],
});

// Create a requisition for account access
const requisition = await client.requisitions.create({
  redirect: 'https://your-app.com/callback',
  institution_id: 'SANDBOXFINANCE_SFIN0000',
  agreement: agreement.id,
  reference: 'user-123',
  user_language: 'en',
});

// After user completes authorization, get account details
const accounts = requisition.accounts;
const accountId = accounts[0];

// Get account balances
const balances = await client.accounts.balances(accountId);

// Get account transactions
const transactions = await client.accounts.transactions(accountId, {
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
});
```

## Authentication

The SDK automatically handles authentication using your GoCardless API credentials. Tokens are cached and automatically refreshed when needed.

### Getting API Credentials

1. Sign up at [GoCardless Bank Account Data](https://bankaccountdata.gocardless.com/)
2. Navigate to User Secrets in the dashboard
3. Create a new secret pair
4. Copy your `Secret ID` and `Secret Key`

### Environment Variables

```bash
GOCARDLESS_SECRET_ID=your_secret_id
GOCARDLESS_SECRET_KEY=your_secret_key
```

## Usage Examples

### Institutions

List and retrieve information about supported banking institutions.

```typescript
// List institutions for a specific country
const ukBanks = await client.institutions.list('GB');
const germanBanks = await client.institutions.list('DE');

// Get details for a specific institution
const institution = await client.institutions.get('SANDBOXFINANCE_SFIN0000');
console.log(institution.name); // "Sandbox Finance"
console.log(institution.countries); // ["GB"]
```

### Agreements

Manage end-user agreements that define data access permissions.

```typescript
// Create a new agreement
const agreement = await client.agreements.create({
  institution_id: 'SANDBOXFINANCE_SFIN0000',
  max_historical_days: 90,
  access_valid_for_days: 90,
  access_scope: ['balances', 'details', 'transactions'],
});

// List all agreements with pagination
const agreements = await client.agreements.list({
  limit: 20,
  offset: 0,
});

// Get a specific agreement
const agreementDetails = await client.agreements.get(agreement.id);

// Accept an agreement
const acceptedAgreement = await client.agreements.accept(agreement.id, {
  user_agent: 'Mozilla/5.0...',
  ip_address: '192.168.1.1',
});

// Delete an agreement
await client.agreements.delete(agreement.id);
```

### Requisitions

Create and manage requisitions to obtain end-user consent for account access.

```typescript
// Create a requisition
const requisition = await client.requisitions.create({
  redirect: 'https://your-app.com/callback',
  institution_id: 'SANDBOXFINANCE_SFIN0000',
  agreement: agreementId,
  reference: 'user-123',
  user_language: 'en',
});

// Direct user to the authorization link
console.log(requisition.link); // User completes authorization here

// List all requisitions
const requisitions = await client.requisitions.list({
  limit: 10,
  offset: 0,
});

// Get requisition details (after user authorization)
const requisitionDetails = await client.requisitions.get(requisition.id);
console.log(requisitionDetails.status); // "LN" (Linked)
console.log(requisitionDetails.accounts); // ["account-id-1", "account-id-2"]

// Delete a requisition
await client.requisitions.delete(requisition.id);
```

### Accounts

Access account metadata, balances, details, and transactions.

```typescript
const accountId = 'account-id-from-requisition';

// Get account metadata
const account = await client.accounts.get(accountId);
console.log(account.iban);
console.log(account.status);
console.log(account.owner_name);

// Get account balances
const balances = await client.accounts.balances(accountId);
balances.balances.forEach((balance) => {
  console.log(`${balance.balanceType}: ${balance.balanceAmount.amount} ${balance.balanceAmount.currency}`);
});

// Get account details
const details = await client.accounts.details(accountId);
console.log(details.account.name);
console.log(details.account.currency);

// Get transactions without filters
const allTransactions = await client.accounts.transactions(accountId);

// Get transactions with date filters
const filteredTransactions = await client.accounts.transactions(accountId, {
  dateFrom: '2024-01-01',
  dateTo: '2024-03-31',
});

// Process transactions
filteredTransactions.transactions.booked.forEach((tx) => {
  console.log(`${tx.bookingDate}: ${tx.transactionAmount.amount} ${tx.transactionAmount.currency}`);
  console.log(`Debtor: ${tx.debtorName || 'N/A'}`);
  console.log(`Creditor: ${tx.creditorName || 'N/A'}`);
});
```

## Configuration

### Client Options

```typescript
const client = new GoCardlessClient({
  // Required
  secretId: 'your-secret-id',
  secretKey: 'your-secret-key',

  // Optional
  baseUrl: 'https://bankaccountdata.gocardless.com', // Default
  timeout: 30000, // Request timeout in ms (default: 30000)

  // Retry configuration
  retry: {
    maxRetries: 2, // Maximum retry attempts (default: 2)
    retryableStatusCodes: [429], // Status codes to retry (default: [429])
    backoff: 'linear', // 'linear' or 'exponential' (default: 'linear')
    initialDelayMs: 1000, // Initial retry delay (default: 1000)
    maxDelayMs: 30000, // Maximum retry delay (default: 30000)
    respectRetryAfter: true, // Honor Retry-After header (default: true)
  },

  // Request/response interceptors
  interceptors: {
    request: [
      async (config) => {
        // Modify request config
        console.log(`Making request to: ${config.url}`);
        return config;
      },
    ],
    response: [
      async (response) => {
        // Modify response
        console.log(`Received response: ${response.status}`);
        return response;
      },
    ],
  },
});
```

### Retry Strategies

**Linear Backoff** (default):
- Retry delay increases linearly: 1s, 2s, 3s...
- Predictable and suitable for most use cases

**Exponential Backoff**:
- Retry delay doubles each time: 1s, 2s, 4s, 8s...
- Better for handling rate limits and server congestion

```typescript
const client = new GoCardlessClient({
  secretId: process.env.GOCARDLESS_SECRET_ID!,
  secretKey: process.env.GOCARDLESS_SECRET_KEY!,
  retry: {
    maxRetries: 3,
    backoff: 'exponential',
    initialDelayMs: 1000,
    maxDelayMs: 60000,
  },
});
```

## Error Handling

The SDK throws `GoCardlessAPIError` for all API-related errors.

```typescript
import { GoCardlessAPIError } from 'gocardless-open-banking';

try {
  const account = await client.accounts.get('invalid-id');
} catch (error) {
  if (error instanceof GoCardlessAPIError) {
    console.error(`Error: ${error.message}`);
    console.error(`Status: ${error.statusCode}`);
    console.error(`Code: ${error.code}`);
    console.error(`Detail: ${error.detail}`);

    // Handle specific error codes
    switch (error.code) {
      case 'ACCOUNT_NOT_FOUND':
        console.log('Account does not exist');
        break;
      case 'RATE_LIMIT_EXCEEDED':
        const retryAfter = error.getRetryAfter();
        console.log(`Rate limited. Retry after ${retryAfter} seconds`);
        break;
      case 'AUTHENTICATION_FAILED':
        console.log('Invalid credentials');
        break;
      default:
        console.log('Unknown error occurred');
    }
  } else {
    // Network or other errors
    console.error('Unexpected error:', error);
  }
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `ACCOUNT_NOT_FOUND` | 404 | Account ID does not exist |
| `REQUISITION_NOT_FOUND` | 404 | Requisition ID does not exist |
| `AGREEMENT_NOT_FOUND` | 404 | Agreement ID does not exist |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AUTHENTICATION_FAILED` | 401 | Invalid credentials |
| `FORBIDDEN` | 403 | Access denied |
| `IP_NOT_WHITELISTED` | 403 | IP address not allowed |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INTERNAL_SERVER_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## TypeScript Support

The SDK is written in TypeScript and includes comprehensive type definitions.

```typescript
import type {
  Account,
  AccountBalance,
  AccountTransactions,
  Requisition,
  EndUserAgreement,
  Integration,
} from 'gocardless-open-banking';

// All API responses are fully typed
const account: Account = await client.accounts.get(accountId);
const balances: AccountBalance = await client.accounts.balances(accountId);
const transactions: AccountTransactions = await client.accounts.transactions(accountId);
```

## Advanced Usage

### Request Interceptors

Modify requests before they're sent:

```typescript
const client = new GoCardlessClient({
  secretId: process.env.GOCARDLESS_SECRET_ID!,
  secretKey: process.env.GOCARDLESS_SECRET_KEY!,
  interceptors: {
    request: [
      // Add custom headers
      async (config) => {
        config.headers['X-Custom-Header'] = 'value';
        return config;
      },
      // Log requests
      async (config) => {
        console.log(`[${config.method}] ${config.url}`);
        return config;
      },
    ],
  },
});
```

### Response Interceptors

Transform responses before they're returned:

```typescript
const client = new GoCardlessClient({
  secretId: process.env.GOCARDLESS_SECRET_ID!,
  secretKey: process.env.GOCARDLESS_SECRET_KEY!,
  interceptors: {
    response: [
      // Log responses
      async (response) => {
        console.log(`Response status: ${response.status}`);
        return response;
      },
    ],
  },
});
```

### Custom Timeout

Adjust timeout for specific operations:

```typescript
const client = new GoCardlessClient({
  secretId: process.env.GOCARDLESS_SECRET_ID!,
  secretKey: process.env.GOCARDLESS_SECRET_KEY!,
  timeout: 60000, // 60 seconds for slow connections
});
```

## API Reference

### Client

#### `new GoCardlessClient(config)`

Creates a new GoCardless client instance.

**Parameters:**
- `config.secretId` (string, required): Your GoCardless Secret ID
- `config.secretKey` (string, required): Your GoCardless Secret Key
- `config.baseUrl` (string, optional): API base URL (default: `https://bankaccountdata.gocardless.com`)
- `config.timeout` (number, optional): Request timeout in ms (default: 30000)
- `config.retry` (object, optional): Retry configuration
- `config.interceptors` (object, optional): Request/response interceptors

### Institutions

#### `client.institutions.list(country: string): Promise<Integration[]>`

List all supported institutions in a country.

#### `client.institutions.get(institutionId: string): Promise<Integration>`

Get details for a specific institution.

### Agreements

#### `client.agreements.list(options?): Promise<PaginatedEndUserAgreementList>`

List all agreements with optional pagination.

#### `client.agreements.get(agreementId: string): Promise<EndUserAgreement>`

Get a specific agreement.

#### `client.agreements.create(data: EndUserAgreementRequest): Promise<EndUserAgreement>`

Create a new end-user agreement.

#### `client.agreements.accept(agreementId: string, data: EnduserAcceptanceDetailsRequest): Promise<EndUserAgreement>`

Accept an agreement.

#### `client.agreements.delete(agreementId: string): Promise<void>`

Delete an agreement.

### Requisitions

#### `client.requisitions.list(options?): Promise<PaginatedRequisitionList>`

List all requisitions with optional pagination.

#### `client.requisitions.get(requisitionId: string): Promise<Requisition>`

Get a specific requisition.

#### `client.requisitions.create(data: RequisitionRequest): Promise<Requisition>`

Create a new requisition.

#### `client.requisitions.delete(requisitionId: string): Promise<void>`

Delete a requisition.

### Accounts

#### `client.accounts.get(accountId: string): Promise<Account>`

Get account metadata.

#### `client.accounts.balances(accountId: string): Promise<AccountBalance>`

Get account balances.

#### `client.accounts.details(accountId: string): Promise<AccountDetail>`

Get account details.

#### `client.accounts.transactions(accountId: string, options?): Promise<AccountTransactions>`

Get account transactions with optional date filters.

**Options:**
- `dateFrom` (string, optional): Start date (YYYY-MM-DD)
- `dateTo` (string, optional): End date (YYYY-MM-DD)

## Testing

The SDK includes comprehensive test coverage:

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm coverage

# Run tests in watch mode
pnpm test:ui
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

[MIT](LICENSE)

## Resources

- [GoCardless Bank Account Data API Documentation](https://developer.gocardless.com/bank-account-data/overview)
- [API Reference](https://developer.gocardless.com/bank-account-data/endpoints)
- [Support](https://support.gocardless.com/)

## Changelog

See [Releases](https://github.com/nip10/gocardless-open-banking/releases) for release history.
