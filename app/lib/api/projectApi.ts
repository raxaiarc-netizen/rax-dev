/**
 * Client-side API for project operations
 */

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
  path: string;
  content: string;
  mimeType: string | null;
  isBinary: boolean;
  size: number;
  hash: string | null;
  updatedAt: number;
}

export class ProjectAPI {
  private static getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Token expired, clear it
      localStorage.removeItem('accessToken');
      throw new Error('Authentication expired. Please sign in again.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  /**
   * Create a new project
   */
  static async createProject(data: {
    name: string;
    description?: string;
    framework?: string;
    template?: string;
    chatId?: string;
  }): Promise<Project> {
    const result = await this.fetchWithAuth('/api/projects/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return result.project;
  }

  /**
   * Get project by ID
   */
  static async getProject(projectId: string): Promise<Project> {
    const result = await this.fetchWithAuth(`/api/projects/${projectId}`);
    return result.project;
  }

  /**
   * List all projects for the current user
   */
  static async listProjects(
    status: 'active' | 'archived' | 'all' = 'active',
    limit: number = 100,
    offset: number = 0,
  ): Promise<{
    projects: ProjectListItem[];
    total: number;
    totalStorage: number;
  }> {
    return this.fetchWithAuth(`/api/projects/list?status=${status}&limit=${limit}&offset=${offset}`);
  }

  /**
   * Get projects for a specific chat
   */
  static async getProjectsByChatId(chatId: string): Promise<ProjectListItem[]> {
    const result = await this.fetchWithAuth(`/api/projects/list?chatId=${chatId}`);
    return result.projects;
  }

  /**
   * Update project metadata
   */
  static async updateProject(
    projectId: string,
    data: {
      name?: string;
      description?: string;
      framework?: string;
      status?: 'active' | 'archived' | 'deleted';
    },
  ): Promise<void> {
    await this.fetchWithAuth(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete project
   */
  static async deleteProject(projectId: string, hard: boolean = false): Promise<void> {
    await this.fetchWithAuth(`/api/projects/${projectId}?hard=${hard}`, {
      method: 'DELETE',
    });
  }

  /**
   * Save a file to the project
   */
  static async saveFile(
    projectId: string,
    filePath: string,
    content: string,
    mimeType?: string,
    isBinary?: boolean,
  ): Promise<void> {
    await this.fetchWithAuth(`/api/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify({ filePath, content, mimeType, isBinary }),
    });
  }

  /**
   * Delete a file from the project
   */
  static async deleteFile(projectId: string, filePath: string): Promise<void> {
    await this.fetchWithAuth(`/api/projects/${projectId}/files`, {
      method: 'DELETE',
      body: JSON.stringify({ filePath }),
    });
  }

  /**
   * Load all files for a project
   */
  static async loadProjectFiles(projectId: string): Promise<{
    projectId: string;
    files: ProjectFile[];
    totalSize: number;
    fileCount: number;
  }> {
    return this.fetchWithAuth(`/api/projects/${projectId}/files/load`);
  }

  /**
   * Save multiple files at once (batch operation)
   */
  static async saveFiles(
    projectId: string,
    files: Array<{
      filePath: string;
      content: string;
      mimeType?: string;
      isBinary?: boolean;
    }>,
  ): Promise<void> {
    // Save files in parallel with concurrency limit
    const concurrency = 5;
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      await Promise.all(
        batch.map((file) => this.saveFile(projectId, file.filePath, file.content, file.mimeType, file.isBinary)),
      );
    }
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

