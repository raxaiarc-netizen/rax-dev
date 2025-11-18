/**
 * User login endpoint
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { UserService } from '~/lib/db/UserService';
import { AuditService } from '~/lib/db/AuditService';
import { verifyPassword } from '~/lib/auth/password';
import { createSession, setRefreshTokenCookie } from '~/lib/auth/session.server';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { email, password } = await request.json();

    // Validation
    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    const env = context.cloudflare.env as any;
    const db = env.DB;

    const userService = new UserService(db);
    const auditService = new AuditService(db);

    const ipAddress = request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Check for too many failed attempts from this IP
    const failedAttempts = await auditService.countFailedLoginsByIP(ipAddress, LOCKOUT_DURATION_MINUTES);

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      return json(
        {
          error: 'Too many failed login attempts. Please try again later.',
        },
        { status: 429 },
      );
    }

    // Find user
    const user = await userService.findByEmail(email);

    if (!user || !user.password_hash) {
      // Log failed attempt (don't reveal if user exists)
      await auditService.logEvent({
        event_type: 'failed_login',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { email, reason: 'invalid_credentials' },
      });

      return json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check for too many failed attempts for this user
    const userFailedAttempts = await auditService.countFailedLoginsByUser(user.id, LOCKOUT_DURATION_MINUTES);

    if (userFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      return json(
        {
          error: 'Account temporarily locked due to multiple failed login attempts.',
        },
        { status: 429 },
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      // Log failed attempt
      await auditService.logEvent({
        user_id: user.id,
        event_type: 'failed_login',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: { reason: 'invalid_password' },
      });

      return json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Create session
    const session = await createSession(db, user.id, {
      userAgent,
      ipAddress,
      secret: env.JWT_SECRET,
    });

    // Log successful login
    await auditService.logEvent({
      user_id: user.id,
      event_type: 'login',
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    // Set refresh token cookie
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
    console.error('Login error:', error);

    return json(
      {
        error: error.message || 'Failed to login',
      },
      { status: 500 },
    );
  }
}



