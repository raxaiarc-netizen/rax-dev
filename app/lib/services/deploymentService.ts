import type { 
  DeploymentRequest, 
  DeploymentStatus, 
  DeploymentVersion,
  PublishRequest 
} from '~/types/deployment';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DeploymentService');

export class DeploymentService {
  private apiEndpoint: string;
  private apiKey?: string;
  private enabled: boolean;

  constructor(apiEndpoint?: string, apiKey?: string) {
    this.apiEndpoint = apiEndpoint || '/api/deploy';
    this.apiKey = apiKey;
    
    // Check if deployment system is enabled via environment variable
    const isEnabled = typeof import.meta !== 'undefined' && 
      import.meta.env?.VITE_USE_DEPLOYMENT_SYSTEM === 'true';
    
    this.enabled = isEnabled && (!!this.apiKey || this.apiEndpoint !== '/api/deploy');
    
    if (!this.enabled) {
      logger.debug('Deployment service is disabled or not configured');
    }
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create a new deployment version
   */
  async createDeployment(request: DeploymentRequest): Promise<DeploymentVersion> {
    logger.info('Creating deployment', { versionId: request.versionId });

    const response = await fetch(`${this.apiEndpoint}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Deployment failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Update an existing deployment with new files
   */
  async updateDeployment(request: Partial<DeploymentRequest> & { versionId: string }): Promise<DeploymentStatus> {
    logger.info('Updating deployment', { versionId: request.versionId });

    const response = await fetch(`${this.apiEndpoint}/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Update failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Get deployment status
   */
  async getStatus(versionId: string): Promise<DeploymentStatus> {
    const response = await fetch(`${this.apiEndpoint}/status/${versionId}`, {
      headers: {
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get deployment status');
    }

    return response.json();
  }

  /**
   * Publish a version to a custom domain
   */
  async publish(request: PublishRequest): Promise<{ success: boolean; url: string }> {
    logger.info('Publishing version', { versionId: request.versionId, domain: request.domain });

    const response = await fetch(`${this.apiEndpoint}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Publish failed: ${error}`);
    }

    return response.json();
  }

  /**
   * Delete a deployment version
   */
  async deleteVersion(versionId: string): Promise<void> {
    await fetch(`${this.apiEndpoint}/delete/${versionId}`, {
      method: 'DELETE',
      headers: {
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
      },
    });
  }

  /**
   * Connect to deployment updates via WebSocket
   */
  connectToUpdates(versionId: string, onUpdate: (update: any) => void): WebSocket {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/deploy/ws/${versionId}`;
    
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data);
        onUpdate(update);
      } catch (error) {
        logger.error('Failed to parse WebSocket message', error);
      }
    };

    ws.onerror = (error) => {
      logger.error('WebSocket error', error);
    };

    return ws;
  }
}

// Singleton instance
export const deploymentService = new DeploymentService();
