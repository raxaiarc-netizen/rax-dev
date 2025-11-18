/**
 * OAuth types and interfaces
 */

export interface OAuthProvider {
  name: 'github' | 'google';
  getAuthorizationUrl(state: string): string;
  exchangeCodeForToken(code: string): Promise<OAuthTokenResponse>;
  getUserInfo(accessToken: string): Promise<OAuthUserInfo>;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

export interface OAuthUserInfo {
  provider_user_id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  email_verified?: boolean;
}

export interface OAuthState {
  provider: 'github' | 'google';
  redirect_uri?: string;
  timestamp: number;
}



