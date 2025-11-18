/**
 * API endpoint to get, update, or delete a project
 */
import { type ActionFunctionArgs, type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { ProjectService } from '~/lib/db/ProjectService';
import { getSessionFromRequest } from '~/lib/auth/session.server';

export async function loader({ request, context, params }: LoaderFunctionArgs) {
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
    const { projectId } = params;

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    const projectService = new ProjectService(db);
    const project = await projectService.getProjectById(projectId, user.id);

    if (!project) {
      return json({ error: 'Project not found' }, { status: 404 });
    }

    return json({ project });
  } catch (error: any) {
    console.error('Get project error:', error);
    return json({ error: error.message || 'Failed to get project' }, { status: 500 });
  }
}

export async function action({ request, context, params }: ActionFunctionArgs) {
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
    const { projectId } = params;

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    const projectService = new ProjectService(db);

    // Handle DELETE
    if (request.method === 'DELETE') {
      const url = new URL(request.url);
      const hard = url.searchParams.get('hard') === 'true';

      if (hard) {
        const files = await projectService.hardDeleteProject(projectId, user.id);

        // Delete files from R2
        const r2 = env.PROJECT_FILES as R2Bucket;
        if (r2) {
          await Promise.all(files.map((file) => r2.delete(file.r2_key)));
        }

        return json({ success: true, message: 'Project permanently deleted' });
      } else {
        await projectService.deleteProject(projectId, user.id);
        return json({ success: true, message: 'Project deleted' });
      }
    }

    // Handle PUT/PATCH (update)
    if (request.method === 'PUT' || request.method === 'PATCH') {
      const { name, description, framework, status } = await request.json<{
        name?: string;
        description?: string;
        framework?: string;
        status?: 'active' | 'archived' | 'deleted';
      }>();

      await projectService.updateProject(projectId, user.id, {
        name,
        description,
        framework,
        status,
      });

      return json({ success: true, message: 'Project updated' });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('Project action error:', error);
    return json({ error: error.message || 'Failed to perform action' }, { status: 500 });
  }
}

