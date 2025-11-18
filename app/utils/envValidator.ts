/**
 * Environment Variable Validation Utility
 * 
 * Validates that required environment variables are set and logs warnings
 * for missing variables in both development and production environments.
 */

import { createScopedLogger } from './logger';

const logger = createScopedLogger('EnvValidator');

interface EnvVarConfig {
  key: string;
  required: boolean;
  description: string;
  category: 'deployment' | 'ai' | 'service' | 'system';
}

const ENV_VARS: EnvVarConfig[] = [
  // Deployment System
  {
    key: 'DEPLOYMENT_DOMAIN',
    required: false,
    description: 'Custom domain for deployment previews',
    category: 'deployment',
  },
  {
    key: 'DEPLOYMENT_WORKER_URL',
    required: false,
    description: 'Cloudflare Worker URL for deployment processing',
    category: 'deployment',
  },
  {
    key: 'DEPLOYMENT_API_KEY',
    required: false,
    description: 'API key for deployment worker authentication',
    category: 'deployment',
  },
  
  // AI Providers (at least one should be set)
  {
    key: 'ANTHROPIC_API_KEY',
    required: false,
    description: 'Anthropic Claude API key',
    category: 'ai',
  },
  {
    key: 'OPENAI_API_KEY',
    required: false,
    description: 'OpenAI API key',
    category: 'ai',
  },
  {
    key: 'GROQ_API_KEY',
    required: false,
    description: 'Groq API key',
    category: 'ai',
  },
  
  // Service Integrations (client-side, optional)
  {
    key: 'VITE_GITHUB_ACCESS_TOKEN',
    required: false,
    description: 'GitHub Personal Access Token for repository access',
    category: 'service',
  },
  {
    key: 'VITE_GITLAB_ACCESS_TOKEN',
    required: false,
    description: 'GitLab Personal Access Token',
    category: 'service',
  },
  {
    key: 'VITE_VERCEL_ACCESS_TOKEN',
    required: false,
    description: 'Vercel Access Token for deployments',
    category: 'service',
  },
  {
    key: 'VITE_NETLIFY_ACCESS_TOKEN',
    required: false,
    description: 'Netlify Access Token for deployments',
    category: 'service',
  },
  
  // System
  {
    key: 'NODE_ENV',
    required: false,
    description: 'Node environment (development/production)',
    category: 'system',
  },
];

interface ValidationResult {
  isValid: boolean;
  missing: EnvVarConfig[];
  present: EnvVarConfig[];
  aiProvidersCount: number;
  deploymentEnabled: boolean;
  warnings: string[];
}

/**
 * Check if an environment variable is set
 */
function isEnvVarSet(key: string): boolean {
  // Check both process.env and import.meta.env
  const processEnv = typeof process !== 'undefined' && process.env ? process.env[key] : undefined;
  const importMetaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env[key] : undefined;
  
  const value = processEnv || importMetaEnv;
  return !!value && value !== '' && value !== 'undefined';
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missing: [],
    present: [],
    aiProvidersCount: 0,
    deploymentEnabled: false,
    warnings: [],
  };

  // Check each environment variable
  ENV_VARS.forEach((config) => {
    if (isEnvVarSet(config.key)) {
      result.present.push(config);
      
      // Count AI providers
      if (config.category === 'ai') {
        result.aiProvidersCount++;
      }
      
      // Check deployment system
      if (config.key === 'DEPLOYMENT_WORKER_URL') {
        result.deploymentEnabled = true;
      }
    } else {
      if (config.required) {
        result.missing.push(config);
        result.isValid = false;
      }
    }
  });

  // Generate warnings
  if (result.aiProvidersCount === 0) {
    result.warnings.push(
      'No AI provider API keys detected. Please set at least one provider key (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)'
    );
  }

  // Check for deployment system partial configuration
  const hasDeploymentDomain = isEnvVarSet('DEPLOYMENT_DOMAIN');
  const hasDeploymentWorker = isEnvVarSet('DEPLOYMENT_WORKER_URL');
  const hasDeploymentKey = isEnvVarSet('DEPLOYMENT_API_KEY');

  if ((hasDeploymentDomain || hasDeploymentWorker || hasDeploymentKey) && 
      !(hasDeploymentDomain && hasDeploymentWorker && hasDeploymentKey)) {
    result.warnings.push(
      'Deployment system partially configured. For full functionality, set all three: DEPLOYMENT_DOMAIN, DEPLOYMENT_WORKER_URL, DEPLOYMENT_API_KEY'
    );
  }

  return result;
}

