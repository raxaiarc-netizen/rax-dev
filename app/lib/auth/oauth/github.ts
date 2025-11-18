/**
 * GitHub OAuth implementation
 */
import type { OAuthProvider, OAuthTokenResponse, OAuthUserInfo } from './types';

export class GitHubOAuth implements OAuthProvider {
  name = 'github' as const;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /**
   * Get GitHub authorization URL
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'read:user user:email',
      state,
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<OAuthTokenResponse> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub token exchange failed: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      access_token: string;
      token_type: string;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (data.error) {
      throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
    }

    return {
      access_token: data.access_token,
      token_type: data.token_type,
      scope: data.scope,
    };
  }

  /**
   * Get user info from GitHub
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    // Get user profile
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch GitHub user: ${userResponse.statusText}`);
    }

    const user = (await userResponse.json()) as {
      id: number;
      login: string;
      name?: string;
      email?: string;
      avatar_url?: string;
    };

    // Get user emails
    const emailsResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!emailsResponse.ok) {
      throw new Error(`Failed to fetch GitHub emails: ${emailsResponse.statusText}`);
    }

    const emails = (await emailsResponse.json()) as Array<{
      email: string;
      primary: boolean;
      verified: boolean;
    }>;

    // Find primary verified email
    const primaryEmail = emails.find((e) => e.primary && e.verified);
    const email = primaryEmail?.email || user.email;

    if (!email) {
      throw new Error('No verified email found in GitHub account');
    }

    return {
      provider_user_id: user.id.toString(),
      email,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      email_verified: primaryEmail?.verified || false,
    };
  }
}

