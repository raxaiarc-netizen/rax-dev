/**
 * User logout endpoint
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { AuditService } from '~/lib/db/AuditService';
import { getSessionFromRequest, invalidateSession, clearRefreshTokenCookie } from '~/lib/auth/session.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;

    // Get current session
    const sessionData = await getSessionFromRequest(request, db, env.JWT_SECRET);

    if (sessionData) {
      const { user, session } = sessionData;

      // Invalidate session
      await invalidateSession(db, session.sessionId);

      // Log logout
      const auditService = new AuditService(db);
      await auditService.logEvent({
        user_id: user.id,
        event_type: 'logout',
        ip_address: request.headers.get('cf-connecting-ip') || undefined,
        user_agent: request.headers.get('user-agent') || undefined,
      });
    }

    // Clear refresh token cookie
    const responseHeaders = new Headers();
    clearRefreshTokenCookie(responseHeaders);

    return json(
      {
        success: true,
        message: 'Logged out successfully',
      },
      {
        status: 200,
        headers: responseHeaders,
      },
    );
  } catch (error: any) {
    console.error('Logout error:', error);

    return json(
      {
        error: error.message || 'Failed to logout',
      },
      { status: 500 },
    );
  }
}



