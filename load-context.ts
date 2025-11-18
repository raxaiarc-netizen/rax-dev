import { type PlatformProxy } from 'wrangler';
import type { D1Database } from '~/app/lib/db/types';

interface Env {
  // D1 Database
  DB: D1Database;
  
  // KV Namespaces
  AUTH_KV: KVNamespace;
  DEPLOYMENT_KV: KVNamespace;
  BUILD_CACHE: KVNamespace;
  
  // R2 Buckets
  DEPLOYMENT_R2: R2Bucket;
  USER_FILES_R2: R2Bucket;
  PROJECT_FILES: R2Bucket;
  
  // Environment Variables
  JWT_SECRET?: string;
  OAUTH_GITHUB_CLIENT_ID?: string;
  OAUTH_GITHUB_CLIENT_SECRET?: string;
  OAUTH_GOOGLE_CLIENT_ID?: string;
  OAUTH_GOOGLE_CLIENT_SECRET?: string;
  WHOP_API_KEY?: string;
  WHOP_WEBHOOK_SECRET?: string;
  APP_URL?: string;
  NODE_ENV?: string;
}

type Cloudflare = Omit<PlatformProxy<Env>, 'dispose'>;

declare module '@remix-run/cloudflare' {
  interface AppLoadContext {
    cloudflare: Cloudflare;
  }
}
