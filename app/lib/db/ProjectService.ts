/**
 * Project service for managing cloud-stored projects/apps
 */
import type { D1Database } from './types';

export interface Project {
  id: string;
  user_id: string;
  chat_id: string | null;
  name: string;
  description: string | null;
  framework: string | null;
  template: string | null;
  status: 'active' | 'archived' | 'deleted';
  total_size_bytes: number;
  file_count: number;
  created_at: number;
  updated_at: number;
  last_accessed_at: number | null;
}

export interface ProjectFile {
  id: string;
  project_id: string;
  user_id: string;
  file_path: string;
  r2_key: string;
  size_bytes: number;
  mime_type: string | null;
  file_hash: string | null;
  is_binary: number;
  created_at: number;
  updated_at: number;
}

export interface ProjectSnapshot {
  id: string;
  project_id: string;
  user_id: string;
  snapshot_name: string | null;
  description: string | null;
  file_manifest: string; // JSON array
  created_at: number;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string | null;
  framework: string | null;
  status: string;
  file_count: number;
  total_size_bytes: number;
  created_at: number;
  updated_at: number;
  last_accessed_at: number | null;
}

export class ProjectService {
  constructor(private db: D1Database) {}

  /**
   * Create a new project
   */
  async createProject(data: {
    id?: string; // Optional: use provided ID (e.g., from chatId)
    userId: string;
    chatId?: string;
    name: string;
    description?: string;
    framework?: string;
    template?: string;
  }): Promise<Project> {
    const now = Date.now();
    const project: Project = {
      id: data.id || crypto.randomUUID(), // Use provided ID or generate new one
      user_id: data.userId,
      chat_id: data.chatId || null,
      name: data.name,
      description: data.description || null,
      framework: data.framework || null,
      template: data.template || null,
      status: 'active',
      total_size_bytes: 0,
      file_count: 0,
      created_at: now,
      updated_at: now,
      last_accessed_at: now,
    };

    try {
      const result = await this.db
        .prepare(
          `INSERT INTO projects (id, user_id, chat_id, name, description, framework, template, status, total_size_bytes, file_count, created_at, updated_at, last_accessed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          project.id,
          project.user_id,
          project.chat_id,
          project.name,
          project.description,
          project.framework,
          project.template,
          project.status,
          project.total_size_bytes,
          project.file_count,
          project.created_at,
          project.updated_at,
          project.last_accessed_at,
        )
        .run();
      
      // Check if the insert was successful
      if (!result.success) {
        throw new Error(`Failed to insert project: ${JSON.stringify(result)}`);
      }
    } catch (error: any) {
      // Check if it's a duplicate key error
      if (error.message && error.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Project with ID ${project.id} already exists`);
      }
      // Log the full error for debugging
      console.error('Failed to create project:', error);
      throw error;
    }

