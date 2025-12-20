/**
 * Basic Usage Example
 *
 * This example demonstrates the fundamental flow of using the GoCardless Open Banking SDK:
 * 1. Initialize the client
 * 2. List available institutions
 * 3. Create an end-user agreement
 * 4. Create a requisition for account access
 * 5. Retrieve account data
 *
 * Prerequisites:
 * - GoCardless account with API credentials
 * - Set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY environment variables
 */

import { GoCardlessClient, GoCardlessAPIError } from 'gocardless-open-banking';

async function main() {
  // Initialize the client with your credentials
  const client = new GoCardlessClient({
    secretId: process.env.GOCARDLESS_SECRET_ID!,
    secretKey: process.env.GOCARDLESS_SECRET_KEY!,
  });

  try {
    // Step 1: List available institutions in the UK
    console.log('📋 Fetching available institutions...');
    const institutions = await client.institutions.list('GB');
    console.log(`Found ${institutions.length} institutions`);

    // For this example, we'll use the Sandbox institution
    const sandboxInstitution = institutions.find((inst) =>
      inst.id.includes('SANDBOX'),
    );

    if (!sandboxInstitution) {
      console.error('Sandbox institution not found');
      return;
    }

    console.log(`\n🏦 Using institution: ${sandboxInstitution.name}`);
    console.log(`   ID: ${sandboxInstitution.id}`);

    // Step 2: Create an end-user agreement
    console.log('\n📝 Creating end-user agreement...');
    const agreement = await client.agreements.create({
      institution_id: sandboxInstitution.id,
      max_historical_days: 90, // Access to 90 days of historical data
      access_valid_for_days: 90, // Agreement valid for 90 days
      access_scope: ['balances', 'details', 'transactions'], // Request access to balances, details, and transactions
    });

    console.log(`✅ Agreement created with ID: ${agreement.id}`);
    console.log(`   Valid until: ${agreement.accepted}`);

    // Step 3: Create a requisition
    console.log('\n🔗 Creating requisition...');
    const requisition = await client.requisitions.create({
      redirect: 'https://your-app.com/callback', // Your callback URL
      institution_id: sandboxInstitution.id,
      agreement: agreement.id,
      reference: `user-${Date.now()}`, // Unique reference for tracking
      user_language: 'en',
    });

    console.log(`✅ Requisition created with ID: ${requisition.id}`);
    console.log(`\n🌐 Authorization link: ${requisition.link}`);
    console.log(
      '\n⚠️  In a real application, redirect the user to this link.',
    );
    console.log(
      '   After authorization, they will be redirected to your callback URL.',
    );

    // Step 4: Simulate user completing authorization (for sandbox only)
    // In production, you would wait for the user to complete the OAuth flow
    console.log('\n⏳ Waiting for user to complete authorization...');
    console.log(
      '   (In sandbox, you can use the test credentials provided in the GoCardless dashboard)',
    );

    // Poll for requisition status
    let authorizedRequisition = await client.requisitions.get(requisition.id);
    let attempts = 0;
    const maxAttempts = 10;

    while (
      authorizedRequisition.status !== 'LN' &&
      attempts < maxAttempts
    ) {
      console.log(`   Status: ${authorizedRequisition.status} - waiting...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      authorizedRequisition = await client.requisitions.get(requisition.id);
      attempts++;
    }

    if (authorizedRequisition.status !== 'LN') {
      console.log(
        '\n⚠️  Requisition not yet authorized. Complete the authorization at the link above.',
      );
      console.log(
        '   Then run this example again to retrieve account data.',
      );
      return;
    }

    console.log('\n✅ Authorization complete!');
    console.log(`   Accounts: ${authorizedRequisition.accounts.join(', ')}`);

    // Step 5: Retrieve account data
    const accountId = authorizedRequisition.accounts[0];

    if (accountId) {
      console.log(`\n💳 Retrieving account data for ${accountId}...`);

      // Get account metadata
      const account = await client.accounts.get(accountId);
      console.log('\n📊 Account Metadata:');
      console.log(`   IBAN: ${account.iban || 'N/A'}`);
      console.log(`   Owner: ${account.owner_name || 'N/A'}`);
      console.log(`   Status: ${account.status}`);

      // Get account balances
      const balances = await client.accounts.balances(accountId);
      console.log('\n💰 Account Balances:');
      balances.balances.forEach((balance) => {
        console.log(
          `   ${balance.balanceType}: ${balance.balanceAmount.amount} ${balance.balanceAmount.currency}`,
        );
      });

      // Get account details
      const details = await client.accounts.details(accountId);
      console.log('\n📋 Account Details:');
      console.log(`   Name: ${details.account.name || 'N/A'}`);
      console.log(`   Currency: ${details.account.currency || 'N/A'}`);
      console.log(`   Type: ${details.account.cashAccountType || 'N/A'}`);

      // Get recent transactions
      const transactions = await client.accounts.transactions(accountId);
      console.log(
        `\n📝 Recent Transactions (${transactions.transactions.booked.length} booked):`,
      );

      transactions.transactions.booked.slice(0, 5).forEach((tx) => {
        console.log(
          `\n   ${tx.bookingDate}: ${tx.transactionAmount.amount} ${tx.transactionAmount.currency}`,
        );
        console.log(`   Debtor: ${tx.debtorName || 'N/A'}`);
        console.log(`   Creditor: ${tx.creditorName || 'N/A'}`);
        console.log(`   Reference: ${tx.remittanceInformationUnstructured || 'N/A'}`);
      });
    }

    console.log('\n✅ Example completed successfully!');
  } catch (error) {
    if (error instanceof GoCardlessAPIError) {
      console.error('\n❌ GoCardless API Error:');
      console.error(`   Message: ${error.message}`);
      console.error(`   Status: ${error.statusCode}`);
      console.error(`   Code: ${error.code}`);
      console.error(`   Detail: ${error.detail}`);

      // Handle specific error cases
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
