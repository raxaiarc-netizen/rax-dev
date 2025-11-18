/**
 * Reset password with token endpoint
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { UserService } from '~/lib/db/UserService';
import { AuthService } from '~/lib/db/AuthService';
import { AuditService } from '~/lib/db/AuditService';
import { hashPassword, validatePasswordStrength } from '~/lib/auth/password';
import { invalidateAllUserSessions } from '~/lib/auth/session.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return json({ error: 'Token and password are required' }, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);

    if (!passwordValidation.valid) {
      return json(
        {
          error: 'Password does not meet requirements',
          details: passwordValidation.errors,
        },
        { status: 400 },
      );
    }

    const env = context.cloudflare.env as any;
    const db = env.DB;

    const userService = new UserService(db);
    const authService = new AuthService(db);
    const auditService = new AuditService(db);

    // Verify token
    const authToken = await authService.findAuthToken(token, 'password_reset');

    if (!authToken) {
      return json({ error: 'Invalid or expired reset token' }, { status: 400 });
    }

    // Hash new password
    const password_hash = await hashPassword(password);

    // Update password
    await userService.updatePassword(authToken.user_id, password_hash);

    // Mark token as used
    await authService.markTokenAsUsed(token);

    // Invalidate all sessions (force re-login)
    await invalidateAllUserSessions(authToken.user_id, db);

    // Log password change
    await auditService.logEvent({
      user_id: authToken.user_id,
      event_type: 'password_change',
      ip_address: request.headers.get('cf-connecting-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      metadata: { method: 'reset' },
    });

    return json({
      success: true,
      message: 'Password has been reset successfully. Please login with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);

    return json(
      {
        error: error.message || 'Failed to reset password',
      },
      { status: 500 },
    );
  }
}



