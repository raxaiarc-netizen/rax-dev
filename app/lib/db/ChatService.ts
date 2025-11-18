/**
 * Chat service for managing cloud-synced chats
 */
import type { D1Database, Chat, ChatFile } from './types';
import type { Message } from 'ai';

export interface ChatListItem {
  id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
  message_count: number;
}

export class ChatService {
  constructor(private db: D1Database) {}

  /**
   * Create a new chat
   */
  async createChat(userId: string, messages: Message[], title?: string, metadata?: any): Promise<Chat> {
    const now = Date.now();
    const chat: Chat = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: title || null,
      messages: JSON.stringify(messages),
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: now,
      updated_at: now,
    };

    await this.db
      .prepare(
        `INSERT INTO chats (id, user_id, title, messages, metadata, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(chat.id, chat.user_id, chat.title, chat.messages, chat.metadata, chat.created_at, chat.updated_at)
      .run();

    return chat;
  }

  /**
   * Get chat by ID
   */
  async getChatById(chatId: string, userId: string): Promise<Chat | null> {
    const result = await this.db
      .prepare(`SELECT * FROM chats WHERE id = ? AND user_id = ? LIMIT 1`)
      .bind(chatId, userId)
      .first<Chat>();

    return result || null;
  }

  /**
   * Get all chats for a user (list view without full messages)
   */
  async getUserChats(userId: string, limit: number = 100, offset: number = 0): Promise<ChatListItem[]> {
    const result = await this.db
      .prepare(
        `SELECT 
          id, 
          title, 
          created_at, 
          updated_at,
          (SELECT COUNT(*) FROM json_each(messages)) as message_count
         FROM chats 
         WHERE user_id = ? 
         ORDER BY updated_at DESC 
         LIMIT ? OFFSET ?`,
      )
      .bind(userId, limit, offset)
      .all<ChatListItem>();

    return result.results || [];
  }

  /**
   * Update chat messages and title
   */
  async updateChat(chatId: string, userId: string, messages: Message[], title?: string): Promise<void> {
    const updates: string[] = ['messages = ?', 'updated_at = ?'];
    const values: any[] = [JSON.stringify(messages), Date.now()];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    values.push(chatId, userId);

    await this.db
      .prepare(`UPDATE chats SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`)
      .bind(...values)
      .run();
  }

  /**
   * Update only the chat title
   */
  async updateChatTitle(chatId: string, userId: string, title: string): Promise<void> {
    await this.db
      .prepare(`UPDATE chats SET title = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
      .bind(title, Date.now(), chatId, userId)
      .run();
  }

  /**
   * Update chat metadata
   */
  async updateChatMetadata(chatId: string, userId: string, metadata: any): Promise<void> {
    await this.db
      .prepare(`UPDATE chats SET metadata = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
      .bind(JSON.stringify(metadata), Date.now(), chatId, userId)
      .run();
  }

  /**
   * Delete chat and associated files
   */
  async deleteChat(chatId: string, userId: string): Promise<void> {
    // Delete chat (foreign key cascade will delete chat_files)
    await this.db.prepare(`DELETE FROM chats WHERE id = ? AND user_id = ?`).bind(chatId, userId).run();
  }

  /**
   * Delete all chats for a user
   */
  async deleteAllUserChats(userId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM chats WHERE user_id = ?`).bind(userId).run();
  }

  /**
   * Get chat count for a user
   */
  async getChatCount(userId: string): Promise<number> {
    const result = await this.db
      .prepare(`SELECT COUNT(*) as count FROM chats WHERE user_id = ?`)
      .bind(userId)
      .first<{ count: number }>();

    return result?.count || 0;
  }

  /**
   * Search chats by title or content
   */
  async searchChats(userId: string, query: string, limit: number = 20): Promise<ChatListItem[]> {
    const searchTerm = `%${query}%`;
    const result = await this.db
      .prepare(
        `SELECT 
          id, 
          title, 
          created_at, 
          updated_at,
          (SELECT COUNT(*) FROM json_each(messages)) as message_count
         FROM chats 
         WHERE user_id = ? AND (title LIKE ? OR messages LIKE ?)
         ORDER BY updated_at DESC 
         LIMIT ?`,
      )
      .bind(userId, searchTerm, searchTerm, limit)
      .all<ChatListItem>();

    return result.results || [];
  }

  /**
   * Add file to chat
   */
  async addChatFile(data: {
    chat_id: string;
    user_id: string;
    file_path: string;
    r2_key: string;
    size_bytes: number;
    mime_type?: string;
  }): Promise<ChatFile> {
    const file: ChatFile = {
      id: crypto.randomUUID(),
      chat_id: data.chat_id,
      user_id: data.user_id,
      file_path: data.file_path,
      r2_key: data.r2_key,
      size_bytes: data.size_bytes,
      mime_type: data.mime_type || null,
      created_at: Date.now(),
    };

    await this.db
      .prepare(
        `INSERT INTO chat_files (id, chat_id, user_id, file_path, r2_key, size_bytes, mime_type, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        file.id,
        file.chat_id,
        file.user_id,
        file.file_path,
        file.r2_key,
        file.size_bytes,
        file.mime_type,
        file.created_at,
      )
      .run();

    return file;
  }

  /**
   * Get all files for a chat
   */
  async getChatFiles(chatId: string, userId: string): Promise<ChatFile[]> {
    const result = await this.db
      .prepare(`SELECT * FROM chat_files WHERE chat_id = ? AND user_id = ? ORDER BY created_at ASC`)
      .bind(chatId, userId)
      .all<ChatFile>();

    return result.results || [];
  }

  /**
   * Delete chat file
   */
  async deleteChatFile(fileId: string, userId: string): Promise<ChatFile | null> {
    // Get file info before deleting (for R2 cleanup)
    const file = await this.db
      .prepare(`SELECT * FROM chat_files WHERE id = ? AND user_id = ? LIMIT 1`)
      .bind(fileId, userId)
      .first<ChatFile>();

    if (!file) {
      return null;
    }

    await this.db.prepare(`DELETE FROM chat_files WHERE id = ? AND user_id = ?`).bind(fileId, userId).run();

    return file;
  }

  /**
   * Get total storage used by user
   */
  async getUserStorageBytes(userId: string): Promise<number> {
    const result = await this.db
      .prepare(`SELECT COALESCE(SUM(size_bytes), 0) as total FROM chat_files WHERE user_id = ?`)
      .bind(userId)
      .first<{ total: number }>();

    return result?.total || 0;
  }
}

