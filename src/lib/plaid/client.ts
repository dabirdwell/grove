import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

// Plaid configuration
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
  console.warn('Warning: Plaid environment variables not set. Plaid features will not work.');
}

// Get Plaid environment
function getPlaidEnvironment(): string {
  switch (PLAID_ENV) {
    case 'sandbox':
      return PlaidEnvironments.sandbox;
    case 'development':
      return PlaidEnvironments.development;
    case 'production':
      return PlaidEnvironments.production;
    default:
      return PlaidEnvironments.sandbox;
  }
}

// Create Plaid configuration
const configuration = new Configuration({
  basePath: getPlaidEnvironment(),
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID || '',
      'PLAID-SECRET': PLAID_SECRET || '',
    },
  },
});

// Create and export Plaid client
export const plaidClient = new PlaidApi(configuration);

// Export environment info
export const plaidConfig = {
  clientId: PLAID_CLIENT_ID,
  env: PLAID_ENV,
  isConfigured: Boolean(PLAID_CLIENT_ID && PLAID_SECRET),
};
