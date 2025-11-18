/**
 * Server-side session management
 * Handles session creation, validation, and refresh token management
 */
import { AuthService } from '../db/AuthService';
import { UserService } from '../db/UserService';
import { createAccessToken, createRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt';
import type { D1Database, SessionPayload, UserWithCredits } from '../db/types';

const REFRESH_TOKEN_COOKIE_NAME = 'rax_refresh_token';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

interface SessionData {
  user: UserWithCredits;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface CreateSessionOptions {
  userAgent?: string;
  ipAddress?: string;
  secret?: string;
}

/**
 * Create a new session for a user
 */
export async function createSession(
  db: D1Database,
  userId: string,
  options: CreateSessionOptions = {},
): Promise<SessionData> {
  const authService = new AuthService(db);
  const userService = new UserService(db);

  // Get user with credits
  const user = await userService.findByIdWithCredits(userId);

  if (!user) {
    throw new Error('User not found');
  }

  // Create session ID
  const sessionId = crypto.randomUUID();

  // Create JWT tokens
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    sessionId,
  };

  const accessToken = await createAccessToken(payload, options.secret);
  const refreshToken = await createRefreshToken(payload, options.secret);

  // Calculate expiration (7 days from now)
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

  // Store session in database
  await authService.createSession({
    user_id: userId,
    token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    user_agent: options.userAgent,
    ip_address: options.ipAddress,
  });

  return {
    user,
    accessToken,
    refreshToken,
    expiresAt,
  };
}

/**
 * Get session from request Authorization header
 */
export async function getSessionFromRequest(
  request: Request,
  db: D1Database,
  secret?: string,
): Promise<{ user: UserWithCredits; session: SessionPayload } | null> {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // Remove "Bearer "

  // Verify and decode token
  const payload = await verifyAccessToken(token, secret);

  if (!payload) {
    return null;
  }

  // Get user with credits
  const userService = new UserService(db);
  const user = await userService.findByIdWithCredits(payload.userId);

  if (!user) {
    return null;
  }

  return {
    user,
    session: payload,
  };
}

/**
 * Refresh session using refresh token
 */
export async function refreshSession(
  db: D1Database,
  refreshToken: string,
  secret?: string,
): Promise<SessionData | null> {
  // Verify refresh token
  const payload = await verifyRefreshToken(refreshToken, secret);

  if (!payload) {
    return null;
  }

  const authService = new AuthService(db);
  const userService = new UserService(db);

  // Find session in database
  const session = await authService.findSessionByRefreshToken(refreshToken);

  if (!session) {
    return null;
  }

  // Check if session expired
  if (session.expires_at < Date.now()) {
    await authService.deleteSession(session.id);
    return null;
  }

  // Get user
  const user = await userService.findByIdWithCredits(payload.userId);

  if (!user) {
    return null;
  }

  // Create new access token (keep same refresh token and session ID)
  const newPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    sessionId: session.id,
  };

  const newAccessToken = await createAccessToken(newPayload, secret);

  // Update session in database
  const newExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  await authService.updateSessionToken(session.id, newAccessToken, newExpiresAt);

  return {
    user,
    accessToken: newAccessToken,
    refreshToken, // Keep same refresh token
    expiresAt: newExpiresAt,
  };
}

/**
 * Get refresh token from cookie
 */
export function getRefreshTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie');

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((c) => c.trim());
  const refreshCookie = cookies.find((c) => c.startsWith(`${REFRESH_TOKEN_COOKIE_NAME}=`));

  if (!refreshCookie) {
    return null;
  }

  return refreshCookie.substring(REFRESH_TOKEN_COOKIE_NAME.length + 1);
}

/**
 * Set refresh token cookie in response headers
 */
export function setRefreshTokenCookie(headers: Headers, refreshToken: string): void {
  const cookie = [
    `${REFRESH_TOKEN_COOKIE_NAME}=${refreshToken}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${COOKIE_MAX_AGE}`,
  ].join('; ');

  headers.set('Set-Cookie', cookie);
}

/**
 * Clear refresh token cookie
 */
export function clearRefreshTokenCookie(headers: Headers): void {
  const cookie = [
    `${REFRESH_TOKEN_COOKIE_NAME}=`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0',
  ].join('; ');

  headers.set('Set-Cookie', cookie);
}

/**
 * Invalidate a session
 */
export async function invalidateSession(db: D1Database, sessionId: string): Promise<void> {
  const authService = new AuthService(db);
  await authService.deleteSession(sessionId);
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(db: D1Database, userId: string): Promise<void> {
  const authService = new AuthService(db);
  await authService.deleteUserSessions(userId);
}
