# Examples

This directory contains example code demonstrating how to use the GoCardless Open Banking SDK.

## Prerequisites

1. **GoCardless Account**: Sign up at [GoCardless Bank Account Data](https://bankaccountdata.gocardless.com/)
2. **API Credentials**: Get your Secret ID and Secret Key from the dashboard
3. **Node.js**: Version 18 or higher

## Setup

1. Set your environment variables:

```bash
export GOCARDLESS_SECRET_ID=your_secret_id
export GOCARDLESS_SECRET_KEY=your_secret_key
```

Or create a `.env` file in the project root:

```
GOCARDLESS_SECRET_ID=your_secret_id
GOCARDLESS_SECRET_KEY=your_secret_key
```

2. Install dependencies (from the repository root):

```bash
pnpm install
```

3. Build the SDK:

```bash
pnpm run build
```

## Running Examples

### Basic Usage

This example demonstrates the complete flow from initialization to retrieving account data:

```bash
npx tsx examples/basic-usage.ts
```

**What it covers:**
- Initializing the client
- Listing available institutions
- Creating an end-user agreement
- Creating a requisition
- Retrieving account metadata, balances, details, and transactions

### Advanced Usage

This example shows advanced features and configurations:

```bash
npx tsx examples/advanced-usage.ts
```

**What it covers:**
- Custom retry configuration with exponential backoff
- Request/response interceptors for logging
- Pagination handling
- Date-filtered transaction queries
- Multi-country institution queries
- Advanced error handling

## Using the Sandbox

GoCardless provides a sandbox environment for testing. When using sandbox institutions (those with IDs containing "SANDBOX"):

1. Use the authorization link provided by the requisition
2. Use the test credentials from your GoCardless dashboard
3. Complete the mock authorization flow

The sandbox doesn't require real bank credentials and is perfect for development and testing.

## Example Output

### Basic Usage

```
📋 Fetching available institutions...
Found 42 institutions

🏦 Using institution: Sandbox Finance
   ID: SANDBOXFINANCE_SFIN0000

📝 Creating end-user agreement...
✅ Agreement created with ID: 3fa85f64-5717-4562-b3fc-2c963f66afa6
   Valid until: null

🔗 Creating requisition...
✅ Requisition created with ID: 3fa85f64-5717-4562-b3fc-2c963f66afa6

🌐 Authorization link: https://ob.gocardless.com/psd2/start/...

💳 Retrieving account data for 3fa85f64-5717-4562-b3fc-2c963f66afa6...

📊 Account Metadata:
   IBAN: GB33BUKB20201555555555
   Owner: John Doe
   Status: DISCOVERED

💰 Account Balances:
   interimAvailable: 1000.00 EUR
   expected: 1000.00 EUR

📋 Account Details:
   Name: Main Account
   Currency: EUR
   Type: CACC

📝 Recent Transactions (5 booked):
   2024-01-15: -50.00 EUR
   Debtor: John Doe
   Creditor: Acme Corp
   Reference: Invoice #1234
```

## Tips

- **Rate Limits**: The GoCardless API has rate limits. The SDK handles this automatically with retry logic.
- **Token Management**: Tokens are automatically managed and refreshed by the SDK.
- **Error Handling**: Always wrap API calls in try-catch blocks to handle potential errors gracefully.
- **Date Formats**: Use ISO 8601 date format (YYYY-MM-DD) for date filters.

## Need Help?

- Check the [main README](../README.md) for detailed API documentation
- See the [GoCardless API documentation](https://developer.gocardless.com/bank-account-data/overview)
- Open an [issue](https://github.com/nip10/gocardless-open-banking/issues) if you find a bug
