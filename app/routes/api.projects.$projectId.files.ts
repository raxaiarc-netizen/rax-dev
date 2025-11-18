/**
 * API endpoint to manage project files
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
    const files = await projectService.getProjectFiles(projectId, user.id);

    return json({ files });
  } catch (error: any) {
    console.error('Get project files error:', error);
    return json({ error: error.message || 'Failed to get project files' }, { status: 500 });
  }
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;
    const r2 = env.PROJECT_FILES as R2Bucket;

    if (!db) {
      console.error('❌ DB binding not available');
      return json({ error: 'Database not configured' }, { status: 500 });
    }

    if (!r2) {
      console.error('❌ PROJECT_FILES R2 binding not available');
      console.error('Available env bindings:', Object.keys(env || {}));
      console.error('💡 Tip: Use "npm run build && npm run start" instead of "npm run dev" to get R2 bindings');
      return json({ 
        error: 'Storage not configured',
        details: 'PROJECT_FILES R2 bucket binding is not available in development mode. Use "npm run build && npm run start" to run with real Cloudflare bindings.',
        availableBindings: Object.keys(env || {})
      }, { status: 500 });
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

    // Ensure project exists (auto-create if needed)
    let project = await projectService.getProjectById(projectId, user.id);
    if (!project) {
      try {
        // Auto-create project from chat
        project = await projectService.createProject({
          id: projectId,
          userId: user.id,
          name: 'Untitled Project',
          description: 'Auto-created project',
        });
        console.log('Auto-created project:', projectId);
      } catch (createError: any) {
        // If creation failed, try fetching again (might have been created by another request)
        console.warn('Project creation failed, checking if it exists:', createError.message);
        project = await projectService.getProjectById(projectId, user.id);
        if (!project) {
          // Still doesn't exist, this is a real error
          return json({ error: `Failed to create project: ${createError.message}` }, { status: 500 });
        }
      }
    }

    // Handle POST (save/update file)
    if (request.method === 'POST') {
      const { filePath, content, mimeType, isBinary } = await request.json<{
        filePath: string;
        content: string;
        mimeType?: string;
        isBinary?: boolean;
      }>();

      if (!filePath || content === undefined) {
        return json({ error: 'File path and content are required' }, { status: 400 });
      }

      // Generate R2 key
      const r2Key = `projects/${user.id}/${projectId}/${filePath}`;

      // Calculate file size and hash
      const contentBuffer = isBinary ? Buffer.from(content, 'base64') : Buffer.from(content, 'utf-8');
      const sizeBytes = contentBuffer.length;

      // Calculate SHA-256 hash - convert Buffer to Uint8Array for crypto.subtle
      const uint8Content = new Uint8Array(contentBuffer);
      const hashBuffer = await crypto.subtle.digest('SHA-256', uint8Content);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const fileHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Upload to R2
      await r2.put(r2Key, contentBuffer, {
        customMetadata: {
          projectId,
          userId: user.id,
          filePath,
          mimeType: mimeType || 'application/octet-stream',
        },
      });

      // Save file metadata to database
      const file = await projectService.upsertProjectFile({
        projectId,
        userId: user.id,
        filePath,
        r2Key,
        sizeBytes,
        mimeType,
        fileHash,
        isBinary,
      });

      return json({ success: true, file });
    }

    // Handle DELETE (delete file)
    if (request.method === 'DELETE') {
      const { filePath } = await request.json<{ filePath: string }>();

      if (!filePath) {
        return json({ error: 'File path is required' }, { status: 400 });
      }

      const file = await projectService.deleteProjectFile(projectId, filePath, user.id);

      if (!file) {
        return json({ error: 'File not found' }, { status: 404 });
      }

      // Delete from R2
      await r2.delete(file.r2_key);

      return json({ success: true, message: 'File deleted' });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('❌ Project file action error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return json({ 
      error: error.message || 'Failed to perform action',
      errorType: error.name,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

