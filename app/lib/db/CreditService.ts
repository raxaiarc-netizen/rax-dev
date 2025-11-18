/**
 * Credit service for managing user credits and transactions
 */
import type { D1Database, Credit, CreditBalance, CreditUsage, WhopTransaction } from './types';

export class CreditService {
  constructor(private db: D1Database) {}

  /**
   * Get user's current credit balance
   * OPTIMIZED: Single query with conditional aggregation instead of 2 separate queries
   */
  async getCreditBalance(userId: string): Promise<CreditBalance> {
    // Single optimized query combining both credit types
    const result = await this.db
      .prepare(
        `SELECT 
          MAX(CASE WHEN credit_type = 'daily' THEN amount ELSE 0 END) as daily_amount,
          MAX(CASE WHEN credit_type = 'daily' THEN reset_date ELSE NULL END) as reset_date,
          COALESCE(SUM(CASE WHEN credit_type = 'purchased' THEN amount ELSE 0 END), 0) as purchased_total
         FROM credits 
         WHERE user_id = ?`,
      )
      .bind(userId)
      .first<{ daily_amount: number; reset_date: number | null; purchased_total: number }>();

    const dailyCredits = result?.daily_amount || 0;
    const dailyResetDate = result?.reset_date || null;
    const purchasedCredits = result?.purchased_total || 0;

    return {
      daily_credits: dailyCredits,
      daily_credits_reset_date: dailyResetDate,
      purchased_credits: purchasedCredits,
      total_credits: dailyCredits + purchasedCredits,
    };
  }

  /**
   * Check if user has enough credits
   */
  async hasCredits(userId: string, amount: number = 1): Promise<boolean> {
    const balance = await this.getCreditBalance(userId);
    return balance.total_credits >= amount;
  }

  /**
   * Deduct credits from user account
   * Priority: purchased credits first, then daily credits
   */
  async deductCredits(userId: string, amount: number, actionType: string, metadata?: any): Promise<boolean> {
    const balance = await this.getCreditBalance(userId);

    if (balance.total_credits < amount) {
      return false;
    }

    let remaining = amount;

    // First, deduct from purchased credits
    if (balance.purchased_credits > 0) {
      const toDeduct = Math.min(remaining, balance.purchased_credits);

      await this.db
        .prepare(
          `UPDATE credits 
           SET amount = amount - ?, updated_at = ?
           WHERE user_id = ? AND credit_type = 'purchased' AND amount > 0`,
        )
        .bind(toDeduct, Date.now(), userId)
        .run();

      // Log usage
      await this.logCreditUsage(userId, toDeduct, 'purchased', actionType, metadata);

      remaining -= toDeduct;
    }

    // Then, deduct from daily credits if needed
    if (remaining > 0 && balance.daily_credits > 0) {
      await this.db
        .prepare(
          `UPDATE credits 
           SET amount = amount - ?, updated_at = ?
           WHERE user_id = ? AND credit_type = 'daily'`,
        )
        .bind(remaining, Date.now(), userId)
        .run();

      // Log usage
      await this.logCreditUsage(userId, remaining, 'daily', actionType, metadata);
    }

    return true;
  }

