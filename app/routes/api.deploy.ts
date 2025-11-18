import { type ActionFunctionArgs, type LoaderFunctionArgs } from '@remix-run/cloudflare';

const WORKER_URL = process.env.DEPLOYMENT_WORKER_URL || 'https://build-worker.rax-ai.workers.dev';
const API_KEY = process.env.DEPLOYMENT_API_KEY;

/**
 * Proxy deployment requests to the Cloudflare Worker
 */
export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/deploy', '');
  
  // Forward the request to the worker
  const workerUrl = `${WORKER_URL}${path}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  
  try {
    const body = await request.text();
    
    const response = await fetch(workerUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    });
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Deployment proxy error:', error);
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

/**
 * Handle GET requests (status checks)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/deploy', '');
  
  const workerUrl = `${WORKER_URL}${path}`;
  
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
    console.error('Deployment proxy error:', error);
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
