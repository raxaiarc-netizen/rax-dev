import { atom, map, type MapStore, type WritableAtom } from 'nanostores';
import type { DeploymentVersion, DeploymentStatus } from '~/types/deployment';
import { deploymentService } from '~/lib/services/deploymentService';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DeploymentStore');

export class DeploymentStore {
  versions: MapStore<Record<string, DeploymentVersion>> = map({});
  currentVersionId: WritableAtom<string | undefined> = atom(undefined);
  currentProjectId: WritableAtom<string> = atom('');
  deploymentStatus: WritableAtom<DeploymentStatus | undefined> = atom(undefined);
  isDeploying: WritableAtom<boolean> = atom(false);
  serviceAvailable: WritableAtom<boolean> = atom(true); // Track if deployment service is available

  private wsConnection?: WebSocket;

  /**
   * Initialize a new deployment session
   */
  initializeDeployment(projectId: string) {
    const versionId = this.generateVersionId();
    this.currentProjectId.set(projectId);
    this.currentVersionId.set(versionId);
    
    logger.info('Initialized deployment', { projectId, versionId });
    
    return versionId;
  }

  /**
   * Create a new deployment version
   */
  async createVersion(files: Array<{ path: string; content: string }>, dependencies?: Record<string, string>) {
    const versionId = this.currentVersionId.get();
    const projectId = this.currentProjectId.get();

    if (!versionId || !projectId) {
      throw new Error('Deployment not initialized');
    }

    this.isDeploying.set(true);

    try {
      // Check if service is enabled and available before attempting deployment
      if (!deploymentService.isEnabled()) {
        logger.debug('Deployment service not enabled, skipping deployment');
        this.serviceAvailable.set(false);
        throw new Error('Deployment service not configured');
      }
      
      if (!this.serviceAvailable.get()) {
        logger.debug('Deployment service not available, skipping deployment');
        throw new Error('Deployment service not configured');
      }

      // Hash files for change detection
      const deploymentFiles = await Promise.all(
        files.map(async (file) => ({
          path: file.path,
          content: file.content,
          hash: await this.hashContent(file.content),
        }))
      );

      const version = await deploymentService.createDeployment({
        versionId,
        projectId,
        files: deploymentFiles,
        dependencies,
        buildCommand: 'npm run build',
        outputDir: 'dist',
      });

      this.versions.setKey(versionId, version);
      
      // Set deployment status so UI shows the URL
      this.deploymentStatus.set({
        versionId: version.id,
        status: version.status,
        url: version.url,
      });
      
      this.connectToUpdates(versionId);

      return version;
    } catch (error: any) {
      // Mark service as unavailable on 401 errors
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        logger.debug('Deployment service returned 401, marking as unavailable');
        this.serviceAvailable.set(false);
      } else {
        logger.error('Failed to create deployment', error);
      }
      throw error;
    } finally {
      this.isDeploying.set(false);
    }
  }

  /**
   * Update deployment with new files (incremental update)
   */
  async updateVersion(files: Array<{ path: string; content: string }>) {
    const versionId = this.currentVersionId.get();

    if (!versionId) {
      throw new Error('No active deployment');
    }

    try {
      // Skip if service is not enabled or unavailable
      if (!deploymentService.isEnabled()) {
        logger.debug('Deployment service not enabled, skipping update');
        return;
      }
      
      if (!this.serviceAvailable.get()) {
        logger.debug('Deployment service not available, skipping update');
        return;
      }

      const deploymentFiles = await Promise.all(
        files.map(async (file) => ({
          path: file.path,
          content: file.content,
          hash: await this.hashContent(file.content),
        }))
      );

      const status = await deploymentService.updateDeployment({
        versionId,
        files: deploymentFiles,
      });

      this.deploymentStatus.set(status);

      return status;
    } catch (error: any) {
      // Mark service as unavailable on 401 errors
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        logger.debug('Deployment service returned 401, marking as unavailable');
        this.serviceAvailable.set(false);
      } else {
        logger.error('Failed to update deployment', error);
      }
      throw error;
    }
  }

  /**
   * Publish version to main domain
   */
  async publishVersion(domain: string) {
    const versionId = this.currentVersionId.get();
    const projectId = this.currentProjectId.get();

    if (!versionId || !projectId) {
      throw new Error('No version to publish');
    }

    try {
      const result = await deploymentService.publish({
        versionId,
        projectId,
        domain,
      });

      logger.info('Version published', { versionId, domain, url: result.url });

      return result;
    } catch (error) {
      logger.error('Failed to publish version', error);
      throw error;
    }
  }

  /**
   * Get the URL for the current deployment
   */
  getCurrentDeploymentUrl(): string | undefined {
    const versionId = this.currentVersionId.get();
    if (!versionId) {
      return undefined;
    }

    const version = this.versions.get()[versionId];
    return version?.url;
  }

  /**
   * Connect to deployment updates via WebSocket
   */
  private connectToUpdates(versionId: string) {
    if (this.wsConnection) {
      this.wsConnection.close();
    }

    this.wsConnection = deploymentService.connectToUpdates(versionId, (update) => {
      logger.info('Deployment update', update);

      switch (update.type) {
        case 'status':
          this.deploymentStatus.set(update.data);
          break;
        case 'complete':
          const version = this.versions.get()[versionId];
          if (version) {
            this.versions.setKey(versionId, {
              ...version,
              status: 'ready',
              url: update.data.url,
            });
          }
          break;
        case 'error':
          const errorVersion = this.versions.get()[versionId];
          if (errorVersion) {
            this.versions.setKey(versionId, {
              ...errorVersion,
              status: 'failed',
              error: update.data.error,
            });
          }
          break;
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = undefined;
    }
  }

  /**
   * Generate a unique version ID
   */
  private generateVersionId(): string {
    return `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash content for change detection
   */
  private async hashContent(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

export const deploymentStore = new DeploymentStore();
