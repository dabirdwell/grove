/**
 * Waterfall Allocation Engine
 *
 * When income arrives, it flows through buckets in this order:
 *
 * 1. FIXED DOLLAR buckets (e.g., "Rent: $1500")
 *    - Exact amounts pulled first, by priority order
 *    - If not enough money, partial allocation occurs
 *
 * 2. PERCENT OF INCOME buckets (e.g., "Savings: 20%")
 *    - Percentage of the original income amount
 *    - Calculated from total income, not what's left
 *
 * 3. PERCENT OF REMAINDER buckets (e.g., "Variable Expenses: 60%")
 *    - Only ONE of these allowed
 *    - Takes its percentage of what's left after fixed/percent-of-income
 *    - The REST becomes the "discretionary pool"
 *
 * 4. PERCENT OF DISCRETIONARY buckets (e.g., "Fun Money: 50%")
 *    - Split the discretionary pool among these buckets
 *    - Percentages should sum to 100% to avoid leftovers
 *
 * Example with $3000 income:
 *   - Rent (fixed $1500) → $1500, leaving $1500
 *   - Savings (20% of income) → $600, leaving $900
 *   - Variable (60% of remainder) → $540, discretionary pool = $360
 *   - Fun (50% of discretionary) → $180
 *   - Giving (50% of discretionary) → $180
 */

import Decimal from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import type { Account, Bucket, Transaction, AllocationResult, SimulatedTransfer, AllocationSummary, BucketDetail } from '@/types';

// Configure Decimal for financial calculations
Decimal.set({ rounding: Decimal.ROUND_HALF_UP, precision: 20 });

/**
 * FinancialManager - Core allocation engine ported from Python POC
 *
 * Manages accounts, buckets, and allocation for a specific Plaid Item.
 * Implements a waterfall allocation system with three allocation types:
 * - fixed_dollar: Fixed amount allocations (priority 1)
 * - percent_of_remainder: Percentage of remaining balance after fixed allocations (priority 2)
 * - percent_of_discretionary: Percentage of discretionary pool (priority 3)
 */
export class FinancialManager {
  masterAccount: Account;
  buckets: Bucket[] = [];
  transactions: Transaction[] = [];
  externalAccounts: Map<string, Account> = new Map();

  constructor(masterAccount: Account) {
    if (masterAccount.accountType !== 'master') {
      throw new Error("FinancialManager requires a 'master' type account.");
    }
    this.masterAccount = masterAccount;
  }

  /**
   * Add an external account to the manager
   */
  addExternalAccount(account: Account): void {
    if (account.accountType === 'master') {
      throw new Error('Cannot add master account as external');
    }
    this.externalAccounts.set(account.accountId, account);
    console.log(`  [FM] External account added: '${account.name}' (${account.accountId})`);
  }

  /**
   * Add a bucket to the manager
   */
  addBucket(bucket: Bucket): void {
    if (bucket.masterAccountId !== this.masterAccount.accountId) {
      throw new Error("Bucket must belong to the manager's master account.");
    }

    if (bucket.targetExternalAccountId && !this.externalAccounts.has(bucket.targetExternalAccountId)) {
      console.warn(
        `  [FM Warning] Target external account '${bucket.targetExternalAccountId}' ` +
        `for bucket '${bucket.name}' not found in manager's known accounts.`
      );
    }

    this.buckets.push(bucket);
    this.buckets.sort((a, b) => a.priority - b.priority);

    console.log(
      `  [FM] Bucket added: '${bucket.name}' (Priority ${bucket.priority}, ` +
      `Type: ${bucket.allocationType}, Value: ${bucket.value.toString()}, ` +
      `Target: ${bucket.targetExternalAccountId || 'None'})`
    );
  }

  /**
   * Log a transaction
   */
  private logTransaction(
    type: string,
    amount: Decimal,
    source: string,
    destination: string,
    status: Transaction['status'] = 'completed',
    description?: string
  ): Transaction {
    const txId = `tx_${type.toLowerCase()}_${this.transactions.length + 1}_${uuidv4().slice(0, 8)}`;
    const tx: Transaction = {
      transactionId: txId,
      type,
      amount,
      source,
      destination,
      status,
      description,
      createdAt: new Date()
    };
    this.transactions.push(tx);
    console.log(
      `  [FM Log TX]: ${txId} | ${type} | $${amount.toFixed(2)} | ` +
      `${source} -> ${destination} | ${status} | ${description || ''}`
    );
    return tx;
  }