    return project;
  }

  /**
   * Get project by ID
   */
  async getProjectById(projectId: string, userId: string): Promise<Project | null> {
    const result = await this.db
      .prepare(`SELECT * FROM projects WHERE id = ? AND user_id = ? LIMIT 1`)
      .bind(projectId, userId)
      .first<Project>();

    // Update last accessed time
    if (result) {
      await this.db
        .prepare(`UPDATE projects SET last_accessed_at = ? WHERE id = ?`)
        .bind(Date.now(), projectId)
        .run();
    }

    return result || null;
  }

  /**
   * Get all projects for a user
   */
  async getUserProjects(
    userId: string,
    status: 'active' | 'archived' | 'all' = 'active',
    limit: number = 100,
    offset: number = 0,
  ): Promise<ProjectListItem[]> {
    let query = `SELECT id, name, description, framework, status, file_count, total_size_bytes, created_at, updated_at, last_accessed_at
                 FROM projects 
                 WHERE user_id = ?`;

    const params: any[] = [userId];

    if (status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY updated_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await this.db.prepare(query).bind(...params).all<ProjectListItem>();

    return result.results || [];
  }

  /**
   * Get projects by chat ID
   */
  async getProjectsByChatId(chatId: string, userId: string): Promise<ProjectListItem[]> {
    const result = await this.db
      .prepare(
        `SELECT id, name, description, framework, status, file_count, total_size_bytes, created_at, updated_at, last_accessed_at
         FROM projects 
         WHERE chat_id = ? AND user_id = ? AND status = 'active'
         ORDER BY updated_at DESC`,
      )
      .bind(chatId, userId)
      .all<ProjectListItem>();

    return result.results || [];
  }

  /**
   * Update project metadata
   */
  async updateProject(
    projectId: string,
    userId: string,
    data: {
      name?: string;
      description?: string;
      framework?: string;
      status?: 'active' | 'archived' | 'deleted';
    },
  ): Promise<void> {
    const updates: string[] = ['updated_at = ?'];
    const values: any[] = [Date.now()];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }

    if (data.framework !== undefined) {
      updates.push('framework = ?');
      values.push(data.framework);
    }

    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    values.push(projectId, userId);

    await this.db
      .prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    await this.db
      .prepare(`UPDATE projects SET status = 'deleted', updated_at = ? WHERE id = ? AND user_id = ?`)
      .bind(Date.now(), projectId, userId)
      .run();
  }

  /**
   * Hard delete project and all associated files
   */
  async hardDeleteProject(projectId: string, userId: string): Promise<ProjectFile[]> {
    // Get all files for R2 cleanup
    const files = await this.getProjectFiles(projectId, userId);

    // Delete project (cascade will delete files)
    await this.db.prepare(`DELETE FROM projects WHERE id = ? AND user_id = ?`).bind(projectId, userId).run();

    return files;
  }

  /**
   * Add or update a file in the project
   */
  async upsertProjectFile(data: {
    projectId: string;
    userId: string;
    filePath: string;
    r2Key: string;
    sizeBytes: number;
    mimeType?: string;
    fileHash?: string;
    isBinary?: boolean;
  }): Promise<ProjectFile> {
    const now = Date.now();

    // Check if file already exists
    const existing = await this.db
      .prepare(`SELECT * FROM project_files WHERE project_id = ? AND file_path = ? LIMIT 1`)
      .bind(data.projectId, data.filePath)
      .first<ProjectFile>();

    let file: ProjectFile;

    if (existing) {
      // Update existing file
      file = {
        ...existing,
        r2_key: data.r2Key,
        size_bytes: data.sizeBytes,
        mime_type: data.mimeType || existing.mime_type,
        file_hash: data.fileHash || existing.file_hash,
        is_binary: data.isBinary ? 1 : existing.is_binary,
        updated_at: now,
      };

      await this.db
        .prepare(
          `UPDATE project_files 
           SET r2_key = ?, size_bytes = ?, mime_type = ?, file_hash = ?, is_binary = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(file.r2_key, file.size_bytes, file.mime_type, file.file_hash, file.is_binary, file.updated_at, file.id)
        .run();

      // Update project size (remove old size, add new size)
      const sizeDiff = data.sizeBytes - existing.size_bytes;
      await this.db
        .prepare(`UPDATE projects SET total_size_bytes = total_size_bytes + ?, updated_at = ? WHERE id = ?`)
        .bind(sizeDiff, now, data.projectId)
        .run();
    } else {
      // Create new file
      file = {
        id: crypto.randomUUID(),
        project_id: data.projectId,
        user_id: data.userId,
        file_path: data.filePath,
        r2_key: data.r2Key,
        size_bytes: data.sizeBytes,
        mime_type: data.mimeType || null,
        file_hash: data.fileHash || null,
        is_binary: data.isBinary ? 1 : 0,
        created_at: now,
        updated_at: now,
      };

      await this.db
        .prepare(
          `INSERT INTO project_files (id, project_id, user_id, file_path, r2_key, size_bytes, mime_type, file_hash, is_binary, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          file.id,
          file.project_id,
          file.user_id,
          file.file_path,
          file.r2_key,
          file.size_bytes,
          file.mime_type,
          file.file_hash,
          file.is_binary,
          file.created_at,
          file.updated_at,
        )
        .run();

      // Update project size and file count
      await this.db
        .prepare(
          `UPDATE projects 
           SET total_size_bytes = total_size_bytes + ?, 
               file_count = file_count + 1, 
               updated_at = ? 
           WHERE id = ?`,
        )
        .bind(data.sizeBytes, now, data.projectId)
        .run();
    }

    return file;
  }

  /**
   * Get all files for a project
   */
  async getProjectFiles(projectId: string, userId: string): Promise<ProjectFile[]> {
    const result = await this.db
      .prepare(`SELECT * FROM project_files WHERE project_id = ? AND user_id = ? ORDER BY file_path ASC`)
      .bind(projectId, userId)
      .all<ProjectFile>();

    return result.results || [];
  }

  /**
   * Get a specific file
   */
  async getProjectFile(projectId: string, filePath: string, userId: string): Promise<ProjectFile | null> {
    const result = await this.db
      .prepare(`SELECT * FROM project_files WHERE project_id = ? AND file_path = ? AND user_id = ? LIMIT 1`)
      .bind(projectId, filePath, userId)
      .first<ProjectFile>();

    return result || null;
  }

  /**
   * Delete a file from the project
   */
  async deleteProjectFile(projectId: string, filePath: string, userId: string): Promise<ProjectFile | null> {
    // Get file info before deleting (for R2 cleanup)
    const file = await this.getProjectFile(projectId, filePath, userId);

    if (!file) {
      return null;
    }

    await this.db
      .prepare(`DELETE FROM project_files WHERE project_id = ? AND file_path = ? AND user_id = ?`)
      .bind(projectId, filePath, userId)
      .run();

    // Update project size and file count
    await this.db
      .prepare(
        `UPDATE projects 
         SET total_size_bytes = total_size_bytes - ?, 
             file_count = file_count - 1, 
             updated_at = ? 
         WHERE id = ?`,
      )
      .bind(file.size_bytes, Date.now(), projectId)
      .run();

    return file;
  }

  /**
   * Create a snapshot of the project
   */
  async createSnapshot(data: {
    projectId: string;
    userId: string;
    snapshotName?: string;
    description?: string;
  }): Promise<ProjectSnapshot> {
    // Get all current files
    const files = await this.getProjectFiles(data.projectId, data.userId);

    const manifest = files.map((f) => ({
      path: f.file_path,
      r2_key: f.r2_key,
      hash: f.file_hash,
      size: f.size_bytes,
    }));

    const snapshot: ProjectSnapshot = {
      id: crypto.randomUUID(),
      project_id: data.projectId,
      user_id: data.userId,
      snapshot_name: data.snapshotName || null,
      description: data.description || null,
      file_manifest: JSON.stringify(manifest),
      created_at: Date.now(),
    };

    await this.db
      .prepare(
        `INSERT INTO project_snapshots (id, project_id, user_id, snapshot_name, description, file_manifest, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        snapshot.id,
        snapshot.project_id,
        snapshot.user_id,
        snapshot.snapshot_name,
        snapshot.description,
        snapshot.file_manifest,
        snapshot.created_at,
      )
      .run();

    return snapshot;
  }

  /**
   * Get all snapshots for a project
   */
  async getProjectSnapshots(projectId: string, userId: string): Promise<ProjectSnapshot[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM project_snapshots 
         WHERE project_id = ? AND user_id = ? 
         ORDER BY created_at DESC`,
      )
      .bind(projectId, userId)
      .all<ProjectSnapshot>();

    return result.results || [];
  }

  /**
   * Get project count for a user
   */
  async getProjectCount(userId: string, status: 'active' | 'archived' | 'all' = 'active'): Promise<number> {
    let query = `SELECT COUNT(*) as count FROM projects WHERE user_id = ?`;
    const params: any[] = [userId];

    if (status !== 'all') {
      query += ` AND status = ?`;
      params.push(status);
    }

    const result = await this.db.prepare(query).bind(...params).first<{ count: number }>();

    return result?.count || 0;
  }

  /**
   * Search projects by name or description
   */
  async searchProjects(userId: string, query: string, limit: number = 20): Promise<ProjectListItem[]> {
    const searchTerm = `%${query}%`;
    const result = await this.db
      .prepare(
        `SELECT id, name, description, framework, status, file_count, total_size_bytes, created_at, updated_at, last_accessed_at
         FROM projects 
         WHERE user_id = ? AND status = 'active' AND (name LIKE ? OR description LIKE ?)
         ORDER BY updated_at DESC 
         LIMIT ?`,
      )
      .bind(userId, searchTerm, searchTerm, limit)
      .all<ProjectListItem>();

    return result.results || [];
  }

  /**
   * Get total storage used by user's projects
   */
  async getUserProjectStorageBytes(userId: string): Promise<number> {
    const result = await this.db
      .prepare(`SELECT COALESCE(SUM(total_size_bytes), 0) as total FROM projects WHERE user_id = ? AND status != 'deleted'`)
      .bind(userId)
      .first<{ total: number }>();

    return result?.total || 0;
  }
}

