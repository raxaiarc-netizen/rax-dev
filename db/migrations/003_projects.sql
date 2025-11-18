-- Migration: Add projects, project_files, and project_snapshots tables
-- This migration adds cloud storage for apps/projects created by users

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

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_chat_id ON projects(chat_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);

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

CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_user_id ON project_files(user_id);
CREATE INDEX IF NOT EXISTS idx_project_files_r2_key ON project_files(r2_key);
CREATE INDEX IF NOT EXISTS idx_project_files_hash ON project_files(file_hash);

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

CREATE INDEX IF NOT EXISTS idx_project_snapshots_project_id ON project_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_project_snapshots_created_at ON project_snapshots(created_at);

