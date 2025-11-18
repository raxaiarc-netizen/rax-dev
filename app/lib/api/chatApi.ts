/**
 * Client-side API for chat operations
 */
import type { Message } from 'ai';

export interface ChatListItem {
  id: string;
  title: string | null;
  created_at: number;
  updated_at: number;
  message_count: number;
}

export interface Chat {
  id: string;
  user_id: string;
  title: string | null;
  messages: Message[];
  metadata: any;
  created_at: number;
  updated_at: number;
}

export class ChatAPI {
  private static getAuthToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  private static async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = this.getAuthToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.status === 401) {
      // Token expired, clear it
      localStorage.removeItem('accessToken');
      throw new Error('Authentication expired. Please sign in again.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  /**
   * List all chats for the current user
   */
  static async listChats(limit: number = 100, offset: number = 0): Promise<{
    chats: ChatListItem[];
    totalCount: number;
  }> {
    return this.fetchWithAuth(`/api/chats/list?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get a specific chat by ID
   */
  static async getChat(chatId: string): Promise<Chat> {
    const data = await this.fetchWithAuth(`/api/chats/get/${chatId}`);
    return data.chat;
  }

  /**
   * Alias for getChat for backward compatibility
   */
  static async getChatById(chatId: string): Promise<Chat> {
    return this.getChat(chatId);
  }

  /**
   * Create a new chat
   */
  static async createChat(messages: Message[], title?: string, metadata?: any): Promise<Chat> {
    const data = await this.fetchWithAuth('/api/chats/save', {
      method: 'POST',
      body: JSON.stringify({ messages, title, metadata }),
    });
    // Return full chat object
    return {
      id: data.chatId,
      user_id: '', // Will be filled by server
      title: title || null,
      messages,
      metadata,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }

  /**
   * Update an existing chat
   */
  static async updateChat(
    chatId: string,
    messages?: Message[],
    title?: string,
    metadata?: any,
  ): Promise<void> {
    await this.fetchWithAuth('/api/chats/save', {
      method: 'POST',
      body: JSON.stringify({ id: chatId, messages, title, metadata }),
    });
  }

  /**
   * Delete a chat
   */
  static async deleteChat(chatId: string): Promise<void> {
    await this.fetchWithAuth(`/api/chats/delete/${chatId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!this.getAuthToken();
  }
}

