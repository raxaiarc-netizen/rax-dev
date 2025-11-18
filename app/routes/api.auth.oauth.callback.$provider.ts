/**
 * OAuth callback endpoint
 */
import { type LoaderFunctionArgs, redirect } from '@remix-run/cloudflare';
import { UserService } from '~/lib/db/UserService';
import { AuthService } from '~/lib/db/AuthService';
import { AuditService } from '~/lib/db/AuditService';
import { getOAuthConfig, createOAuthProvider } from '~/lib/auth/oauth/factory';
import { createSession, setRefreshTokenCookie } from '~/lib/auth/session.server';
import type { OAuthState } from '~/lib/auth/oauth/types';

export async function loader({ params, request, context }: LoaderFunctionArgs) {
  const provider = params.provider as 'github' | 'google';

  if (!provider || (provider !== 'github' && provider !== 'google')) {
    return redirect('/?error=invalid_provider');
  }

  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;
    const authKV = env.AUTH_KV;

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const stateToken = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return redirect(`/?error=oauth_${error}`);
    }

    if (!code || !stateToken) {
      return redirect('/?error=oauth_missing_params');
    }

    // Verify state
    const stateData = await authKV.get(`oauth_state:${stateToken}`);

    if (!stateData) {
      return redirect('/?error=oauth_invalid_state');
    }

    const state: OAuthState = JSON.parse(stateData);

    // Delete used state
    await authKV.delete(`oauth_state:${stateToken}`);

    // Verify state matches
    if (state.provider !== provider) {
      return redirect('/?error=oauth_provider_mismatch');
    }

    // Check state is not expired (10 minutes)
    if (Date.now() - state.timestamp > 600000) {
      return redirect('/?error=oauth_state_expired');
    }

    // Get OAuth config
    const config = getOAuthConfig(provider, env);

    if (!config) {
      return redirect(`/?error=oauth_not_configured`);
    }

    // Create OAuth provider
    const oauthProvider = createOAuthProvider(provider, config);

    // Exchange code for token
    const tokenResponse = await oauthProvider.exchangeCodeForToken(code);

    // Get user info
    const userInfo = await oauthProvider.getUserInfo(tokenResponse.access_token);

    const userService = new UserService(db);
    const authService = new AuthService(db);
    const auditService = new AuditService(db);

    // Check if OAuth account exists
    let oauthAccount = await authService.findOAuthAccount(provider, userInfo.provider_user_id);

    let userId: string;
    let isNewUser = false;

    if (oauthAccount) {
      // Existing OAuth account - update tokens
      userId = oauthAccount.user_id;
      await authService.upsertOAuthAccount({
        user_id: userId,
        provider,
        provider_user_id: userInfo.provider_user_id,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : undefined,
      });
    } else {
      // Check if user exists with this email
      let user = await userService.findByEmail(userInfo.email);

      if (user) {
        // Link OAuth to existing user
        userId = user.id;
      } else {
        // Create new user
        user = await userService.createUser({
          email: userInfo.email,
          name: userInfo.name,
          avatar_url: userInfo.avatar_url,
        });
        userId = user.id;
        isNewUser = true;

        // Set email as verified if OAuth provider verified it
        if (userInfo.email_verified) {
          await userService.updateUser(userId, { email_verified: 1 });
        }
      }

      // Create OAuth account link
      await authService.upsertOAuthAccount({
        user_id: userId,
        provider,
        provider_user_id: userInfo.provider_user_id,
        access_token: tokenResponse.access_token,
        refresh_token: tokenResponse.refresh_token,
        expires_at: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : undefined,
      });

      // Log OAuth link
      await auditService.logEvent({
        user_id: userId,
        event_type: 'oauth_linked',
        ip_address: request.headers.get('cf-connecting-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
        metadata: { provider },
      });
    }

    // Create session
    const session = await createSession(db, userId, {
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('cf-connecting-ip') || undefined,
      secret: env.JWT_SECRET,
    });

    // Log login
    await auditService.logEvent({
      user_id: userId,
      event_type: isNewUser ? 'register' : 'login',
      ip_address: request.headers.get('cf-connecting-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      metadata: { method: 'oauth', provider },
    });

    // Build redirect URL with session token
    const redirectUrl = new URL(state.redirect_uri || '/', env.APP_URL || 'http://localhost:5173');
    redirectUrl.searchParams.set('token', session.accessToken);

    // Set refresh token cookie and redirect
    const headers = new Headers();
    setRefreshTokenCookie(headers, session.refreshToken);
    headers.set('Location', redirectUrl.toString());

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (error: any) {
    console.error(`OAuth ${provider} callback error:`, error);
    return redirect(`/?error=oauth_failed&message=${encodeURIComponent(error.message)}`);
  }
}