  /**
   * Simulate a transfer from master account to target account
   */
  private simulateTransfer(
    sourceAccountId: string,
    targetAccountId: string,
    amount: Decimal
  ): { success: boolean; message: string } {
    console.log(
      `    --> Simulating Transfer: $${amount.toFixed(2)} from Master (${sourceAccountId}) ` +
      `to Target (${targetAccountId})`
    );

    if (sourceAccountId !== this.masterAccount.accountId) {
      return { success: false, message: 'Invalid source account' };
    }

    const sourceBalance = this.masterAccount.balance;
    if (sourceBalance.lt(amount)) {
      const desc = `Insufficient funds in Master Account ${sourceAccountId} ` +
        `(Need $${amount.toFixed(2)}, Have $${sourceBalance.toFixed(2)})`;
      console.log(`    --> SIM TRANSFER FAILED: ${desc}`);
      this.logTransaction(
        'transfer_sim_fail',
        amount,
        sourceAccountId,
        targetAccountId,
        'failed',
        desc
      );
      return { success: false, message: 'Insufficient source funds' };
    }

    const targetAccount = this.externalAccounts.get(targetAccountId);
    const targetDetails = targetAccount
      ? `${targetAccount.name} (${targetAccount.accountId})`
      : targetAccountId;

    this.masterAccount.balance = this.masterAccount.balance.minus(amount);
    const desc = `Simulated transfer to ${targetDetails}`;
    this.logTransaction(
      'transfer_simulated',
      amount,
      sourceAccountId,
      targetAccountId,
      'simulated',
      desc
    );
    console.log(
      `    --> Transfer Simulated OK. New Simulated Master Balance: ` +
      `$${this.masterAccount.balance.toFixed(2)}`
    );

    return { success: true, message: 'Transfer simulated' };
  }