/**
 * Log environment validation results
 */
export function logEnvironmentStatus(): void {
  const result = validateEnvironment();
  
  const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  const environment = isProduction ? 'production' : 'development';
  
  logger.info(`Environment validation (${environment})`);
  
  // Log AI providers
  if (result.aiProvidersCount > 0) {
    logger.info(`✓ ${result.aiProvidersCount} AI provider(s) configured`);
  } else {
    logger.warn('⚠ No AI providers configured');
  }
  
  // Log deployment system
  if (result.deploymentEnabled) {
    logger.info('✓ Deployment system enabled');
  } else {
    logger.debug('Deployment system not configured (optional)');
  }
  
  // Log service integrations
  const serviceIntegrations = result.present.filter(v => v.category === 'service');
  if (serviceIntegrations.length > 0) {
    logger.info(`✓ ${serviceIntegrations.length} service integration(s) configured`);
  }
  
  // Log warnings
  result.warnings.forEach((warning) => {
    logger.warn(warning);
  });
  
  // Log missing required variables (if any)
  if (result.missing.length > 0) {
    logger.error('Missing required environment variables:');
    result.missing.forEach((config) => {
      logger.error(`  - ${config.key}: ${config.description}`);
    });
  }
  
  // Environment-specific guidance
  if (!isProduction) {
    logger.debug('Running in development mode. Set variables in .env.local');
  } else {
    if (result.warnings.length > 0 || result.missing.length > 0) {
      logger.warn('Running in production. Verify environment variables in Cloudflare Pages dashboard');
      logger.warn('See DEPLOYMENT_SETUP.md for configuration instructions');
    }
  }
}

/**
 * Check if deployment system is properly configured
 */
export function isDeploymentSystemConfigured(): boolean {
  return (
    isEnvVarSet('DEPLOYMENT_DOMAIN') &&
    isEnvVarSet('DEPLOYMENT_WORKER_URL') &&
    isEnvVarSet('DEPLOYMENT_API_KEY')
  );
}

/**
 * Get missing environment variables by category
 */
export function getMissingEnvVars(category?: string): EnvVarConfig[] {
  const result = validateEnvironment();
  
  if (category) {
    return ENV_VARS.filter(
      (config) => config.category === category && !isEnvVarSet(config.key)
    );
  }
  
  return ENV_VARS.filter((config) => !isEnvVarSet(config.key));
}

/**
 * Generate user-friendly environment setup instructions
 */
export function getSetupInstructions(): string {
  const missing = getMissingEnvVars();
  
  if (missing.length === 0) {
    return 'All environment variables are configured!';
  }
  
  const isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';
  
  let instructions = isProduction
    ? 'To complete setup, add these variables in Cloudflare Pages:\n\n'
    : 'To complete setup, add these variables to your .env.local file:\n\n';
  
  missing.forEach((config) => {
    instructions += `${config.key}=your_value_here  # ${config.description}\n`;
  });
  
  if (isProduction) {
    instructions += '\nSteps:\n';
    instructions += '1. Go to Cloudflare Dashboard > Workers & Pages > Your Project\n';
    instructions += '2. Navigate to Settings > Environment Variables\n';
    instructions += '3. Add each variable above for Production and Preview\n';
    instructions += '4. Redeploy your project\n';
  } else {
    instructions += '\nThen restart your development server: npm run dev\n';
  }
  
  return instructions;
}