  /**
   * Add purchased credits to user account
   */
  async addPurchasedCredits(userId: string, amount: number): Promise<void> {
    const now = Date.now();

    // Check if user has existing purchased credits record
    const existing = await this.db
      .prepare(`SELECT id, amount FROM credits WHERE user_id = ? AND credit_type = 'purchased' LIMIT 1`)
      .bind(userId)
      .first<{ id: string; amount: number }>();

    if (existing) {
      // Update existing record
      await this.db
        .prepare(
          `UPDATE credits 
           SET amount = amount + ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(amount, now, existing.id)
        .run();
    } else {
      // Create new record
      await this.db
        .prepare(
          `INSERT INTO credits (id, user_id, credit_type, amount, reset_date, created_at, updated_at)
           VALUES (?, ?, 'purchased', ?, NULL, ?, ?)`,
        )
        .bind(crypto.randomUUID(), userId, amount, now, now)
        .run();
    }
  }

  /**
   * Reset daily credits to 5
   */
  async resetDailyCredits(userId: string): Promise<void> {
    const now = Date.now();
    const nextReset = this.getNextMidnightUTC();

    await this.db
      .prepare(
        `UPDATE credits 
         SET amount = 5, reset_date = ?, updated_at = ?
         WHERE user_id = ? AND credit_type = 'daily'`,
      )
      .bind(nextReset, now, userId)
      .run();
  }

  /**
   * Check and reset daily credits if expired
   */
  async checkAndResetDailyCredits(userId: string): Promise<void> {
    const daily = await this.db
      .prepare(
        `SELECT reset_date 
         FROM credits 
         WHERE user_id = ? AND credit_type = 'daily' 
         LIMIT 1`,
      )
      .bind(userId)
      .first<{ reset_date: number }>();

    if (daily && daily.reset_date && daily.reset_date <= Date.now()) {
      await this.resetDailyCredits(userId);
    }
  }

  /**
   * Log credit usage
   */
  private async logCreditUsage(
    userId: string,
    creditsDeducted: number,
    creditTypeUsed: 'purchased' | 'daily',
    actionType: string,
    metadata?: any,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO credit_usage (id, user_id, credits_deducted, credit_type_used, action_type, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        userId,
        creditsDeducted,
        creditTypeUsed,
        actionType,
        metadata ? JSON.stringify(metadata) : null,
        Date.now(),
      )
      .run();
  }

  /**
   * Get credit usage history
   */
  async getCreditUsageHistory(userId: string, limit: number = 50): Promise<CreditUsage[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM credit_usage 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
      )
      .bind(userId, limit)
      .all<CreditUsage>();

    return result.results || [];
  }

  /**
   * Create Whop transaction
   */
  async createWhopTransaction(data: {
    user_id: string;
    whop_payment_id: string;
    whop_user_id?: string;
    amount_cents: number;
    credits_purchased: number;
    metadata?: any;
  }  ): Promise<WhopTransaction> {
    const now = Date.now();
    const transaction: WhopTransaction = {
      id: crypto.randomUUID(),
      user_id: data.user_id,
      whop_payment_id: data.whop_payment_id,
      whop_user_id: data.whop_user_id || null,
      amount_cents: data.amount_cents,
      credits_purchased: data.credits_purchased,
      status: 'pending',
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      created_at: now,
      completed_at: null,
    };

    await this.db
      .prepare(
        `INSERT INTO whop_transactions (id, user_id, whop_payment_id, whop_user_id, amount_cents, credits_purchased, status, metadata, created_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        transaction.id,
        transaction.user_id,
        transaction.whop_payment_id,
        transaction.whop_user_id,
        transaction.amount_cents,
        transaction.credits_purchased,
        transaction.status,
        transaction.metadata,
        transaction.created_at,
        transaction.completed_at,
      )
      .run();

    return transaction;
  }

  /**
   * Update Whop transaction status
   */
  async updateWhopTransactionStatus(
    whopPaymentId: string,
    status: 'completed' | 'failed',
  ): Promise<WhopTransaction | null> {
    const now = Date.now();

    // Get the transaction
    const transaction = await this.db
      .prepare(`SELECT * FROM whop_transactions WHERE whop_payment_id = ? LIMIT 1`)
      .bind(whopPaymentId)
      .first<WhopTransaction>();

    if (!transaction) {
      return null;
    }

    // Update status
    await this.db
      .prepare(
        `UPDATE whop_transactions 
         SET status = ?, completed_at = ?
         WHERE whop_payment_id = ?`,
      )
      .bind(status, now, whopPaymentId)
      .run();

    // If completed, add credits to user account
    if (status === 'completed') {
      await this.addPurchasedCredits(transaction.user_id, transaction.credits_purchased);
    }

    return {
      ...transaction,
      status,
      completed_at: now,
    };
  }

  /**
   * Get Whop transaction by payment ID
   */
  async getWhopTransaction(whopPaymentId: string): Promise<WhopTransaction | null> {
    const result = await this.db
      .prepare(`SELECT * FROM whop_transactions WHERE whop_payment_id = ? LIMIT 1`)
      .bind(whopPaymentId)
      .first<WhopTransaction>();

    return result || null;
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactions(userId: string, limit: number = 50): Promise<WhopTransaction[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM whop_transactions 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ?`,
      )
      .bind(userId, limit)
      .all<WhopTransaction>();

    return result.results || [];
  }

  /**
   * Get next midnight UTC timestamp for daily credit reset
   */
  private getNextMidnightUTC(): number {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));

    return tomorrow.getTime();
  }
}

