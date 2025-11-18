/**
 * TypeScript types for D1 database tables
 */

export interface User {
  id: string;
  email: string;
  password_hash: string | null;
  name: string | null;
  avatar_url: string | null;
  email_verified: number; // SQLite boolean (0 or 1)
  created_at: number; // Unix timestamp in milliseconds
  updated_at: number;
}

export interface OAuthAccount {
  id: string;
  user_id: string;
  provider: 'github' | 'google';
  provider_user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  token: string; // JWT access token
  refresh_token: string;
  expires_at: number;
  created_at: number;
  last_activity: number;
  user_agent: string | null;
  ip_address: string | null;
}

export interface Credit {
  id: string;
  user_id: string;
  credit_type: 'daily' | 'purchased';
  amount: number;
  reset_date: number | null; // NULL for purchased, timestamp for daily
  created_at: number;
  updated_at: number;
}

export interface WhopTransaction {
  id: string;
  user_id: string;
  whop_payment_id: string;
  whop_user_id: string | null;
  amount_cents: number;
  credits_purchased: number;
  status: 'pending' | 'completed' | 'failed';
  metadata: string | null; // JSON string
  created_at: number;
  completed_at: number | null;
}

export interface CreditUsage {
  id: string;
  user_id: string;
  credits_deducted: number;
  credit_type_used: 'purchased' | 'daily';
  action_type: string; // 'chat_message', 'api_call', etc.
  metadata: string | null; // JSON string
  created_at: number;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string | null;
  messages: string; // JSON string
  metadata: string | null; // JSON string
  created_at: number;
  updated_at: number;
}

export interface ChatFile {
  id: string;
  chat_id: string;
  user_id: string;
  file_path: string;
  r2_key: string;
  size_bytes: number;
  mime_type: string | null;
  created_at: number;
}

export interface AuthToken {
  id: string;
  user_id: string;
  token: string;
  token_type: 'email_verification' | 'password_reset';
  expires_at: number;
  used: number; // SQLite boolean (0 or 1)
  created_at: number;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  event_type: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: string | null; // JSON string
  created_at: number;
}

// Helper types for API responses
export interface UserWithCredits extends User {
  daily_credits: number;
  purchased_credits: number;
  total_credits: number;
}

export interface CreditBalance {
  daily_credits: number;
  daily_credits_reset_date: number | null;
  purchased_credits: number;
  total_credits: number;
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string | null;
  sessionId: string;
  iat: number;
  exp: number;
}

// Database connection type
export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

export interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

export interface D1ExecResult {
  count: number;
  duration: number;
}



