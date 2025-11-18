import { json, redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { default as IndexRoute } from './_index';
import { getSessionFromRequest } from '~/lib/auth/session.server';

export async function loader(args: LoaderFunctionArgs) {
  const { request, context, params } = args;
  const env = context.cloudflare.env as any;
  const db = env.DB;

  // Optional: Check authentication but don't redirect
  let user = null;
  if (db && env.JWT_SECRET) {
    try {
      const sessionData = await getSessionFromRequest(request, db, env.JWT_SECRET);
      if (sessionData) {
        user = sessionData.user;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }

  return json({ id: params.id, user });
}

export default IndexRoute;
