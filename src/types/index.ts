import Decimal from 'decimal.js';

// Configure Decimal for financial calculations
Decimal.set({ rounding: Decimal.ROUND_HALF_UP, precision: 20 });

export type AllocationTypeValue =
  | 'fixed_dollar'
  | 'percent_of_income'
  | 'percent_of_remainder'
  | 'percent_of_discretionary';

export interface Account {
  accountId: string;
  accountType: 'master' | 'external';
  plaidType?: string;
  plaidSubtype?: string;
  name?: string;
  nickname?: string;
  mask?: string;
  balance: Decimal;
  routingNumber?: string;
  accountNumber?: string;
  color?: string;
  institutionName?: string;
  institutionLogo?: string;
}

export interface Bucket {
  bucketId: string;
  name: string;
  emoji?: string;
  description?: string;
  allocationType: AllocationTypeValue;
  masterAccountId: string;
  value: Decimal;
  priority: number;
  targetExternalAccountId?: string;
  virtualBalance: Decimal;
  color?: string;
  isArchived?: boolean;
}

export interface Transaction {
  transactionId: string;
  type: string;
  amount: Decimal;
  source: string;
  destination: string;
  status: 'completed' | 'pending' | 'failed' | 'simulated';
  description?: string;
  createdAt?: Date;
}

export interface Goal {
  goalId: string;
  bucketId: string;
  name: string;
  targetAmount: Decimal;
  currentAmount: Decimal;
  deadline?: Date;
  photoUrl?: string;
  notes?: string;
  status: 'active' | 'achieved' | 'archived';
  achievedAt?: Date;
}

export interface AllocationResult {
  finalMasterBalanceSimulated: number;
  finalVirtualBalances: Record<string, number>;
  simulatedTransfers: SimulatedTransfer[];
  transactions: Transaction[];
  summary?: AllocationSummary;
}

export interface SimulatedTransfer {
  txId: string;
  amount: number;
  source: string;
  destination: string;
  status: string;
  description?: string;
}

export interface BucketDetail {
  bucketId: string;
  name: string;
  emoji: string;
  allocationType: string;
  allocated: number;
  virtualBalance: number;
  category: 'savings' | 'bills' | 'discretionary' | 'other';
}

export interface AllocationSummary {
  totalIncome: number;
  totalAllocated: number;
  totalToSavings: number;
  totalToBills: number;
  totalToDiscretionary: number;
  remainingUnallocated: number;
  savingsRate: number;
  bucketDetails: BucketDetail[];
}

// Safe account representation for frontend (no sensitive data)
export interface SafeAccount {
  accountId: string;
  name?: string;
  nickname?: string;
  mask?: string;
  plaidType?: string;
  plaidSubtype?: string;
  balance?: number;
  color?: string;
  institutionName?: string;
  isMaster?: boolean;
}

// Bucket configuration for API/database
export interface BucketConfig {
  id?: string;
  bucketId: string;
  name: string;
  emoji?: string;
  description?: string;
  allocationType: AllocationTypeValue;
  value: number;
  priority: number;
  targetExternalAccountId?: string;
  color?: string;
}

// Flow visualization node/link types
export interface FlowNode {
  id: string;
  name: string;
  value: number;
  color: string;
  type: 'income' | 'master' | 'bucket' | 'destination';
  x?: number;
  y?: number;
}

export interface FlowLink {
  source: string;
  target: string;
  value: number;
  color?: string;
}

export interface FlowData {
  nodes: FlowNode[];
  links: FlowLink[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Plaid types
export interface PlaidLinkToken {
  linkToken: string;
  expiration: string;
}

export interface PlaidExchangeResult {
  itemId: string;
  accounts: SafeAccount[];
  message: string;
}

// Transaction types for audit logging
export type TransactionType =
  | 'INCOME_DETECTED'
  | 'INCOME_ALLOCATED'
  | 'TRANSFER_INITIATED'
  | 'TRANSFER_COMPLETED'
  | 'TRANSFER_FAILED'
  | 'BUCKET_ADJUSTMENT'
  | 'BALANCE_SYNC';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'removed';

export interface TransactionLog {
  id: string;
  userId: string;
  accountId?: string;
  bucketId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  plaidTransactionId?: string;
  plaidTransferId?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  description?: string;
  merchantName?: string;
  category?: string;
  metadata: Record<string, unknown>;
  errorMessage?: string;
  transactionDate?: Date;
  createdAt: Date;
}

// Plaid transaction sync types
export interface TransactionSyncResult {
  success: boolean;
  results: Record<string, {
    added: number;
    modified: number;
    removed: number;
    incomeDetected: IncomeDetection[];
  }>;
  incomeDetected: IncomeDetection[];
  message: string;
}

export interface IncomeDetection {
  amount: number;
  description: string;
  date: string;
}

// Plaid transfer types
export interface TransferCreateResult {
  success: boolean;
  transferId: string;
  transactionId: string;
  status: string;
  message: string;
}

export interface TransferStatus {
  transferId: string;
  status: string;
  amount: string;
  created: string;
  failureReason?: string;
}

// Balance refresh types
export interface BalanceRefreshResult {
  success: boolean;
  accounts: {
    id: string;
    name: string;
    currentBalance: number;
    availableBalance: number | null;
  }[];
  message: string;
}
