/**
 * User registration endpoint
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { UserService } from '~/lib/db/UserService';
import { AuthService } from '~/lib/db/AuthService';
import { AuditService } from '~/lib/db/AuditService';
import { hashPassword, validatePasswordStrength } from '~/lib/auth/password';
import { createSession, setRefreshTokenCookie } from '~/lib/auth/session.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = (await request.json()) as { email?: string; password?: string; name?: string };
    const { email, password, name } = body;

    // Validation
    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return json({ error: 'Invalid email format' }, { status: 400 });
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
    const auditService = new AuditService(db);

    // Check if email already exists
    const existingUser = await userService.findByEmail(email);

    if (existingUser) {
      return json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const user = await userService.createUser({
      email,
      password_hash,
      name: name || undefined,
    });

    // Log registration
    await auditService.logEvent({
      user_id: user.id,
      event_type: 'register',
      ip_address: request.headers.get('cf-connecting-ip') || undefined,
      user_agent: request.headers.get('user-agent') || undefined,
      metadata: { method: 'email' },
    });

    // Create session
    const session = await createSession(db, user.id, {
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('cf-connecting-ip') || undefined,
      secret: env.JWT_SECRET,
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
        status: 201,
        headers: responseHeaders,
      },
    );
  } catch (error: any) {
    console.error('Registration error:', error);

    return json(
      {
        error: error.message || 'Failed to register user',
      },
      { status: 500 },
    );
  }
}

