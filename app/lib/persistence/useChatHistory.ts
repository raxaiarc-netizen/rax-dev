import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';
import { webcontainer } from '~/lib/webcontainer';
import { detectProjectCommands, createCommandActionsString } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';
import { ChatAPI } from '~/lib/api/chatApi';

export interface IChatMetadata {
  gitBranch?: string;
  netlifySiteId?: string;
}

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);

export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();
  const [searchParams] = useSearchParams();

  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();
  const lastSavedMessageCount = useRef<number>(0);
  const isSavingRef = useRef<boolean>(false);

  useEffect(() => {
    // Optional: Check authentication but don't block
    const isAuthenticated = ChatAPI.isAuthenticated();
    if (!isAuthenticated) {
      console.warn('Not authenticated - some features may be limited');
    }

    if (mixedId) {
      // Load chat from cloud
      ChatAPI.getChatById(mixedId)
        .then(async (chat) => {
          if (chat && chat.messages && chat.messages.length > 0) {
            // Parse snapshot from metadata if available
            const snapshot = chat.metadata?.snapshot as Snapshot | undefined;
            const validSnapshot = snapshot || { chatIndex: '', files: {} };
            const summary = validSnapshot.summary;

            const rewindId = searchParams.get('rewindTo');
            let startingIdx = -1;
            const endingIdx = rewindId
              ? chat.messages.findIndex((m) => m.id === rewindId) + 1
              : chat.messages.length;
            const snapshotIndex = chat.messages.findIndex((m) => m.id === validSnapshot.chatIndex);

            if (snapshotIndex >= 0 && snapshotIndex < endingIdx) {
              startingIdx = snapshotIndex;
            }

            if (snapshotIndex > 0 && chat.messages[snapshotIndex].id == rewindId) {
              startingIdx = -1;
            }

            let filteredMessages = chat.messages.slice(startingIdx + 1, endingIdx);
            let archivedMessages: Message[] = [];

            if (startingIdx >= 0) {
              archivedMessages = chat.messages.slice(0, startingIdx + 1);
            }

            setArchivedMessages(archivedMessages);

            if (startingIdx > 0) {
              const files = Object.entries(validSnapshot?.files || {})
                .map(([key, value]) => {
                  if (value?.type !== 'file') {
                    return null;
                  }

                  return {
                    content: value.content,
                    path: key,
                  };
                })
                .filter((x): x is { content: string; path: string } => !!x);
              const projectCommands = await detectProjectCommands(files);

              const commandActionsString = createCommandActionsString(projectCommands);

              filteredMessages = [
                {
                  id: generateId(),
                  role: 'user',
                  content: `Restore project from snapshot`,
                  annotations: ['no-store', 'hidden'],
                },
                {
                  id: chat.messages[snapshotIndex].id,
                  role: 'assistant',
                  content: `Rax Restored your chat from a snapshot. You can revert this message to load the full chat history.
                  <raxArtifact id="restored-project-setup" title="Restored Project & Setup" type="bundled">
                  ${Object.entries(snapshot?.files || {})
                    .map(([key, value]) => {
                      if (value?.type === 'file') {
                        return `
                      <raxAction type="file" filePath="${key}">
${value.content}
                      </raxAction>
                      `;
                      } else {
                        return ``;
                      }
                    })
                    .join('\n')}
                  ${commandActionsString} 
                  </raxArtifact>
                  `,
                  annotations: [
                    'no-store',
                    ...(summary
                      ? [
                          {
                            chatId: chat.messages[snapshotIndex].id,
                            type: 'chatSummary',
                            summary,
                          } satisfies ContextAnnotation,
                        ]
                      : []),
                  ],
                },
                ...filteredMessages,
              ];
              restoreSnapshot(mixedId, snapshot);
            }

            setInitialMessages(filteredMessages);
            setUrlId(chat.id);
            description.set(chat.title || undefined);
            chatId.set(chat.id);
            
            // Track loaded messages to prevent immediate redundant save
            lastSavedMessageCount.current = chat.messages.length;
            
            // Parse metadata if it's a string
            const parsedMetadata = typeof chat.metadata === 'string' 
              ? JSON.parse(chat.metadata) 
              : chat.metadata;
            chatMetadata.set(parsedMetadata as IChatMetadata);
          } else {
            navigate('/', { replace: true });
          }

          setReady(true);
        })
        .catch((error) => {
          console.error(error);
          logStore.logError('Failed to load chat from cloud', error);
          toast.error('Failed to load chat: ' + error.message);
          navigate('/', { replace: true });
        });
    } else {
      // New chat
      setReady(true);
    }
  }, [mixedId, navigate, searchParams]);

  const takeSnapshot = useCallback(
    (chatIdx: string, files: FileMap, _chatId?: string | undefined, chatSummary?: string) => {
      const snapshot: Snapshot = {
        chatIndex: chatIdx,
        files,
        summary: chatSummary,
      };

      // Update metadata in memory only - will be saved with the next chat save
      const currentMetadata = chatMetadata.get() || {};
      const updatedMetadata = {
        ...currentMetadata,
        snapshot,
      };
      chatMetadata.set(updatedMetadata);
    },
    [],
  );

  const restoreSnapshot = useCallback(async (id: string, snapshot?: Snapshot) => {
    const container = await webcontainer;

    const validSnapshot = snapshot || { chatIndex: '', files: {} };

    if (!validSnapshot?.files) {
      return;
    }

    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (key.startsWith(container.workdir)) {
        key = key.replace(container.workdir, '');
      }

      if (value?.type === 'folder') {
        await container.fs.mkdir(key, { recursive: true });
      }
    });
    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (value?.type === 'file') {
        if (key.startsWith(container.workdir)) {
          key = key.replace(container.workdir, '');
        }

        await container.fs.writeFile(key, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
      }
    });
  }, []);

  const storeMessageHistory = useCallback(async (messages: Message[]) => {
    if (messages.length === 0) {
      return;
    }

    const { firstArtifact } = workbenchStore;
    messages = messages.filter((m) => !m.annotations?.includes('no-store'));

    let _urlId = urlId;

    if (!urlId && firstArtifact?.id) {
      _urlId = firstArtifact.id;
      navigateChat(_urlId);
      setUrlId(_urlId);
    }

    let chatSummary: string | undefined = undefined;
    const lastMessage = messages[messages.length - 1];

    if (lastMessage.role === 'assistant') {
      const annotations = lastMessage.annotations as JSONValue[];
      const filteredAnnotations = (annotations?.filter(
        (annotation: JSONValue) =>
          annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
      ) || []) as { type: string; value: any } & { [key: string]: any }[];

      if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
        chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
      }
    }

    takeSnapshot(messages[messages.length - 1].id, workbenchStore.files.get(), _urlId, chatSummary);

    if (!description.get() && firstArtifact?.title) {
      description.set(firstArtifact?.title);
    }

    const allMessages = [...archivedMessages, ...messages];
    const currentMessageCount = allMessages.length;

    // Skip if already saving or no new messages
    if (isSavingRef.current || currentMessageCount === lastSavedMessageCount.current) {
      return;
    }

    let finalChatId = chatId.get();

    // Create new chat if this is the first message
    if (initialMessages.length === 0 && !finalChatId) {
      try {
        isSavingRef.current = true;
        const newChat = await ChatAPI.createChat(allMessages, description.get() || undefined, chatMetadata.get());
        finalChatId = newChat.id;
        chatId.set(finalChatId);
        lastSavedMessageCount.current = currentMessageCount;

        if (!urlId) {
          navigateChat(finalChatId);
        }
      } catch (error: any) {
        console.error('Failed to create chat:', error);
        toast.error('Failed to create chat: ' + error.message);
      } finally {
        isSavingRef.current = false;
      }
      return;
    }

    if (!finalChatId) {
      console.error('Cannot save messages, chat ID is not set.');
      toast.error('Failed to save chat messages: Chat ID missing.');
      return;
    }

    try {
      isSavingRef.current = true;
      await ChatAPI.updateChat(
        finalChatId,
        allMessages,
        description.get() || undefined,
        chatMetadata.get(),
      );
      lastSavedMessageCount.current = currentMessageCount;
      console.log('Chat saved to cloud successfully');
    } catch (error: any) {
      console.error('Failed to save chat to cloud:', error);
      toast.error('Failed to save chat: ' + error.message);
    } finally {
      isSavingRef.current = false;
    }
  }, [archivedMessages, urlId, initialMessages, takeSnapshot]);

  return {
    ready: !mixedId || ready,
    initialMessages,
    updateChatMestaData: async (metadata: IChatMetadata) => {
      const id = chatId.get();

      if (!id) {
        return;
      }

      try {
        await ChatAPI.updateChat(id, undefined, undefined, metadata);
        chatMetadata.set(metadata);
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory,
    duplicateCurrentChat: async (listItemId: string) => {
      if (!mixedId && !listItemId) {
        return;
      }

      try {
        const sourceId = mixedId || listItemId;
        const sourceChat = await ChatAPI.getChatById(sourceId);
        
        if (!sourceChat) {
          throw new Error('Source chat not found');
        }

        const newChat = await ChatAPI.createChat(
          sourceChat.messages,
          `${sourceChat.title || 'Untitled'} (Copy)`,
          sourceChat.metadata as IChatMetadata | undefined,
        );

        navigate(`/chat/${newChat.id}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },
    importChat: async (description: string, messages: Message[], metadata?: IChatMetadata) => {
      try {
        const newChat = await ChatAPI.createChat(messages, description, metadata);
        window.location.href = `/chat/${newChat.id}`;
        toast.success('Chat imported successfully');
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to import chat: ' + error.message);
        } else {
          toast.error('Failed to import chat');
        }
      }
    },
    exportChat: async (id = urlId) => {
      if (!id) {
        return;
      }

      try {
        const chat = await ChatAPI.getChatById(id);
        
        if (!chat) {
          throw new Error('Chat not found');
        }

        const chatData = {
          messages: chat.messages,
          description: chat.title,
          exportDate: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        toast.error('Failed to export chat');
        console.error(error);
      }
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
