/**
 * Advanced Usage Example
 *
 * This example demonstrates advanced features:
 * - Custom retry configuration with exponential backoff
 * - Request/response interceptors for logging
 * - Error handling with retry logic
 * - Date-filtered transaction queries
 * - Pagination handling
 */

import { GoCardlessClient, GoCardlessAPIError } from 'gocardless-open-banking';

async function main() {
  // Initialize client with advanced configuration
  const client = new GoCardlessClient({
    secretId: process.env.GOCARDLESS_SECRET_ID!,
    secretKey: process.env.GOCARDLESS_SECRET_KEY!,

    // Custom timeout (default: 30000ms)
    timeout: 60000,

    // Advanced retry configuration
    retry: {
      maxRetries: 3, // Retry up to 3 times
      retryableStatusCodes: [429, 502, 503, 504], // Retry on these status codes
      backoff: 'exponential', // Use exponential backoff instead of linear
      initialDelayMs: 1000, // Start with 1 second delay
      maxDelayMs: 60000, // Max 60 seconds between retries
      respectRetryAfter: true, // Honor Retry-After header from rate limits
    },

    // Request interceptor for logging and custom headers
    interceptors: {
      request: [
        async (config) => {
          console.log(`[REQUEST] ${config.method} ${config.url}`);
          console.log(`[REQUEST] Headers:`, config.headers);

          // Add custom headers if needed
          config.headers['X-Custom-Header'] = 'my-value';

          return config;
        },
      ],

      response: [
        async (response) => {
          console.log(`[RESPONSE] ${response.status} ${response.url}`);

          // Log response time if available
          const timing = response.headers.get('x-response-time');
          if (timing) {
            console.log(`[RESPONSE] Response time: ${timing}ms`);
          }

          return response;
        },
      ],
    },
  });

  try {
    console.log('🚀 Advanced Usage Example\n');

    // Example 1: Paginated list of agreements
    console.log('📋 Example 1: Paginated Agreement List');
    console.log('─'.repeat(50));

    const allAgreements = [];
    let offset = 0;
    const limit = 20;
    let hasMore = true;

    while (hasMore) {
      const agreementsPage = await client.agreements.list({
        limit,
        offset,
      });

      allAgreements.push(...agreementsPage.results);

      console.log(
        `Fetched ${agreementsPage.results.length} agreements (offset: ${offset})`,
      );

      // Check if there are more pages
      hasMore = agreementsPage.next !== null;
      offset += limit;

      // Limit to 100 total for this example
      if (allAgreements.length >= 100) {
        hasMore = false;
      }
    }

    console.log(`\n✅ Total agreements fetched: ${allAgreements.length}\n`);

    // Example 2: Date-filtered transactions
    console.log('📝 Example 2: Date-Filtered Transactions');
    console.log('─'.repeat(50));

    // Get requisitions to find an account
    const requisitions = await client.requisitions.list({ limit: 1 });

    if (requisitions.results.length > 0) {
      const requisition = requisitions.results[0];

      if (
        requisition &&
        requisition.accounts &&
        requisition.accounts.length > 0
      ) {
        const accountId = requisition.accounts[0];

        // Get transactions for a specific date range
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3); // 3 months ago

        const endDate = new Date();

        console.log(
          `Fetching transactions from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        );

        const transactions = await client.accounts.transactions(accountId, {
          dateFrom: startDate.toISOString().split('T')[0]!,
          dateTo: endDate.toISOString().split('T')[0]!,
        });

        console.log(
          `\n✅ Found ${transactions.transactions.booked.length} booked transactions`,
        );
        console.log(
          `   Found ${transactions.transactions.pending.length} pending transactions`,
        );

        // Calculate total for booked transactions
        const total = transactions.transactions.booked.reduce((sum, tx) => {
          return sum + parseFloat(tx.transactionAmount.amount);
        }, 0);

        const currency =
          transactions.transactions.booked[0]?.transactionAmount.currency ||
          'EUR';
        console.log(
          `   Total: ${total.toFixed(2)} ${currency}`,
        );
      }
    }

    console.log('\n');

    // Example 3: Error handling with detailed information
    console.log('⚠️  Example 3: Error Handling');
    console.log('─'.repeat(50));

    try {
      // Try to get a non-existent account (will throw error)
      await client.accounts.get('non-existent-account-id');
    } catch (error) {
      if (error instanceof GoCardlessAPIError) {
        console.log('✅ Caught GoCardlessAPIError:');
        console.log(`   Message: ${error.message}`);
        console.log(`   Status Code: ${error.statusCode}`);
        console.log(`   Error Code: ${error.code}`);
        console.log(`   Detail: ${error.detail}`);

        // Check for specific error types
        switch (error.code) {
          case 'ACCOUNT_NOT_FOUND':
            console.log('   → Account does not exist');
            break;
          case 'RATE_LIMIT_EXCEEDED': {
            const retryAfter = error.getRetryAfter();
            console.log(`   → Rate limited. Retry after ${retryAfter} seconds`);
            break;
          }
          case 'AUTHENTICATION_FAILED':
            console.log('   → Invalid credentials');
            break;
          default:
            console.log('   → Unknown error');
        }
      } else {
        console.error('Unexpected error:', error);
      }
    }

    console.log('\n');

    // Example 4: Working with multiple countries
    console.log('🌍 Example 4: Multi-Country Institutions');
    console.log('─'.repeat(50));

    const countries = ['GB', 'DE', 'FR', 'ES', 'IT'];

    for (const country of countries) {
      const institutions = await client.institutions.list(country);
      console.log(`${country}: ${institutions.length} institutions`);
    }

    console.log('\n✅ Advanced examples completed successfully!');
  } catch (error) {
    if (error instanceof GoCardlessAPIError) {
      console.error('\n❌ GoCardless API Error:');
      console.error(`   Message: ${error.message}`);
      console.error(`   Status: ${error.statusCode}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Detail: ${error.detail}`);

      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        const retryAfter = error.getRetryAfter();
        console.error(`   Retry after: ${retryAfter} seconds`);
      }
    } else {
      console.error('\n❌ Unexpected error:', error);
    }
    process.exit(1);
  }
}

// Run the example
main();
