/**
 * Cloudflare Worker for handling build and deployment
 * This worker performs fast, incremental builds using esbuild
 */

interface BuildRequest {
  versionId: string;
  buildCommand?: string;
  outputDir?: string;
  incremental?: boolean;
}

interface Env {
  DEPLOYMENT_KV: KVNamespace;
  DEPLOYMENT_R2: R2Bucket;
  BUILD_CACHE: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle build requests
    if (url.pathname === '/api/deploy/build' && request.method === 'POST') {
      return handleBuild(request, env);
    }

    // Serve deployed files
    if (url.pathname.startsWith('/preview/')) {
      return serveDeployment(url, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleBuild(request: Request, env: Env): Promise<Response> {
  try {
    const buildRequest: BuildRequest = await request.json();
    const { versionId, incremental } = buildRequest;

    // Get version metadata
    const versionData = await env.DEPLOYMENT_KV.get(`version:${versionId}`);
    if (!versionData) {
      return new Response('Version not found', { status: 404 });
    }

    const version = JSON.parse(versionData);

    // Update status to building
    version.status = 'building';
    version.updatedAt = Date.now();
    await env.DEPLOYMENT_KV.put(`version:${versionId}`, JSON.stringify(version));

    // Get all source files from R2
    const files = await env.DEPLOYMENT_R2.list({ prefix: `${versionId}/` });
    const sourceFiles: Record<string, string> = {};

    for (const file of files.objects) {
      const obj = await env.DEPLOYMENT_R2.get(file.key);
      if (obj) {
        sourceFiles[file.key.replace(`${versionId}/`, '')] = await obj.text();
      }
    }

    // Perform build (simplified - in production use esbuild)
    const buildResult = await performBuild(sourceFiles, incremental, versionId, env);

    if (buildResult.success) {
      // Store built files back to R2
      for (const [path, content] of Object.entries(buildResult.files)) {
        await env.DEPLOYMENT_R2.put(`${versionId}/dist/${path}`, content);
      }

      // Update status to ready
      version.status = 'ready';
      version.buildTime = Date.now() - version.updatedAt;
      await env.DEPLOYMENT_KV.put(`version:${versionId}`, JSON.stringify(version));

      // Broadcast update via WebSocket (implementation depends on Durable Objects)
      await broadcastUpdate(env, versionId, {
        type: 'complete',
        data: { url: version.url },
      });

      return new Response(JSON.stringify({ success: true, version }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Build failed
      version.status = 'failed';
      version.error = buildResult.error;
      await env.DEPLOYMENT_KV.put(`version:${versionId}`, JSON.stringify(version));

      await broadcastUpdate(env, versionId, {
        type: 'error',
        data: { error: buildResult.error },
      });

      return new Response(JSON.stringify({ success: false, error: buildResult.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Build error:', error);
    return new Response('Build failed', { status: 500 });
  }
}

async function performBuild(
  files: Record<string, string>,
  incremental: boolean,
  versionId: string,
  env: Env
): Promise<{ success: boolean; files?: Record<string, string>; error?: string }> {
  try {
    // Check build cache for incremental builds
    if (incremental) {
      const cacheKey = `build-cache:${versionId}`;
      const cachedBuild = await env.BUILD_CACHE.get(cacheKey);
      
      if (cachedBuild) {
        const cache = JSON.parse(cachedBuild);
        // Check if any files changed
        const hasChanges = Object.keys(files).some(path => {
          return files[path] !== cache.files[path];
        });

        if (!hasChanges) {
          // Return cached build
          return { success: true, files: cache.output };
        }
      }
    }

    // Simple build process (in production, use esbuild or vite)
    const builtFiles: Record<string, string> = {};

    // Process HTML files
    for (const [path, content] of Object.entries(files)) {
      if (path.endsWith('.html')) {
        builtFiles[path] = content;
      } else if (path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.ts') || path.endsWith('.tsx')) {
        // In production, transpile with esbuild
        builtFiles[path.replace(/\.(jsx|tsx|ts)$/, '.js')] = content;
      } else if (path.endsWith('.css')) {
        builtFiles[path] = content;
      } else {
        // Copy other files as-is
        builtFiles[path] = content;
      }
    }

    // Add index.html if not present
    if (!builtFiles['index.html']) {
      builtFiles['index.html'] = generateDefaultIndex(builtFiles);
    }

    // Cache the build result
    await env.BUILD_CACHE.put(
      `build-cache:${versionId}`,
      JSON.stringify({ files, output: builtFiles }),
      { expirationTtl: 3600 } // Cache for 1 hour
    );

    return { success: true, files: builtFiles };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Build failed',
    };
  }
}

function generateDefaultIndex(files: Record<string, string>): string {
  const jsFiles = Object.keys(files).filter(f => f.endsWith('.js'));
  const cssFiles = Object.keys(files).filter(f => f.endsWith('.css'));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  ${cssFiles.map(css => `<link rel="stylesheet" href="/${css}">`).join('\n  ')}
</head>
<body>
  <div id="root"></div>
  ${jsFiles.map(js => `<script type="module" src="/${js}"></script>`).join('\n  ')}
</body>
</html>`;
}

async function serveDeployment(url: URL, env: Env): Promise<Response> {
  // Extract version ID from URL (e.g., /preview/v123456/index.html)
  const pathParts = url.pathname.split('/');
  const versionId = pathParts[2];
  let filePath = pathParts.slice(3).join('/') || 'index.html';

  if (!versionId) {
    return new Response('Invalid preview URL', { status: 400 });
  }

  // Get file from R2
  const key = `${versionId}/dist/${filePath}`;
  const file = await env.DEPLOYMENT_R2.get(key);

  if (!file) {
    // Try index.html for SPA routing
    if (!filePath.includes('.')) {
      const indexKey = `${versionId}/dist/index.html`;
      const indexFile = await env.DEPLOYMENT_R2.get(indexKey);
      
      if (indexFile) {
        return new Response(indexFile.body, {
          headers: {
            'Content-Type': 'text/html',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    }

    return new Response('File not found', { status: 404 });
  }

  // Determine content type
  const contentType = getContentType(filePath);

  return new Response(file.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function getContentType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
  };
  return types[ext || ''] || 'application/octet-stream';
}

async function broadcastUpdate(env: Env, versionId: string, update: any): Promise<void> {
  // Store update in KV for WebSocket clients to poll
  await env.DEPLOYMENT_KV.put(
    `update:${versionId}:${Date.now()}`,
    JSON.stringify(update),
    { expirationTtl: 60 }
  );
}
