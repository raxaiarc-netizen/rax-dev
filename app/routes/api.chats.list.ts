/**
 * API endpoint to list all chats for the authenticated user
 */
import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { ChatService } from '~/lib/db/ChatService';
import { getSessionFromRequest } from '~/lib/auth/session.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
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
    const chatService = new ChatService(db);

    // Get pagination params from URL
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    const chats = await chatService.getUserChats(user.id, limit, offset);
    const totalCount = await chatService.getChatCount(user.id);

    return json({
      chats,
      totalCount,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('List chats error:', error);
    return json({ error: error.message || 'Failed to list chats' }, { status: 500 });
  }
}

