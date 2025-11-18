/**
 * Verify email with token endpoint
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { UserService } from '~/lib/db/UserService';
import { AuthService } from '~/lib/db/AuthService';
import { AuditService } from '~/lib/db/AuditService';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { token } = await request.json();

    if (!token) {
      return json({ error: 'Token is required' }, { status: 400 });
    }

    const env = context.cloudflare.env as any;
    const db = env.DB;

    const userService = new UserService(db);
    const authService = new AuthService(db);
    const auditService = new AuditService(db);

    // Verify token
    const authToken = await authService.findAuthToken(token, 'email_verification');

    if (!authToken) {
      return json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    // Update user email_verified
    await userService.updateUser(authToken.user_id, {
      email_verified: 1,
    });

    // Mark token as used
    await authService.markTokenAsUsed(token);

    // Log email verification
    await auditService.logEvent({
      user_id: authToken.user_id,
      event_type: 'email_verified',
      ip_address: request.headers.get('cf-connecting-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
    });

    return json({
      success: true,
      message: 'Email verified successfully',
    });
  } catch (error: any) {
    console.error('Verify email error:', error);

    return json(
      {
        error: error.message || 'Failed to verify email',
      },
      { status: 500 },
    );
  }
}



