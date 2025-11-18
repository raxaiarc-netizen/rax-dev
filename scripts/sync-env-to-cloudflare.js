#!/usr/bin/env node

/**
 * Environment Variable Sync Helper for Cloudflare Pages
 * 
 * This script reads your .env.local file and generates instructions
 * for setting up the same environment variables in Cloudflare Pages.
 * 
 * Usage:
 *   node scripts/sync-env-to-cloudflare.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ENV_FILE = path.join(__dirname, '..', '.env.local');
const SENSITIVE_KEYS = ['API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PRIVATE'];

function parseEnvFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const vars = {};
    
    content.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) {
        return;
      }
      
      // Parse KEY=VALUE
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        vars[key] = value;
      }
    });
    
    return vars;
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function isSensitive(key) {
  return SENSITIVE_KEYS.some(sensitive => key.toUpperCase().includes(sensitive));
}

function maskValue(key, value) {
  if (isSensitive(key) && value && value.length > 8) {
    return value.substring(0, 4) + '...' + value.substring(value.length - 4);
  }
  return value;
}

function generateCloudflareConfig(vars) {
  console.log('\n' + '='.repeat(70));
  console.log('  CLOUDFLARE PAGES ENVIRONMENT VARIABLES SETUP');
  console.log('='.repeat(70) + '\n');
  
  console.log('📋 Instructions:\n');
  console.log('1. Go to: https://dash.cloudflare.com/');
  console.log('2. Navigate to: Workers & Pages > [Your Project]');
  console.log('3. Click: Settings > Environment Variables');
  console.log('4. Add each variable below for BOTH Production and Preview\n');
  
  console.log('='.repeat(70));
  console.log('  ENVIRONMENT VARIABLES TO ADD');
  console.log('='.repeat(70) + '\n');
  
  const categories = {
    deployment: [],
    ai: [],
    services: [],
    other: []
  };
  
  // Categorize variables
  Object.entries(vars).forEach(([key, value]) => {
    if (key.includes('DEPLOYMENT')) {
      categories.deployment.push([key, value]);
    } else if (key.includes('API_KEY') || key.includes('ANTHROPIC') || 
               key.includes('OPENAI') || key.includes('GROQ') || 
               key.includes('MISTRAL') || key.includes('COHERE') ||
               key.includes('GOOGLE') || key.includes('XAI')) {
      categories.ai.push([key, value]);
    } else if (key.startsWith('VITE_')) {
      categories.services.push([key, value]);
    } else {
      categories.other.push([key, value]);
    }
  });
  
  // Print categorized variables
  if (categories.deployment.length > 0) {
    console.log('🚀 DEPLOYMENT SYSTEM (REQUIRED for deployment features):\n');
    categories.deployment.forEach(([key, value]) => {
      console.log(`   Variable Name: ${key}`);
      console.log(`   Value:         ${value || '(empty)'}`);
      console.log('');
    });
  }
  
  if (categories.ai.length > 0) {
    console.log('🤖 AI PROVIDER API KEYS (server-side, NO VITE_ prefix):\n');
    categories.ai.forEach(([key, value]) => {
      console.log(`   Variable Name: ${key}`);
      console.log(`   Value:         ${maskValue(key, value) || '(empty)'}`);
      console.log('');
    });
  }
  
  if (categories.services.length > 0) {
    console.log('🔗 SERVICE INTEGRATIONS (client-side, with VITE_ prefix):\n');
    categories.services.forEach(([key, value]) => {
      console.log(`   Variable Name: ${key}`);
      console.log(`   Value:         ${maskValue(key, value) || '(empty)'}`);
      console.log('');
    });
  }
  
  if (categories.other.length > 0) {
    console.log('⚙️  OTHER SETTINGS:\n');
    categories.other.forEach(([key, value]) => {
      console.log(`   Variable Name: ${key}`);
      console.log(`   Value:         ${value || '(empty)'}`);
      console.log('');
    });
  }
  
  console.log('='.repeat(70));
  console.log('  IMPORTANT NOTES');
  console.log('='.repeat(70) + '\n');
  
  console.log('📌 Key Points:\n');
  console.log('   • Variables with VITE_ prefix are exposed to client-side code');
  console.log('   • Other variables are server-side only (API routes)');
  console.log('   • After adding variables, you MUST redeploy your project');
  console.log('   • Go to Deployments tab > ··· > Retry deployment\n');
  
  console.log('🔒 Security:\n');
  console.log('   • Never commit .env.local to version control');
  console.log('   • Rotate API keys if accidentally exposed');
  console.log('   • Use different keys for development vs production\n');
  
  console.log('='.repeat(70));
  console.log('  VERIFICATION');
  console.log('='.repeat(70) + '\n');
  
  console.log('After deployment, verify:\n');
  console.log('   ✓ Settings > Providers shows all AI providers connected');
  console.log('   ✓ Deployment features work (if enabled)');
  console.log('   ✓ Service integrations auto-connect (GitHub, GitLab, etc.)');
  console.log('   ✓ No console errors about missing environment variables\n');
  
  // Generate wrangler command for reference
  console.log('='.repeat(70));
  console.log('  ALTERNATIVE: WRANGLER CLI');
  console.log('='.repeat(70) + '\n');
  
  console.log('You can also use Wrangler CLI to set variables:\n');
  console.log('```bash');
  Object.entries(vars).forEach(([key, value]) => {
    if (value && !isSensitive(key)) {
      console.log(`wrangler pages secret put ${key} --project=your-project-name`);
    }
  });
  console.log('```\n');
  console.log('(Then enter the value when prompted)\n');
}

function main() {
  console.log('\n🔍 Reading .env.local file...\n');
  
  if (!fs.existsSync(ENV_FILE)) {
    console.error('❌ Error: .env.local file not found!');
    console.error('   Please create .env.local in the project root first.\n');
    process.exit(1);
  }
  
  const vars = parseEnvFile(ENV_FILE);
  
  if (!vars || Object.keys(vars).length === 0) {
    console.error('❌ Error: No environment variables found in .env.local');
    console.error('   Please add your environment variables first.\n');
    process.exit(1);
  }
  
  console.log(`✅ Found ${Object.keys(vars).length} environment variables\n`);
  
  generateCloudflareConfig(vars);
  
  console.log('\n✨ Done! Follow the instructions above to sync to Cloudflare Pages.\n');
}

main();
