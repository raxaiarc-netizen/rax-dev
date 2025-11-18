#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const WORKER_URL = 'https://bolt-deployment-worker.arcrxx.workers.dev';
const DIST_DIR = '/Users/chiragpanchal/Downloads/floppy-single-wing-main/dist';
const API_KEY = 'r5Ldg2e2Snm0hiK/BErsbOw4medaeeLWVMqdH7jKq+s=';

// Read all files from dist directory recursively
function readFilesRecursive(dir, baseDir = dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...readFilesRecursive(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relativePath = path.relative(baseDir, fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      files.push({
        path: relativePath,
        content: content,
        hash: '' // Optional
      });
    }
  }

  return files;
}

async function deployToWorker() {
  console.log('🔨 Reading built files from:', DIST_DIR);
  
  const files = readFilesRecursive(DIST_DIR);
  console.log(`📦 Found ${files.length} files to deploy`);
  
  files.forEach(f => {
    console.log(`  - ${f.path} (${f.content.length} bytes)`);
  });

  const versionId = `v${Date.now()}-test`;
  const projectId = 'test-deployment';

  const payload = {
    versionId,
    projectId,
    files
  };

  console.log('\n📤 Uploading to:', `${WORKER_URL}/create`);
  console.log('📝 Version ID:', versionId);

  try {
    const response = await fetch(`${WORKER_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Deployment failed:', result);
      process.exit(1);
    }

    console.log('\n✅ Deployment successful!');
    console.log('🌐 URL:', result.url);
    console.log('\n📋 Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error deploying:', error);
    process.exit(1);
  }
}

deployToWorker();
