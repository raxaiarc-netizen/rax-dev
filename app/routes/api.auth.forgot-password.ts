/**
 * Request password reset endpoint
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
    const { email } = await request.json();

    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    const env = context.cloudflare.env as any;
    const db = env.DB;

    const userService = new UserService(db);
    const authService = new AuthService(db);
    const auditService = new AuditService(db);

    // Find user
    const user = await userService.findByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }

    // Create reset token (valid for 15 minutes)
    const authToken = await authService.createAuthToken({
      user_id: user.id,
      token_type: 'password_reset',
      expires_in_minutes: 15,
    });

    // Log password reset request
    await auditService.logEvent({
      user_id: user.id,
      event_type: 'password_reset',
      ip_address: request.headers.get('cf-connecting-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      metadata: { action: 'request' },
    });

    // TODO: Send email with reset link
    // For now, we'll just return the token (in production, send via email)
    const appUrl = env.APP_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${authToken.token}`;

    console.log('Password reset URL:', resetUrl);

    // In production, send email here
    // await sendPasswordResetEmail(user.email, resetUrl);

    return json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.',
      // Remove this in production
      __dev_reset_token: env.NODE_ENV === 'development' ? authToken.token : undefined,
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);

    return json(
      {
        error: error.message || 'Failed to process password reset request',
      },
      { status: 500 },
    );
  }
}



