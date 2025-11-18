/**
 * API endpoint to get a specific chat by ID
 */
import { type LoaderFunctionArgs, json } from '@remix-run/cloudflare';
import { ChatService } from '~/lib/db/ChatService';
import { getSessionFromRequest } from '~/lib/auth/session.server';

export async function loader({ request, context, params }: LoaderFunctionArgs) {
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

    const chat = await chatService.getChatById(chatId, user.id);

    if (!chat) {
      return json({ error: 'Chat not found' }, { status: 404 });
    }

    // Parse messages from JSON string
    const parsedChat = {
      ...chat,
      messages: JSON.parse(chat.messages),
      metadata: chat.metadata ? JSON.parse(chat.metadata) : null,
    };

    return json({ chat: parsedChat });
  } catch (error: any) {
    console.error('Get chat error:', error);
    return json({ error: error.message || 'Failed to get chat' }, { status: 500 });
  }
}

