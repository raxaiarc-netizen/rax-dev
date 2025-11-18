/**
 * API endpoint to load project files from R2
 */
import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { ProjectService } from '~/lib/db/ProjectService';
import { getSessionFromRequest } from '~/lib/auth/session.server';

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;
    const r2 = env.PROJECT_FILES as R2Bucket;

    if (!db) {
      return json({ error: 'Database not configured' }, { status: 500 });
    }

    if (!r2) {
      return json({ error: 'Storage not configured' }, { status: 500 });
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

    // Get all file metadata
    const fileMetadata = await projectService.getProjectFiles(projectId, user.id);

    // Load file contents from R2
    const filesWithContent = await Promise.all(
      fileMetadata.map(async (file) => {
        try {
          const object = await r2.get(file.r2_key);

          if (!object) {
            console.warn(`File not found in R2: ${file.r2_key}`);
            return null;
          }

          const content = file.is_binary
            ? Buffer.from(await object.arrayBuffer()).toString('base64')
            : await object.text();

          return {
            path: file.file_path,
            content,
            mimeType: file.mime_type,
            isBinary: file.is_binary === 1,
            size: file.size_bytes,
            hash: file.file_hash,
            updatedAt: file.updated_at,
          };
        } catch (error) {
          console.error(`Error loading file ${file.file_path}:`, error);
          return null;
        }
      }),
    );

    // Filter out null entries (failed loads)
    const files = filesWithContent.filter((f) => f !== null);

    return json({
      projectId,
      files,
      totalSize: fileMetadata.reduce((sum, f) => sum + f.size_bytes, 0),
      fileCount: files.length,
    });
  } catch (error: any) {
    console.error('Load project files error:', error);
    return json({ error: error.message || 'Failed to load project files' }, { status: 500 });
  }
}

