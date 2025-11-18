/**
 * Integration layer between workbench and deployment system
 * This module handles triggering deployments when files change
 */

import { deploymentStore } from '~/lib/stores/deployment';
import type { FileMap } from '~/lib/stores/files';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('DeploymentIntegration');

// Track if deployment is initialized
let deploymentInitialized = false;
let pendingFileUpdates: Array<{ path: string; content: string }> = [];
let updateTimeout: NodeJS.Timeout | null = null;

const DEBOUNCE_MS = 1000; // Wait 1 second after last change before deploying

/**
 * Initialize deployment for a new project/session
 */
export function initializeDeployment(projectId: string) {
  try {
    const versionId = deploymentStore.initializeDeployment(projectId);
    deploymentInitialized = true;
    logger.info('Deployment initialized', { projectId, versionId });
    return versionId;
  } catch (error) {
    logger.error('Failed to initialize deployment', error);
    throw error;
  }
}

/**
 * Create initial deployment with all project files
 */
export async function createInitialDeployment(
  files: FileMap,
  dependencies?: Record<string, string>
) {
  if (!deploymentInitialized) {
    logger.debug('Deployment not initialized, skipping initial deployment');
    return;
  }

  try {
    // Convert FileMap to deployment file format
    const deploymentFiles = Object.entries(files)
      .filter(([_, dirent]) => dirent?.type === 'file' && !dirent.isBinary)
      .map(([path, dirent]) => {
        // TypeScript doesn't narrow the type after filter, so we assert it
        const file = dirent as Extract<typeof dirent, { type: 'file' }>;
        return {
          path: path.replace(/^\//, ''), // Remove leading slash
          content: file.content,
        };
      });

    logger.info('Creating initial deployment', { fileCount: deploymentFiles.length });
    
    const version = await deploymentStore.createVersion(deploymentFiles, dependencies);
    logger.info('Initial deployment created', { versionId: version.id, url: version.url });
    
    return version;
  } catch (error: any) {
    // Silently skip if deployment service is not configured
    if (error.message?.includes('not configured') || error.message?.includes('Unauthorized')) {
      logger.debug('Deployment service not available, skipping deployment');
      deploymentInitialized = false; // Disable future attempts
      return;
    }
    logger.error('Failed to create initial deployment', error);
    throw error;
  }
}

/**
 * Queue a file update for deployment (debounced)
 * This batches multiple file changes together
 */
export function queueFileUpdate(filePath: string, content: string) {
  if (!deploymentInitialized) {
    logger.warn('Deployment not initialized, skipping file update');
    return;
  }

  // Remove leading slash for consistency
  const normalizedPath = filePath.replace(/^\//, '');

  // Add or update file in pending queue
  const existingIndex = pendingFileUpdates.findIndex(f => f.path === normalizedPath);
  if (existingIndex >= 0) {
    pendingFileUpdates[existingIndex].content = content;
  } else {
    pendingFileUpdates.push({ path: normalizedPath, content });
  }

  // Clear existing timeout
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }

  // Set new timeout to deploy after debounce period
  updateTimeout = setTimeout(() => {
    flushFileUpdates();
  }, DEBOUNCE_MS);

  logger.debug('File update queued', { path: normalizedPath, queueSize: pendingFileUpdates.length });
}

/**
 * Immediately flush all pending file updates to deployment
 */
export async function flushFileUpdates() {
  if (pendingFileUpdates.length === 0) {
    return;
  }

  const filesToUpdate = [...pendingFileUpdates];
  pendingFileUpdates = [];

  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }

  try {
    logger.info('Flushing file updates to deployment', { fileCount: filesToUpdate.length });
    await deploymentStore.updateVersion(filesToUpdate);
    logger.info('File updates deployed successfully');
  } catch (error: any) {
    // Silently skip if deployment service is not configured
    if (error?.message?.includes('not configured') || error?.message?.includes('Unauthorized')) {
      logger.debug('Deployment service not available, skipping file updates');
      deploymentInitialized = false; // Disable future attempts
      return;
    }
    logger.error('Failed to deploy file updates', error);
    // Re-queue files on error
    pendingFileUpdates.push(...filesToUpdate);
    throw error;
  }
}

/**
 * Check if deployment system is enabled and initialized
 */
export function isDeploymentEnabled(): boolean {
  return deploymentInitialized;
}

/**
 * Get current deployment URL
 */
export function getCurrentDeploymentUrl(): string | undefined {
  return deploymentStore.getCurrentDeploymentUrl();
}

/**
 * Reset deployment state (useful for new projects)
 */
export function resetDeployment() {
  deploymentInitialized = false;
  pendingFileUpdates = [];
  if (updateTimeout) {
    clearTimeout(updateTimeout);
    updateTimeout = null;
  }
  deploymentStore.disconnect();
  logger.info('Deployment state reset');
}

/**
 * Extract dependencies from package.json content
 */
export function extractDependencies(packageJsonContent: string): Record<string, string> | undefined {
  try {
    const pkg = JSON.parse(packageJsonContent);
    return pkg.dependencies;
  } catch (error) {
    logger.warn('Failed to parse package.json', error);
    return undefined;
  }
}

/**
 * Helper to determine if a file path should trigger deployment
 */
export function shouldDeployFile(filePath: string): boolean {
  // Skip certain files
  const skipPatterns = [
    /node_modules/,
    /\.git/,
    /\.DS_Store/,
    /package-lock\.json/,
    /yarn\.lock/,
    /pnpm-lock\.yaml/,
  ];

  return !skipPatterns.some(pattern => pattern.test(filePath));
}
