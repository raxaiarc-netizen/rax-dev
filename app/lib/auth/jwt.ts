/**
 * JWT token management using jose library
 */
import * as jose from 'jose';
import type { SessionPayload } from '../db/types';

const JWT_ALGORITHM = 'HS256';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

/**
 * Get JWT secret as Uint8Array
 */
function getSecret(secret?: string): Uint8Array {
  const jwtSecret = secret || process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return new TextEncoder().encode(jwtSecret);
}

/**
 * Create access token (JWT)
 */
export async function createAccessToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  secret?: string,
): Promise<string> {
  const secretKey = getSecret(secret);

  const token = await new jose.SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secretKey);

  return token;
}

/**
 * Create refresh token (opaque)
 */
export async function createRefreshToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  secret?: string,
): Promise<string> {
  const secretKey = getSecret(secret);

  const token = await new jose.SignJWT({
    userId: payload.userId,
    sessionId: payload.sessionId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secretKey);

  return token;
}

/**
 * Verify and decode access token
 */
export async function verifyAccessToken(token: string, secret?: string): Promise<SessionPayload | null> {
  try {
    const secretKey = getSecret(secret);

    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: [JWT_ALGORITHM],
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
      sessionId: payload.sessionId as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch (error) {
    // Token invalid or expired
    return null;
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(
  token: string,
  secret?: string,
): Promise<{ userId: string; sessionId: string } | null> {
  try {
    const secretKey = getSecret(secret);

    const { payload } = await jose.jwtVerify(token, secretKey, {
      algorithms: [JWT_ALGORITHM],
    });

    if (payload.type !== 'refresh') {
      return null;
    }

    return {
      userId: payload.userId as string,
      sessionId: payload.sessionId as string,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Decode token without verification (for debugging)
 */
export function decodeToken(token: string): any {
  try {
    return jose.decodeJwt(token);
  } catch {
    return null;
  }
}

/**
 * Get token expiration timestamp
 */
export function getTokenExpiration(expiryString: string = ACCESS_TOKEN_EXPIRY): number {
  const now = Date.now();
  const match = expiryString.match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error(`Invalid expiry format: ${expiryString}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return now + value * multipliers[unit];
}



