import { type ActionFunctionArgs } from '@remix-run/cloudflare';

const WORKER_URL = process.env.DEPLOYMENT_WORKER_URL || 'https://bolt-deployment-worker.arcrxx.workers.dev';
const API_KEY = process.env.DEPLOYMENT_API_KEY;

/**
 * Handle POST requests for updating deployments
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const workerUrl = `${WORKER_URL}/update`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  
  try {
    const body = await request.text();
    
    const response = await fetch(workerUrl, {
      method: 'POST',
      headers,
      body,
    });
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Update deployment proxy error:', error);
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
