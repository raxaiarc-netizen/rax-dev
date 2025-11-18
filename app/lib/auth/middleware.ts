/**
 * Authentication middleware for protecting routes
 */
import { type LoaderFunctionArgs, type ActionFunctionArgs, json, redirect } from '@remix-run/cloudflare';
import { getSessionFromRequest } from './session.server';
import type { SessionPayload } from '../db/types';

export interface AuthenticatedContext extends LoaderFunctionArgs {
  session: SessionPayload;
}

export interface AuthenticatedActionContext extends ActionFunctionArgs {
  session: SessionPayload;
}

/**
 * Require authentication for loader
 */
export async function requireAuth(args: LoaderFunctionArgs): Promise<SessionPayload> {
  const { request, context } = args;
  const env = context.cloudflare.env as any;
  const db = env.DB;

  if (!db) {
    throw new Response('Database not configured', { status: 500 });
  }

  const session = await getSessionFromRequest(request, db, env.JWT_SECRET);

  if (!session) {
    // Redirect to login page or return 401
    const url = new URL(request.url);
    throw redirect(`/?login=required&redirect=${encodeURIComponent(url.pathname)}`);
  }

  return session;
}

/**
 * Require authentication for action
 */
export async function requireAuthAction(args: ActionFunctionArgs): Promise<SessionPayload> {
  const { request, context } = args;
  const env = context.cloudflare.env as any;
  const db = env.DB;

  if (!db) {
    throw new Response('Database not configured', { status: 500 });
  }

  const session = await getSessionFromRequest(request, db, env.JWT_SECRET);

  if (!session) {
    throw json({ error: 'Authentication required' }, { status: 401 });
  }

  return session;
}

/**
 * Optional authentication (returns null if not authenticated)
 */
export async function optionalAuth(args: LoaderFunctionArgs): Promise<SessionPayload | null> {
  const { request, context } = args;
  const env = context.cloudflare.env as any;
  const db = env.DB;

  if (!db) {
    return null;
  }

  try {
    return await getSessionFromRequest(request, db, env.JWT_SECRET);
  } catch {
    return null;
  }
}



