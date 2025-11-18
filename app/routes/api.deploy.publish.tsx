import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { versionId, projectId, domain } = await request.json();

    if (!versionId || !projectId || !domain) {
      return json({ error: 'Invalid publish request' }, { status: 400 });
    }

    const env = context.cloudflare.env as any;
    const DEPLOYMENT_KV = env.DEPLOYMENT_KV;
    const DEPLOYMENT_R2 = env.DEPLOYMENT_R2;

    // Verify version exists and is ready
    const versionData = await DEPLOYMENT_KV.get(`version:${versionId}`);
    if (!versionData) {
      return json({ error: 'Version not found' }, { status: 404 });
    }

    const version = JSON.parse(versionData);
    
    if (version.status !== 'ready') {
      return json({ error: 'Version not ready for publishing' }, { status: 400 });
    }

    // Create domain mapping in KV
    await DEPLOYMENT_KV.put(`domain:${domain}`, versionId);
    await DEPLOYMENT_KV.put(`project:${projectId}:published`, versionId);

    // Copy files from versioned path to main path in R2
    const files = await DEPLOYMENT_R2.list({ prefix: `${versionId}/` });
    
    for (const file of files.objects) {
      const newKey = file.key.replace(`${versionId}/`, `${projectId}/`);
      const object = await DEPLOYMENT_R2.get(file.key);
      
      if (object) {
        await DEPLOYMENT_R2.put(newKey, object.body, {
          customMetadata: object.customMetadata,
        });
      }
    }

    return json({
      success: true,
      url: `https://${domain}`,
      versionId,
    });
  } catch (error) {
    console.error('Publish error:', error);
    return json(
      { error: 'Failed to publish version' },
      { status: 500 }
    );
  }
}
