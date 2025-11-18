/**
 * API endpoint to delete a chat
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { ChatService } from '~/lib/db/ChatService';
import { getSessionFromRequest } from '~/lib/auth/session.server';

export async function action({ request, context, params }: ActionFunctionArgs) {
  if (request.method !== 'DELETE') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const env = context.cloudflare.env as any;
    const db = env.DB;

    if (!db) {
      return json({ error: 'Database not configured' }, { status: 500 });
    }

    const chatId = params.id;
    if (!chatId) {
      return json({ error: 'Chat ID is required' }, { status: 400 });
    }

    // Get current session
    const sessionData = await getSessionFromRequest(request, db, env.JWT_SECRET);

    if (!sessionData) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { user } = sessionData;
    const chatService = new ChatService(db);

    // Check if chat exists and belongs to user
    const existingChat = await chatService.getChatById(chatId, user.id);
    if (!existingChat) {
      return json({ error: 'Chat not found' }, { status: 404 });
    }

    await chatService.deleteChat(chatId, user.id);

    return json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete chat error:', error);
    return json({ error: error.message || 'Failed to delete chat' }, { status: 500 });
  }
}

