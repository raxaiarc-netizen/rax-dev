/**
 * OAuth provider factory
 */
import { GitHubOAuth } from './github';
import { GoogleOAuth } from './google';
import type { OAuthProvider } from './types';

export function createOAuthProvider(
  provider: 'github' | 'google',
  config: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  },
): OAuthProvider {
  switch (provider) {
    case 'github':
      return new GitHubOAuth(config.clientId, config.clientSecret, config.redirectUri);
    case 'google':
      return new GoogleOAuth(config.clientId, config.clientSecret, config.redirectUri);
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
}

/**
 * Get OAuth config from environment
 */
export function getOAuthConfig(
  provider: 'github' | 'google',
  env: any,
): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null {
  const appUrl = env.APP_URL || 'http://localhost:5173';

  if (provider === 'github') {
    const clientId = env.OAUTH_GITHUB_CLIENT_ID;
    const clientSecret = env.OAUTH_GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    return {
      clientId,
      clientSecret,
      redirectUri: `${appUrl}/api/auth/oauth/callback/github`,
    };
  }

  if (provider === 'google') {
    const clientId = env.OAUTH_GOOGLE_CLIENT_ID;
    const clientSecret = env.OAUTH_GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    return {
      clientId,
      clientSecret,
      redirectUri: `${appUrl}/api/auth/oauth/callback/google`,
    };
  }

  return null;
}