  /**
   * Process income allocation using the waterfall method
   *
   * Stage 1: Fixed dollar amounts and percent_of_remainder
   * Stage 2: Discretionary allocations (percent_of_discretionary)
   */
  processIncomeAllocation(incomeAmount: Decimal | number | string): AllocationResult {
    // Ensure income is a Decimal
    if (!(incomeAmount instanceof Decimal)) {
      incomeAmount = new Decimal(String(incomeAmount));
    }

    if (incomeAmount.lte(0)) {
      throw new Error('Income must be positive');
    }

    console.log(`\n--- [FM] Processing Income Allocation: $${incomeAmount.toFixed(2)} ---`);

    this.logTransaction(
      'income_received',
      incomeAmount,
      'external_income',
      this.masterAccount.accountId,
      'completed',
      'User input for allocation'
    );

    console.log(`  [FM] Master Account: '${this.masterAccount.name}' (${this.masterAccount.accountId})`);
    console.log(`  [FM] Starting Balance (Simulated, before this income): $${this.masterAccount.balance.toFixed(2)}`);

    this.masterAccount.balance = this.masterAccount.balance.plus(incomeAmount);
    console.log(`  [FM] Balance for this cycle (Starting + Income): $${this.masterAccount.balance.toFixed(2)}`);

    let currentAllocationBalance = incomeAmount;
    let discretionaryPool = new Decimal(0);
    let processedVariableExpense = false;

    // Reset transactions (keep only income_received) and virtual balances
    this.transactions = this.transactions.filter(tx => tx.type === 'income_received');
    for (const bucket of this.buckets) {
      bucket.virtualBalance = new Decimal(0);
    }

    // Tracking for summary
    let totalToSavings = new Decimal(0);
    let totalToBills = new Decimal(0);
    let totalToDiscretionary = new Decimal(0);

    // Stage 1: Fixed & Variable (percent_of_remainder)
    console.log('\n  --- [FM] Stage 1: Fixed & Variable ---');

    for (const bucket of this.buckets) {
      if (bucket.allocationType === 'percent_of_discretionary') {
        continue;
      }

      let allocatedAmount = new Decimal(0);

      if (currentAllocationBalance.lte(0)) {
        console.log(`    Skipping Bucket '${bucket.name}': No balance left for Stage 1.`);
        continue;
      }

      console.log(`\n    Processing Bucket: '${bucket.name}' (Priority ${bucket.priority})`);
      console.log(`      Balance before: $${currentAllocationBalance.toFixed(2)}`);

      if (bucket.allocationType === 'fixed_dollar') {
        allocatedAmount = Decimal.min(bucket.value, currentAllocationBalance);
        currentAllocationBalance = currentAllocationBalance.minus(allocatedAmount);

        console.log(
          `      Type: Fixed $. Requested: $${bucket.value.toFixed(2)}. ` +
          `Allocated: $${allocatedAmount.toFixed(2)}`
        );

        bucket.virtualBalance = bucket.virtualBalance.plus(allocatedAmount);
        this.logTransaction(
          'allocation',
          allocatedAmount,
          this.masterAccount.accountId,
          bucket.bucketId,
          'completed',
          `To ${bucket.name}`
        );
        console.log(`      Virtual Balance '${bucket.name}': $${bucket.virtualBalance.toFixed(2)}`);

        // Track category
        totalToBills = totalToBills.plus(allocatedAmount);

        // Attempt transfer if there's a target account and positive amount
        if (bucket.targetExternalAccountId && allocatedAmount.gt(0)) {
          const { success } = this.simulateTransfer(
            this.masterAccount.accountId,
            bucket.targetExternalAccountId,
            allocatedAmount
          );
          if (success) {
            bucket.virtualBalance = bucket.virtualBalance.minus(allocatedAmount);
          }
        }
      } else if (bucket.allocationType === 'percent_of_remainder') {
        if (processedVariableExpense) {
          console.log(`    Skipping Bucket '${bucket.name}': Only one 'percent_of_remainder' allowed.`);
          continue;
        }

        const variableAllocatedAmount = currentAllocationBalance
          .times(bucket.value)
          .toDecimalPlaces(2);

        discretionaryPool = currentAllocationBalance.minus(variableAllocatedAmount);
        currentAllocationBalance = currentAllocationBalance.minus(variableAllocatedAmount);
        processedVariableExpense = true;

        console.log(
          `      Type: % of Remainder (${bucket.value.times(100).toFixed(1)}%). ` +
          `Amount for bucket: $${variableAllocatedAmount.toFixed(2)}`
        );
        console.log(`      Discretionary Pool created: $${discretionaryPool.toFixed(2)}`);

        bucket.virtualBalance = bucket.virtualBalance.plus(variableAllocatedAmount);
        this.logTransaction(
          'allocation',
          variableAllocatedAmount,
          this.masterAccount.accountId,
          bucket.bucketId,
          'completed',
          `To ${bucket.name}`
        );
        console.log(`      Virtual Balance '${bucket.name}': $${bucket.virtualBalance.toFixed(2)}`);

        // Track as savings
        totalToSavings = totalToSavings.plus(variableAllocatedAmount);

        // Check if there's a transfer needed for percent_of_remainder bucket too
        if (bucket.targetExternalAccountId && variableAllocatedAmount.gt(0)) {
          const { success } = this.simulateTransfer(
            this.masterAccount.accountId,
            bucket.targetExternalAccountId,
            variableAllocatedAmount
          );
          if (success) {
            bucket.virtualBalance = bucket.virtualBalance.minus(variableAllocatedAmount);
          }
        }
      } else if (bucket.allocationType === 'percent_of_income') {
        // Percent of total income (calculated from original income, not remainder)
        const percentAllocatedAmount = incomeAmount
          .times(bucket.value)
          .toDecimalPlaces(2);

        allocatedAmount = Decimal.min(percentAllocatedAmount, currentAllocationBalance);
        currentAllocationBalance = currentAllocationBalance.minus(allocatedAmount);

        console.log(
          `      Type: % of Income (${bucket.value.times(100).toFixed(1)}%). ` +
          `Allocated: $${allocatedAmount.toFixed(2)}`
        );

        bucket.virtualBalance = bucket.virtualBalance.plus(allocatedAmount);
        this.logTransaction(
          'allocation',
          allocatedAmount,
          this.masterAccount.accountId,
          bucket.bucketId,
          'completed',
          `To ${bucket.name}`
        );
        console.log(`      Virtual Balance '${bucket.name}': $${bucket.virtualBalance.toFixed(2)}`);

        // Track as savings
        totalToSavings = totalToSavings.plus(allocatedAmount);

        if (bucket.targetExternalAccountId && allocatedAmount.gt(0)) {
          const { success } = this.simulateTransfer(
            this.masterAccount.accountId,
            bucket.targetExternalAccountId,
            allocatedAmount
          );
          if (success) {
            bucket.virtualBalance = bucket.virtualBalance.minus(allocatedAmount);
          }
        }
      }

      const balanceForNextStage = processedVariableExpense ? discretionaryPool : currentAllocationBalance;
      console.log(`      Pool/Balance for next steps: $${balanceForNextStage.toFixed(2)}`);
    }

    // Stage 2: Discretionary allocations
    console.log(`\n  --- [FM] Stage 2: Discretionary (Pool: $${discretionaryPool.toFixed(2)}) ---`);

    const discretionaryBuckets = this.buckets
      .filter(b => b.allocationType === 'percent_of_discretionary')
      .sort((a, b) => a.priority - b.priority);

    const totalDiscretionaryPct = discretionaryBuckets.reduce(
      (sum, b) => sum.plus(b.value),
      new Decimal(0)
    );

    if (!totalDiscretionaryPct.eq(1) && discretionaryPool.gt(0)) {
      console.log(
        `    Warning: Discretionary percentages sum to ${totalDiscretionaryPct.times(100).toFixed(2)}%.`
      );
    }

    let fundsAvailableInPool = discretionaryPool;

    for (const bucket of discretionaryBuckets) {
      console.log(`\n    Processing Discretionary Bucket: '${bucket.name}'`);
      let allocatedAmount = new Decimal(0);

      if (fundsAvailableInPool.lte(0)) {
        console.log('      No discretionary funds left.');
      } else {
        const intendedAmount = discretionaryPool.times(bucket.value).toDecimalPlaces(2);
        allocatedAmount = Decimal.min(intendedAmount, fundsAvailableInPool);
        console.log(
          `      Intended: $${intendedAmount.toFixed(2)}, ` +
          `Available in Pool: $${fundsAvailableInPool.toFixed(2)}.`
        );
      }

      allocatedAmount = Decimal.max(new Decimal(0), allocatedAmount);
      console.log(
        `      Type: % of Discretionary (${bucket.value.times(100).toFixed(1)}%). ` +
        `Final Allocated: $${allocatedAmount.toFixed(2)}`
      );

      fundsAvailableInPool = fundsAvailableInPool.minus(allocatedAmount);

      bucket.virtualBalance = bucket.virtualBalance.plus(allocatedAmount);
      this.logTransaction(
        'allocation',
        allocatedAmount,
        'discretionary_pool',
        bucket.bucketId,
        'completed',
        `To ${bucket.name}`
      );
      console.log(`      Virtual Balance '${bucket.name}' updated: $${bucket.virtualBalance.toFixed(2)}`);

      // Track as discretionary
      totalToDiscretionary = totalToDiscretionary.plus(allocatedAmount);

      if (bucket.targetExternalAccountId && allocatedAmount.gt(0)) {
        const { success, message } = this.simulateTransfer(
          this.masterAccount.accountId,
          bucket.targetExternalAccountId,
          allocatedAmount
        );
        if (success) {
          bucket.virtualBalance = bucket.virtualBalance.minus(allocatedAmount);
        } else {
          console.log(`      Transfer sim failed: ${message}. Funds remain virtual.`);
        }
      } else if (allocatedAmount.lte(0)) {
        console.log('      Skipping transfer sim: $0 allocated.');
      }
    }

    if (fundsAvailableInPool.gt(new Decimal('1e-9'))) {
      console.log(`    Note: $${fundsAvailableInPool.toFixed(2)} left unallocated in discretionary pool.`);
    }

    console.log('\n--- [FM] Allocation Process Finished ---');

    // Build result
    const finalVirtualBalances: Record<string, number> = {};
    for (const bucket of this.buckets) {
      finalVirtualBalances[bucket.name] = Number(bucket.virtualBalance.toDecimalPlaces(2).toString());
    }

    const simulatedTransfers: SimulatedTransfer[] = this.transactions
      .filter(tx => tx.type === 'transfer_simulated' || tx.type === 'transfer_sim_fail')
      .map(tx => ({
        txId: tx.transactionId,
        amount: Number(tx.amount.toString()),
        source: tx.source,
        destination: tx.destination,
        status: tx.status,
        description: tx.description
      }));

    const totalAllocated = totalToSavings.plus(totalToBills).plus(totalToDiscretionary);

    const bucketDetails: BucketDetail[] = this.buckets.map(bucket => {
      const allocated = Number(bucket.virtualBalance.toDecimalPlaces(2).toString());
      let category: 'savings' | 'bills' | 'discretionary' | 'other' = 'other';
      const nameLC = bucket.name.toLowerCase();
      if (nameLC.includes('saving') || nameLC.includes('emergency') || nameLC.includes('invest')) {
        category = 'savings';
      } else if (nameLC.includes('bill') || nameLC.includes('rent') || nameLC.includes('utilit') || nameLC.includes('insurance')) {
        category = 'bills';
      } else if (nameLC.includes('fun') || nameLC.includes('entertainment') || nameLC.includes('dining') || nameLC.includes('lifestyle')) {
        category = 'discretionary';
      }
      return {
        bucketId: bucket.bucketId,
        name: bucket.name,
        emoji: bucket.emoji || '',
        allocationType: bucket.allocationType,
        allocated,
        virtualBalance: allocated,
        category,
      };
    });

    const totalIncomeNum = Number(incomeAmount.toString());
    const totalAllocatedNum = Number(totalAllocated.toDecimalPlaces(2).toString());
    const savingsRate = totalIncomeNum > 0 ? Number(totalToSavings.div(incomeAmount).times(100).toDecimalPlaces(1).toString()) : 0;

    const summary: AllocationSummary = {
      totalIncome: totalIncomeNum,
      totalAllocated: totalAllocatedNum,
      totalToSavings: Number(totalToSavings.toDecimalPlaces(2).toString()),
      totalToBills: Number(totalToBills.toDecimalPlaces(2).toString()),
      totalToDiscretionary: Number(totalToDiscretionary.toDecimalPlaces(2).toString()),
      remainingUnallocated: Number(fundsAvailableInPool.toDecimalPlaces(2).toString()),
      savingsRate,
      bucketDetails,
    };

    return {
      finalMasterBalanceSimulated: Number(this.masterAccount.balance.toDecimalPlaces(2).toString()),
      finalVirtualBalances,
      simulatedTransfers,
      transactions: this.transactions,
      summary
    };
  }

