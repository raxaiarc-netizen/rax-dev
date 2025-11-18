/**
 * OAuth authorization redirect endpoint
 */
import { type LoaderFunctionArgs, redirect } from '@remix-run/cloudflare';
import { getOAuthConfig, createOAuthProvider } from '~/lib/auth/oauth/factory';
import type { OAuthState } from '~/lib/auth/oauth/types';

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const provider = params.provider as 'github' | 'google';

  if (!provider || (provider !== 'github' && provider !== 'google')) {
    throw new Response('Invalid provider', { status: 400 });
  }

  try {
    const env = context.cloudflare.env as any;
    const authKV = env.AUTH_KV;

    // Get OAuth config
    const config = getOAuthConfig(provider, env);

    if (!config) {
      throw new Response(`${provider} OAuth is not configured`, { status: 500 });
    }

    // Create OAuth provider
    const oauthProvider = createOAuthProvider(provider, config);

    // Get redirect URL from query params
    const url = new URL(request.url);
    const redirectUri = url.searchParams.get('redirect_uri') || undefined;

    // Create state
    const state: OAuthState = {
      provider,
      redirect_uri: redirectUri,
      timestamp: Date.now(),
    };

    const stateToken = crypto.randomUUID();

    // Store state in KV (expires in 10 minutes)
    await authKV.put(`oauth_state:${stateToken}`, JSON.stringify(state), {
      expirationTtl: 600,
    });

    // Redirect to OAuth provider
    const authUrl = oauthProvider.getAuthorizationUrl(stateToken);

    return redirect(authUrl);
  } catch (error: any) {
    console.error(`OAuth ${provider} error:`, error);
    throw new Response(error.message || `Failed to initialize ${provider} OAuth`, {
      status: 500,
    });
  }
}



