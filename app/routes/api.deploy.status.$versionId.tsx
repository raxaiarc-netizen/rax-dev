import { type LoaderFunctionArgs } from '@remix-run/cloudflare';

const WORKER_URL = process.env.DEPLOYMENT_WORKER_URL || 'https://bolt-deployment-worker.arcrxx.workers.dev';
const API_KEY = process.env.DEPLOYMENT_API_KEY;

/**
 * Handle GET requests for deployment status
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const { versionId } = params;

  if (!versionId) {
    return new Response(
      JSON.stringify({ error: 'Version ID required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const workerUrl = `${WORKER_URL}/status/${versionId}`;
  
  const headers: HeadersInit = {};
  
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  
  try {
    const response = await fetch(workerUrl, {
      method: 'GET',
      headers,
    });
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Status proxy error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to communicate with deployment service',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
