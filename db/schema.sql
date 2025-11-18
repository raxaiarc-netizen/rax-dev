-- RAX.AI Database Schema for Authentication and User Management
-- Cloudflare D1 SQLite Database

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  name TEXT,
  avatar_url TEXT,
  email_verified INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- OAuth accounts for third-party authentication
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_oauth_user_id ON oauth_accounts(user_id);
CREATE INDEX idx_oauth_provider ON oauth_accounts(provider, provider_user_id);

-- Sessions for JWT token management
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_activity INTEGER NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_refresh_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Credits system
CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credit_type TEXT NOT NULL, -- 'daily' or 'purchased'
  amount INTEGER NOT NULL DEFAULT 0,
  reset_date INTEGER, -- NULL for purchased credits, timestamp for daily credits
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_credits_user_id ON credits(user_id);
CREATE INDEX idx_credits_type ON credits(user_id, credit_type);

-- Whop payment transactions
CREATE TABLE IF NOT EXISTS whop_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  whop_payment_id TEXT UNIQUE NOT NULL,
  whop_user_id TEXT,
  amount_cents INTEGER NOT NULL,
  credits_purchased INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed'
  metadata TEXT, -- JSON string for additional data
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_whop_transactions_user_id ON whop_transactions(user_id);
CREATE INDEX idx_whop_transactions_payment_id ON whop_transactions(whop_payment_id);
CREATE INDEX idx_whop_transactions_status ON whop_transactions(status);

-- Credit usage log
CREATE TABLE IF NOT EXISTS credit_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  credits_deducted INTEGER NOT NULL,
  credit_type_used TEXT NOT NULL, -- 'purchased' or 'daily'
  action_type TEXT NOT NULL, -- 'chat_message', 'api_call', etc.
  metadata TEXT, -- JSON string for context (chat_id, etc.)
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX idx_credit_usage_created_at ON credit_usage(created_at);
CREATE INDEX idx_credit_usage_user_date ON credit_usage(user_id, created_at);

-- Chats stored in cloud
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT,
  messages TEXT NOT NULL, -- JSON string
  metadata TEXT, -- JSON string for additional metadata
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_updated_at ON chats(updated_at);
CREATE INDEX idx_chats_user_updated ON chats(user_id, updated_at);

-- Chat files stored in R2
CREATE TABLE IF NOT EXISTS chat_files (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  mime_type TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_files_chat_id ON chat_files(chat_id);
CREATE INDEX idx_chat_files_user_id ON chat_files(user_id);
CREATE INDEX idx_chat_files_r2_key ON chat_files(r2_key);

-- Email verification and password reset tokens
CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  token_type TEXT NOT NULL, -- 'email_verification', 'password_reset'
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_expires_at ON auth_tokens(expires_at);

-- Audit log for security events
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL, -- 'login', 'logout', 'password_change', etc.
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT, -- JSON string
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);

-- Projects/Apps stored in cloud
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  chat_id TEXT, -- Optional: Link to the chat that created this project
  name TEXT NOT NULL,
  description TEXT,
  framework TEXT, -- 'react', 'vue', 'vite', etc.
  template TEXT, -- Template used to create the project
  status TEXT DEFAULT 'active', -- 'active', 'archived', 'deleted'
  total_size_bytes INTEGER DEFAULT 0,
  file_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  last_accessed_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE SET NULL
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_chat_id ON projects(chat_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at);
CREATE INDEX idx_projects_user_status ON projects(user_id, status);

-- Project files stored in R2
CREATE TABLE IF NOT EXISTS project_files (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Relative path within project
  r2_key TEXT NOT NULL, -- Key in R2 bucket
  size_bytes INTEGER NOT NULL,
  mime_type TEXT,
  file_hash TEXT, -- SHA-256 hash for deduplication
  is_binary INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, file_path)
);

CREATE INDEX idx_project_files_project_id ON project_files(project_id);
CREATE INDEX idx_project_files_user_id ON project_files(user_id);
CREATE INDEX idx_project_files_r2_key ON project_files(r2_key);
CREATE INDEX idx_project_files_hash ON project_files(file_hash);

-- Project snapshots for version control
CREATE TABLE IF NOT EXISTS project_snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  snapshot_name TEXT,
  description TEXT,
  file_manifest TEXT NOT NULL, -- JSON: Array of {path, r2_key, hash}
  created_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_project_snapshots_project_id ON project_snapshots(project_id);
CREATE INDEX idx_project_snapshots_created_at ON project_snapshots(created_at);