  /**
   * Get the current state of all buckets
   */
  getBucketStates(): Array<{
    bucketId: string;
    name: string;
    allocationType: string;
    value: number;
    priority: number;
    virtualBalance: number;
    targetExternalAccountId?: string;
  }> {
    return this.buckets.map(bucket => ({
      bucketId: bucket.bucketId,
      name: bucket.name,
      allocationType: bucket.allocationType,
      value: Number(bucket.value.toString()),
      priority: bucket.priority,
      virtualBalance: Number(bucket.virtualBalance.toDecimalPlaces(2).toString()),
      targetExternalAccountId: bucket.targetExternalAccountId
    }));
  }

  /**
   * Reset the manager state (for re-running allocations)
   */
  reset(newStartingBalance?: Decimal): void {
    this.masterAccount.balance = newStartingBalance || new Decimal(0);
    this.transactions = [];
    for (const bucket of this.buckets) {
      bucket.virtualBalance = new Decimal(0);
    }
  }
}

/**
 * Helper function to create an Account from raw data
 */
export function createAccount(data: {
  accountId: string;
  accountType: 'master' | 'external';
  plaidType?: string;
  plaidSubtype?: string;
  name?: string;
  mask?: string;
  balance?: number | string;
  routingNumber?: string;
  accountNumber?: string;
}): Account {
  return {
    ...data,
    balance: new Decimal(data.balance || 0)
  };
}

/**
 * Helper function to create a Bucket from raw data
 */
export function createBucket(data: {
  bucketId: string;
  name: string;
  allocationType: Bucket['allocationType'];
  masterAccountId: string;
  value: number | string;
  priority: number;
  targetExternalAccountId?: string;
  emoji?: string;
  description?: string;
  color?: string;
}): Bucket {
  const value = new Decimal(data.value);

  // Validate
  if (data.allocationType.startsWith('percent') && (value.lt(0) || value.gt(1))) {
    throw new Error('Percentage value must be between 0 and 1');
  }
  if (data.allocationType === 'fixed_dollar' && value.lt(0)) {
    throw new Error('Fixed dollar value cannot be negative');
  }

  return {
    ...data,
    value,
    virtualBalance: new Decimal(0)
  };
}
