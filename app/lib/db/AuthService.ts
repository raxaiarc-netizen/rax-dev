/**
 * Authentication service for session and OAuth management
 */
import type { D1Database, Session, OAuthAccount, AuthToken } from './types';

export class AuthService {
  constructor(private db: D1Database) {}

  /**
   * Create a new session
   */
  async createSession(data: {
    user_id: string;
    token: string;
    refresh_token: string;
    expires_at: number;
    user_agent?: string;
    ip_address?: string;
  }  ): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      id: crypto.randomUUID(),
      user_id: data.user_id,
      token: data.token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
      created_at: now,
      last_activity: now,
      user_agent: data.user_agent || null,
      ip_address: data.ip_address || null,
    };

    await this.db
      .prepare(
        `INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, created_at, last_activity, user_agent, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        session.id,
        session.user_id,
        session.token,
        session.refresh_token,
        session.expires_at,
        session.created_at,
        session.last_activity,
        session.user_agent,
        session.ip_address,
      )
      .run();

    return session;
  }

  /**
   * Find session by token
   */
  async findSessionByToken(token: string): Promise<Session | null> {
    const result = await this.db
      .prepare(`SELECT * FROM sessions WHERE token = ? AND expires_at > ? LIMIT 1`)
      .bind(token, Date.now())
      .first<Session>();

    return result || null;
  }

  /**
   * Find session by refresh token
   */
  async findSessionByRefreshToken(refreshToken: string): Promise<Session | null> {
    const result = await this.db
      .prepare(`SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > ? LIMIT 1`)
      .bind(refreshToken, Date.now())
      .first<Session>();

    return result || null;
  }

  /**
   * Update session token
   */
  async updateSessionToken(sessionId: string, token: string, expiresAt: number): Promise<void> {
    await this.db
      .prepare(
        `UPDATE sessions 
         SET token = ?, expires_at = ?, last_activity = ? 
         WHERE id = ?`,
      )
      .bind(token, expiresAt, Date.now(), sessionId)
      .run();
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.db
      .prepare(`UPDATE sessions SET last_activity = ? WHERE id = ?`)
      .bind(Date.now(), sessionId)
      .run();
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run();
  }

  /**
   * Delete all sessions for a user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM sessions WHERE user_id = ?`).bind(userId).run();
  }

  /**
   * Delete expired sessions (cleanup)
   */
  async deleteExpiredSessions(): Promise<void> {
    await this.db.prepare(`DELETE FROM sessions WHERE expires_at < ?`).bind(Date.now()).run();
  }

  /**
   * Create or update OAuth account
   */
  async upsertOAuthAccount(data: {
    user_id: string;
    provider: 'github' | 'google';
    provider_user_id: string;
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  }): Promise<OAuthAccount> {
    const now = Date.now();

    // Check if account exists
    const existing = await this.db
      .prepare(`SELECT * FROM oauth_accounts WHERE provider = ? AND provider_user_id = ? LIMIT 1`)
      .bind(data.provider, data.provider_user_id)
      .first<OAuthAccount>();

    if (existing) {
      // Update existing
      await this.db
        .prepare(
          `UPDATE oauth_accounts 
           SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(data.access_token || null, data.refresh_token || null, data.expires_at || null, now, existing.id)
        .run();

      return {
        ...existing,
        access_token: data.access_token || null,
        refresh_token: data.refresh_token || null,
        expires_at: data.expires_at || null,
        updated_at: now,
      };
    } else {
      // Create new
      const account: OAuthAccount = {
        id: crypto.randomUUID(),
        user_id: data.user_id,
        provider: data.provider,
        provider_user_id: data.provider_user_id,
        access_token: data.access_token || null,
        refresh_token: data.refresh_token || null,
        expires_at: data.expires_at || null,
        created_at: now,
        updated_at: now,
      };

      await this.db
        .prepare(
          `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, access_token, refresh_token, expires_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          account.id,
          account.user_id,
          account.provider,
          account.provider_user_id,
          account.access_token,
          account.refresh_token,
          account.expires_at,
          account.created_at,
          account.updated_at,
        )
        .run();

      return account;
    }
  }

  /**
   * Find OAuth account by provider and provider user ID
   */
  async findOAuthAccount(provider: string, providerUserId: string): Promise<OAuthAccount | null> {
    const result = await this.db
      .prepare(`SELECT * FROM oauth_accounts WHERE provider = ? AND provider_user_id = ? LIMIT 1`)
      .bind(provider, providerUserId)
      .first<OAuthAccount>();

    return result || null;
  }

  /**
   * Get all OAuth accounts for a user
   */
  async getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
    const result = await this.db
      .prepare(`SELECT * FROM oauth_accounts WHERE user_id = ? ORDER BY created_at DESC`)
      .bind(userId)
      .all<OAuthAccount>();

    return result.results || [];
  }

  /**
   * Delete OAuth account
   */
  async deleteOAuthAccount(id: string): Promise<void> {
    await this.db.prepare(`DELETE FROM oauth_accounts WHERE id = ?`).bind(id).run();
  }

  /**
   * Create auth token (email verification or password reset)
   */
  async createAuthToken(data: {
    user_id: string;
    token_type: 'email_verification' | 'password_reset';
    expires_in_minutes?: number;
  }  ): Promise<AuthToken> {
    const now = Date.now();
    const expiresInMinutes = data.expires_in_minutes || 15;
    const token: AuthToken = {
      id: crypto.randomUUID(),
      user_id: data.user_id,
      token: crypto.randomUUID() + crypto.randomUUID(), // 64 char token
      token_type: data.token_type,
      expires_at: now + expiresInMinutes * 60 * 1000,
      used: 0,
      created_at: now,
    };

    await this.db
      .prepare(
        `INSERT INTO auth_tokens (id, user_id, token, token_type, expires_at, used, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(token.id, token.user_id, token.token, token.token_type, token.expires_at, token.used, token.created_at)
      .run();

    return token;
  }

  /**
   * Find and validate auth token
   */
  async findAuthToken(token: string, tokenType: string): Promise<AuthToken | null> {
    const result = await this.db
      .prepare(
        `SELECT * FROM auth_tokens 
         WHERE token = ? AND token_type = ? AND expires_at > ? AND used = 0 
         LIMIT 1`,
      )
      .bind(token, tokenType, Date.now())
      .first<AuthToken>();

    return result || null;
  }

  /**
   * Mark auth token as used
   */
  async markTokenAsUsed(token: string): Promise<void> {
    await this.db.prepare(`UPDATE auth_tokens SET used = 1 WHERE token = ?`).bind(token).run();
  }

  /**
   * Delete expired auth tokens (cleanup)
   */
  async deleteExpiredAuthTokens(): Promise<void> {
    await this.db.prepare(`DELETE FROM auth_tokens WHERE expires_at < ?`).bind(Date.now()).run();
  }
}

