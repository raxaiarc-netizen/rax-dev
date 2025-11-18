export interface Env {
  API_KEY: string;
  DEPLOYMENTS: R2Bucket;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders,
      });
    }

    const url = new URL(request.url);
    
    // Check API key only for write operations (not for viewing deployments)
    const requiresAuth = request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE';
    
    if (requiresAuth) {
      const apiKey = request.headers.get('X-API-Key');
      if (!apiKey || apiKey !== env.API_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        });
      }
    }
    
    // Handle /create endpoint (initial deployment)
    if (url.pathname === '/create') {
      try {
        const body = await request.json();
        const { versionId, projectId, files } = body;

        if (!versionId || !projectId || !files) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields: versionId, projectId, or files' }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Store all files in R2
        for (const file of files) {
          const key = `${versionId}/${file.path}`;
          await env.DEPLOYMENTS.put(key, file.content, {
            customMetadata: {
              projectId,
              hash: file.hash || '',
            },
          });
        }

        // Create an index.html if it doesn't exist
        const hasIndex = files.some((f: any) => f.path === 'index.html');
        if (!hasIndex) {
          // Create a simple index that loads the React app
          const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bolt App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
          await env.DEPLOYMENTS.put(`${versionId}/index.html`, indexHtml);
        }

        // Store deployment metadata
        const metadata = {
          versionId,
          projectId,
          createdAt: new Date().toISOString(),
          fileCount: files.length,
        };
        await env.DEPLOYMENTS.put(`${versionId}/.metadata.json`, JSON.stringify(metadata));

        const deploymentUrl = `https://bolt-deployment-worker.arcrxx.workers.dev/${versionId}`;

        return new Response(
          JSON.stringify({
            id: versionId,
            projectId,
            status: 'ready',
            url: deploymentUrl,
            createdAt: new Date().toISOString(),
            message: 'Deployment created successfully',
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request body',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Handle /update endpoint
    if (url.pathname === '/update') {
      try {
        const body = await request.json();
        const { versionId, files } = body;

        if (!versionId || !files) {
          return new Response(
            JSON.stringify({ error: 'Missing versionId or files' }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Update files in R2
        for (const file of files) {
          const key = `${versionId}/${file.path}`;
          await env.DEPLOYMENTS.put(key, file.content, {
            customMetadata: {
              hash: file.hash || '',
              updatedAt: new Date().toISOString(),
            },
          });
        }

        return new Response(
          JSON.stringify({
            status: 'ready',
            versionId,
            message: 'Deployment updated successfully',
            updatedAt: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request body',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Handle /build endpoint
    if (url.pathname === '/build') {
      try {
        const body = await request.json();
        const { projectId, files } = body;

        if (!projectId || !files) {
          return new Response(
            JSON.stringify({ error: 'Missing projectId or files' }),
            {
              status: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
            }
          );
        }

        // Simulate build process
        // In production, this would trigger actual build/deployment
        const buildId = `build_${Date.now()}`;
        const deploymentUrl = `https://preview-${projectId}.example.com`;

        return new Response(
          JSON.stringify({
            success: true,
            buildId,
            projectId,
            status: 'building',
            deploymentUrl,
            message: 'Build started successfully',
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            error: 'Invalid request body',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Handle /status endpoint
    if (url.pathname.startsWith('/status/')) {
      const buildId = url.pathname.split('/').pop();
      
      return new Response(
        JSON.stringify({
          buildId,
          status: 'completed',
          deploymentUrl: `https://preview-${buildId}.example.com`,
          message: 'Build completed successfully',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Serve deployment files from R2
    // URL format: /{versionId}/{filePath}
    const pathParts = url.pathname.split('/').filter(p => p);
    if (pathParts.length >= 1) {
      const versionId = pathParts[0];
      let filePath = pathParts.slice(1).join('/');
      
      // Default to index.html if no file specified
      if (!filePath || filePath === '') {
        filePath = 'index.html';
      }
      
      const key = `${versionId}/${filePath}`;
      
      try {
        const object = await env.DEPLOYMENTS.get(key);
        
        if (object === null) {
          // For SPA routing: if the file doesn't exist and it's not a file with extension,
          // serve index.html (this handles client-side routes like /about, /contact, etc.)
          const hasFileExtension = filePath.includes('.') && !filePath.endsWith('/');
          
          if (!hasFileExtension) {
            const indexKey = `${versionId}/index.html`;
            const indexObject = await env.DEPLOYMENTS.get(indexKey);
            
            if (indexObject !== null) {
              // Rewrite HTML paths for SPA routing
              const htmlContent = await indexObject.text();
              const rewrittenHtml = htmlContent
                .replace(/href="\//g, `href="/${versionId}/`)
                .replace(/src="\//g, `src="/${versionId}/`);
              
              return new Response(rewrittenHtml, {
                headers: {
                  ...corsHeaders,
                  'Content-Type': 'text/html',
                  'Cache-Control': 'public, max-age=0, must-revalidate',
                },
              });
            }
          }
          
          return new Response('File not found', {
            status: 404,
            headers: corsHeaders,
          });
        }
        
        // Determine content type from file extension
        const contentType = getContentType(filePath);
        
        // Set appropriate cache headers based on file type
        const cacheControl = filePath.includes('.') && (filePath.endsWith('.js') || filePath.endsWith('.css') || filePath.endsWith('.json'))
          ? 'public, max-age=31536000, immutable' // Long cache for hashed assets
          : filePath.endsWith('.html')
          ? 'public, max-age=0, must-revalidate' // Always revalidate HTML
          : 'public, max-age=3600'; // 1 hour for other files
        
        // For HTML files, rewrite absolute paths to be relative to versionId
        let responseBody = object.body;
        if (filePath.endsWith('.html')) {
          const htmlContent = await object.text();
          // Rewrite absolute paths like /assets/ to /versionId/assets/
          const rewrittenHtml = htmlContent
            .replace(/href="\//g, `href="/${versionId}/`)
            .replace(/src="\//g, `src="/${versionId}/`);
          responseBody = rewrittenHtml;
        }
        
        return new Response(responseBody, {
          headers: {
            ...corsHeaders,
            'Content-Type': contentType,
            'Cache-Control': cacheControl,
          },
        });
      } catch (error) {
        console.error('Error serving file:', error);
        return new Response('Internal server error', {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  },
};

// Helper function to determine content type
function getContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  
  const contentTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'jsx': 'application/javascript',
    'ts': 'application/typescript',
    'tsx': 'application/typescript',
    'json': 'application/json',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
  };
  
  return contentTypes[ext || ''] || 'text/plain';
}
