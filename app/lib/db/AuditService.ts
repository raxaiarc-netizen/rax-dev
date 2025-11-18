/**
 * Audit service for security event logging
 */
import type { D1Database, AuditLog } from './types';

export type AuditEventType =
  | 'login'
  | 'logout'
  | 'register'
  | 'password_change'
  | 'password_reset'
  | 'email_verified'
  | 'oauth_linked'
  | 'oauth_unlinked'
  | 'credits_purchased'
  | 'credits_deducted'
  | 'account_deleted'
  | 'failed_login'
  | 'suspicious_activity';

export class AuditService {
  constructor(private db: D1Database) {}

  /**
   * Log an audit event
   */
  async logEvent(data: {
    user_id?: string;
    event_type: AuditEventType;
    ip_address?: string;
    user_agent?: string;
    metadata?: any;
  }  ): Promise<AuditLog> {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      user_id: data.user_id || null,
      event_type: data.event_type,
      ip_address: data.ip_address || null,
      user_agent: data.user_agent || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      created_at: Date.now(),
    };

    await this.db
      .prepare(
        `INSERT INTO audit_logs (id, user_id, event_type, ip_address, user_agent, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(log.id, log.user_id, log.event_type, log.ip_address, log.user_agent, log.metadata, log.created_at)
      .run();

    return log;
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(userId: string, limit: number = 50, offset: number = 0): Promise<AuditLog[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM audit_logs 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
      )
      .bind(userId, limit, offset)
      .all<AuditLog>();

    return result.results || [];
  }

  /**
   * Get logs by event type
   */
  async getLogsByEventType(
    eventType: AuditEventType,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditLog[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM audit_logs 
         WHERE event_type = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
      )
      .bind(eventType, limit, offset)
      .all<AuditLog>();

    return result.results || [];
  }

  /**
   * Get recent failed login attempts for security monitoring
   */
  async getRecentFailedLogins(minutes: number = 15): Promise<AuditLog[]> {
    const since = Date.now() - minutes * 60 * 1000;
    const result = await this.db
      .prepare(
        `SELECT * FROM audit_logs 
         WHERE event_type = 'failed_login' AND created_at > ? 
         ORDER BY created_at DESC`,
      )
      .bind(since)
      .all<AuditLog>();

    return result.results || [];
  }

  /**
   * Count failed login attempts for an IP address
   */
  async countFailedLoginsByIP(ipAddress: string, minutes: number = 15): Promise<number> {
    const since = Date.now() - minutes * 60 * 1000;
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE event_type = 'failed_login' 
         AND ip_address = ? 
         AND created_at > ?`,
      )
      .bind(ipAddress, since)
      .first<{ count: number }>();

    return result?.count || 0;
  }

  /**
   * Count failed login attempts for a user
   */
  async countFailedLoginsByUser(userId: string, minutes: number = 15): Promise<number> {
    const since = Date.now() - minutes * 60 * 1000;
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE event_type = 'failed_login' 
         AND user_id = ? 
         AND created_at > ?`,
      )
      .bind(userId, since)
      .first<{ count: number }>();

    return result?.count || 0;
  }

  /**
   * Delete old audit logs (cleanup)
   */
  async deleteOldLogs(olderThanDays: number = 90): Promise<void> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    await this.db.prepare(`DELETE FROM audit_logs WHERE created_at < ?`).bind(cutoff).run();
  }
}

