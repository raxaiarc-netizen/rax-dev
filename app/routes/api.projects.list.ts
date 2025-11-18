/**
 * API endpoint to list user projects
 */
import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { ProjectService } from '~/lib/db/ProjectService';
import { getSessionFromRequest } from '~/lib/auth/session.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;

    if (!db) {
      return json({ error: 'Database not configured' }, { status: 500 });
    }

    const sessionData = await getSessionFromRequest(request, db, env.JWT_SECRET);

    if (!sessionData) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { user } = sessionData;
    const url = new URL(request.url);
    const status = (url.searchParams.get('status') as 'active' | 'archived' | 'all') || 'active';
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const chatId = url.searchParams.get('chatId');

    const projectService = new ProjectService(db);

    let projects;
    if (chatId) {
      projects = await projectService.getProjectsByChatId(chatId, user.id);
    } else {
      projects = await projectService.getUserProjects(user.id, status, limit, offset);
    }

    const totalCount = await projectService.getProjectCount(user.id, status);
    const totalStorage = await projectService.getUserProjectStorageBytes(user.id);

    return json({
      projects,
      total: totalCount,
      totalStorage,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('List projects error:', error);
    return json({ error: error.message || 'Failed to list projects' }, { status: 500 });
  }
}

