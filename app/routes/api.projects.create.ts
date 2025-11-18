/**
 * API endpoint to create a new project
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { ProjectService } from '~/lib/db/ProjectService';
import { getSessionFromRequest } from '~/lib/auth/session.server';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;

    if (!db) {
      return json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get current session
    const sessionData = await getSessionFromRequest(request, db, env.JWT_SECRET);

    if (!sessionData) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { user } = sessionData;
    const { name, description, framework, template, chatId } = await request.json<{
      name: string;
      description?: string;
      framework?: string;
      template?: string;
      chatId?: string;
    }>();

    if (!name) {
      return json({ error: 'Project name is required' }, { status: 400 });
    }

    const projectService = new ProjectService(db);

    const project = await projectService.createProject({
      userId: user.id,
      chatId,
      name,
      description,
      framework,
      template,
    });

    return json({
      success: true,
      project,
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    return json({ error: error.message || 'Failed to create project' }, { status: 500 });
  }
}

