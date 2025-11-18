/**
 * Manual Deployment Initialization Script
 * Run this in the browser console to test deployment system
 */

// Import the workbench store
import { workbenchStore } from '~/lib/stores/workbench';

// Initialize deployment for current project
const projectId = `project-${Date.now()}`;
console.log('Initializing deployment for:', projectId);

workbenchStore.initializeProjectDeployment(projectId);

console.log('Deployment initialized!');
console.log('Check the deployment status bar at the bottom of the workbench');
