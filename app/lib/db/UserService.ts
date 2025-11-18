/**
 * User service for database operations
 */
import type { D1Database, User, UserWithCredits } from './types';

export class UserService {
  constructor(private db: D1Database) {}

  /**
   * Create a new user
   */
  async createUser(data: {
    email: string;
    password_hash?: string;
    name?: string;
    avatar_url?: string;
  }): Promise<User> {
    const now = Date.now();
    const user: User = {
      id: crypto.randomUUID(),
      email: data.email.toLowerCase(),
      password_hash: data.password_hash || null,
      name: data.name || null,
      avatar_url: data.avatar_url || null,
      email_verified: 0,
      created_at: now,
      updated_at: now,
    };

    await this.db
      .prepare(
        `INSERT INTO users (id, email, password_hash, name, avatar_url, email_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        user.id,
        user.email,
        user.password_hash,
        user.name,
        user.avatar_url,
        user.email_verified,
        user.created_at,
        user.updated_at,
      )
      .run();

    // Initialize daily credits for new user
    await this.db
      .prepare(
        `INSERT INTO credits (id, user_id, credit_type, amount, reset_date, created_at, updated_at)
         VALUES (?, ?, 'daily', 5, ?, ?, ?)`,
      )
      .bind(crypto.randomUUID(), user.id, this.getNextMidnightUTC(), now, now)
      .run();

    return user;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db
      .prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`)
      .bind(email.toLowerCase())
      .first<User>();

    return result || null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await this.db
      .prepare(`SELECT * FROM users WHERE id = ? LIMIT 1`)
      .bind(id)
      .first<User>();

    return result || null;
  }

  /**
   * Find user by ID with credit balance
   * OPTIMIZED: Single query with conditional aggregation instead of 3 separate queries
   */
  async findByIdWithCredits(id: string): Promise<UserWithCredits | null> {
    // Single optimized query combining user data and credit aggregations
    const result = await this.db
      .prepare(
        `SELECT 
          u.*,
          COALESCE(SUM(CASE WHEN c.credit_type = 'daily' THEN c.amount ELSE 0 END), 0) as daily_credits,
          COALESCE(SUM(CASE WHEN c.credit_type = 'purchased' THEN c.amount ELSE 0 END), 0) as purchased_credits
         FROM users u
         LEFT JOIN credits c ON c.user_id = u.id
         WHERE u.id = ?
         GROUP BY u.id`,
      )
      .bind(id)
      .first<User & { daily_credits: number; purchased_credits: number }>();

    if (!result) {
      return null;
    }

    const daily = result.daily_credits || 0;
    const purchased = result.purchased_credits || 0;

    return {
      id: result.id,
      email: result.email,
      password_hash: result.password_hash,
      name: result.name,
      avatar_url: result.avatar_url,
      email_verified: result.email_verified,
      created_at: result.created_at,
      updated_at: result.updated_at,
      daily_credits: daily,
      purchased_credits: purchased,
      total_credits: daily + purchased,
    };
  }

  /**
   * Update user
   */
  async updateUser(
    id: string,
    data: Partial<Pick<User, 'name' | 'avatar_url' | 'email_verified'>>,
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(data.avatar_url);
    }

    if (data.email_verified !== undefined) {
      updates.push('email_verified = ?');
      values.push(data.email_verified);
    }

    if (updates.length === 0) {
      return;
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await this.db
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, password_hash: string): Promise<void> {
    await this.db
      .prepare(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`)
      .bind(password_hash, Date.now(), id)
      .run();
  }

  /**
   * Delete user and all associated data
   */
  async deleteUser(id: string): Promise<void> {
    // Foreign key cascades will handle related records
    await this.db.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    const result = await this.db
      .prepare(`SELECT 1 FROM users WHERE email = ? LIMIT 1`)
      .bind(email.toLowerCase())
      .first();

    return !!result;
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

