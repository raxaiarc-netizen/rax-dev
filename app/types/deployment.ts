export interface DeploymentVersion {
  id: string;
  projectId: string;
  url: string;
  status: 'building' | 'deploying' | 'ready' | 'failed';
  createdAt: number;
  updatedAt: number;
  buildTime?: number;
  error?: string;
}

export interface DeploymentFile {
  path: string;
  content: string;
  hash: string;
}

export interface DeploymentRequest {
  versionId: string;
  projectId: string;
  files: DeploymentFile[];
  dependencies?: Record<string, string>;
  buildCommand?: string;
  outputDir?: string;
}

export interface DeploymentStatus {
  versionId: string;
  status: DeploymentVersion['status'];
  url?: string;
  progress?: number;
  message?: string;
  error?: string;
}

export interface PublishRequest {
  versionId: string;
  projectId: string;
  domain: string;
}

export interface DeploymentUpdate {
  type: 'status' | 'progress' | 'complete' | 'error';
  versionId: string;
  data: any;
}
