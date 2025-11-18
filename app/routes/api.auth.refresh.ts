/**
 * Refresh access token endpoint
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { refreshSession, getRefreshTokenFromCookie, setRefreshTokenCookie } from '~/lib/auth/session.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;

    // Get refresh token from cookie
    const refreshToken = getRefreshTokenFromCookie(request);

    if (!refreshToken) {
      return json({ error: 'Refresh token not found' }, { status: 401 });
    }

    // Refresh session
    const session = await refreshSession(refreshToken, db, env.JWT_SECRET);

    if (!session) {
      return json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    // Set refresh token cookie (in case it was rotated)
    const responseHeaders = new Headers();
    setRefreshTokenCookie(responseHeaders, session.refreshToken);

    return json(
      {
        success: true,
        user: session.user,
        accessToken: session.accessToken,
        expiresAt: session.expiresAt,
      },
      {
        status: 200,
        headers: responseHeaders,
      },
    );
  } catch (error: any) {
    console.error('Refresh error:', error);

    return json(
      {
        error: error.message || 'Failed to refresh session',
      },
      { status: 500 },
    );
  }
}



