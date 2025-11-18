/**
 * API endpoint to create or update a chat
 */
import { type ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { ChatService } from '~/lib/db/ChatService';
import { getSessionFromRequest } from '~/lib/auth/session.server';
import type { Message } from 'ai';

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST' && request.method !== 'PUT') {
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
    const { id, messages, title, metadata } = await request.json<{
      id?: string;
      messages?: Message[];
      title?: string;
      metadata?: any;
    }>();

    const chatService = new ChatService(db);

    // If ID is provided, update existing chat
    if (id) {
      const existingChat = await chatService.getChatById(id, user.id);
      if (!existingChat) {
        return json({ error: 'Chat not found' }, { status: 404 });
      }

      // Update messages and title if provided
      if (messages) {
        await chatService.updateChat(id, user.id, messages, title);
      } else if (title !== undefined) {
        // Update only title if messages not provided
        await chatService.updateChatTitle(id, user.id, title);
      }
      
      // Update metadata if provided
      if (metadata) {
        await chatService.updateChatMetadata(id, user.id, metadata);
      }

      return json({
        success: true,
        chatId: id,
      });
    }

    // Create new chat - messages are required for new chats
    if (!messages || !Array.isArray(messages)) {
      return json({ error: 'Messages array is required for new chats' }, { status: 400 });
    }

    const chat = await chatService.createChat(user.id, messages, title, metadata);

    return json({
      success: true,
      chatId: chat.id,
    });
  } catch (error: any) {
    console.error('Save chat error:', error);
    return json({ error: error.message || 'Failed to save chat' }, { status: 500 });
  }
}

