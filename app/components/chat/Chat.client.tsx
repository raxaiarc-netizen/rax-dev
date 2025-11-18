import { useStore } from '@nanostores/react';
import type { Message } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useAnimate } from 'framer-motion';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cssTransition, toast, ToastContainer } from 'react-toastify';
import { useMessageParser, usePromptEnhancer, useShortcuts } from '~/lib/hooks';
import { chatId as chatIdAtom, description, useChatHistory } from '~/lib/persistence';
import { chatStore } from '~/lib/stores/chat';
import { workbenchStore } from '~/lib/stores/workbench';
import { DEFAULT_MODEL, DEFAULT_PROVIDER, PROMPT_COOKIE_KEY, PROVIDER_LIST } from '~/utils/constants';
import { cubicEasingFn } from '~/utils/easings';
import { createScopedLogger, renderLogger } from '~/utils/logger';
import { BaseChat } from './BaseChat';
import Cookies from 'js-cookie';
import { debounce } from '~/utils/debounce';
import { useSettings } from '~/lib/hooks/useSettings';
import type { ProviderInfo } from '~/types/model';
import { useSearchParams } from '@remix-run/react';
import { createSampler } from '~/utils/sampler';
import { getTemplates, selectStarterTemplate } from '~/utils/selectStarterTemplate';
import { logStore } from '~/lib/stores/logs';
import { streamingState } from '~/lib/stores/streaming';
import { filesToArtifacts } from '~/utils/fileUtils';
import { supabaseConnection } from '~/lib/stores/supabase';
import { defaultDesignScheme, type DesignScheme } from '~/types/design-scheme';
import type { ElementInfo } from '~/components/workbench/Inspector';
import type { TextUIPart, FileUIPart, Attachment } from '@ai-sdk/ui-utils';
import { useMCPStore } from '~/lib/stores/mcp';
import type { LlmErrorAlertType } from '~/types/actions';
import { AuthDialog } from '~/components/auth/AuthDialog';

const toastAnimation = cssTransition({
  enter: 'animated fadeInRight',
  exit: 'animated fadeOutRight',
});

const logger = createScopedLogger('Chat');

export function Chat() {
  renderLogger.trace('Chat');

  const { ready, initialMessages, storeMessageHistory, importChat, exportChat } = useChatHistory();
  const title = useStore(description);
  useEffect(() => {
    workbenchStore.setReloadedMessages(initialMessages.map((m) => m.id));
  }, [initialMessages]);

  return (
    <>
      {ready && (
        <ChatImpl
          description={title}
          initialMessages={initialMessages}
          exportChat={exportChat}
          storeMessageHistory={storeMessageHistory}
          importChat={importChat}
        />
      )}
      <ToastContainer
        closeButton={({ closeToast }) => {
          return (
            <button className="Toastify__close-button" onClick={closeToast}>
              <div className="i-ph:x text-lg" />
            </button>
          );
        }}
        icon={({ type }) => {
          /**
           * @todo Handle more types if we need them. This may require extra color palettes.
           */
          switch (type) {
            case 'success': {
              return <div className="i-ph:check-bold text-rax-elements-icon-success text-2xl" />;
            }
            case 'error': {
              return <div className="i-ph:warning-circle-bold text-rax-elements-icon-error text-2xl" />;
            }
          }

          return undefined;
        }}
        position="bottom-right"
        pauseOnFocusLoss
        transition={toastAnimation}
        autoClose={3000}
      />
    </>
  );
}

const processSampledMessages = createSampler(
  (options: {
    messages: Message[];
    initialMessages: Message[];
    isLoading: boolean;
    parseMessages: (messages: Message[], isLoading: boolean) => void;
    storeMessageHistory: (messages: Message[]) => Promise<void>;
  }) => {
    const { messages, initialMessages, isLoading, parseMessages, storeMessageHistory } = options;
    parseMessages(messages, isLoading);

    if (messages.length > initialMessages.length) {
      storeMessageHistory(messages).catch((error) => {
        console.error('Failed to store message history:', error);
        toast.error(`Failed to save chat history: ${error.message}`);
      });
    }
  },
  2000, // Debounce for 2 seconds to reduce API calls
);

interface ChatProps {
  initialMessages: Message[];
  storeMessageHistory: (messages: Message[]) => Promise<void>;
  importChat: (description: string, messages: Message[]) => Promise<void>;
  exportChat: () => void;
  description?: string;
}

export const ChatImpl = memo(
  ({ description, initialMessages, storeMessageHistory, importChat, exportChat }: ChatProps) => {
    useShortcuts();

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [chatStarted, setChatStarted] = useState(initialMessages.length > 0);
    const lastProcessedMessageId = useRef<string | null>(null);
    const [attachments, setAttachments] = useState<{
      files: File[];
      images: string[];
    }>({ files: [], images: [] });
    const [searchParams, setSearchParams] = useSearchParams();
    const [templateLoading, setTemplateLoading] = useState(false);
    const files = useStore(workbenchStore.files);
    const [designScheme, setDesignScheme] = useState<DesignScheme>(defaultDesignScheme);
    const actionAlert = useStore(workbenchStore.alert);
    const deployAlert = useStore(workbenchStore.deployAlert);
    const supabaseConn = useStore(supabaseConnection);
    const selectedProject = supabaseConn.stats?.projects?.find(
      (project) => project.id === supabaseConn.selectedProjectId,
    );
    const supabaseAlert = useStore(workbenchStore.supabaseAlert);
    const { activeProviders, promptId, autoSelectTemplate, contextOptimizationEnabled } = useSettings();
    const [llmErrorAlert, setLlmErrorAlert] = useState<LlmErrorAlertType | undefined>(undefined);
    
    // API Selector State - 'claude', 'gemini-pro', or 'gemini-flash'
    const [selectedApi, setSelectedApi] = useState<'claude' | 'gemini-pro' | 'gemini-flash'>(() => {
      const savedApi = Cookies.get('selectedApi');
      if (savedApi === 'gemini-pro' || savedApi === 'gemini-flash') {
        return savedApi as 'gemini-pro' | 'gemini-flash';
      }
      return 'claude';
    });
    
    // Model and Provider based on selected API
    const [model, setModel] = useState(() => {
      if (selectedApi === 'gemini-pro') {
        return 'gemini-2.0-flash-exp';
      } else if (selectedApi === 'gemini-flash') {
        return 'gemini-2.0-flash-thinking-exp';
      }
      return DEFAULT_MODEL;
    });
    
    const [provider, setProvider] = useState(() => {
      if (selectedApi === 'gemini-pro' || selectedApi === 'gemini-flash') {
        const geminiProvider = PROVIDER_LIST.find((p) => p.name === 'Google');
        return (geminiProvider || DEFAULT_PROVIDER) as ProviderInfo;
      }
      const anthropicProvider = PROVIDER_LIST.find((p) => p.name === 'Anthropic');
      return (anthropicProvider || DEFAULT_PROVIDER) as ProviderInfo;
    });
    
    // Update model and provider when API selection changes
    useEffect(() => {
      if (selectedApi === 'gemini-pro') {
        const geminiProvider = PROVIDER_LIST.find((p) => p.name === 'Google');
        if (geminiProvider) {
          setProvider(geminiProvider as ProviderInfo);
          setModel('gemini-2.0-flash-exp');
        }
      } else if (selectedApi === 'gemini-flash') {
        const geminiProvider = PROVIDER_LIST.find((p) => p.name === 'Google');
        if (geminiProvider) {
          setProvider(geminiProvider as ProviderInfo);
          setModel('gemini-2.0-flash-thinking-exp');
        }
      } else {
        const anthropicProvider = PROVIDER_LIST.find((p) => p.name === 'Anthropic');
        if (anthropicProvider) {
          setProvider(anthropicProvider as ProviderInfo);
          setModel(DEFAULT_MODEL);
        }
      }
      // Save API selection to cookies once
      Cookies.set('selectedApi', selectedApi);
    }, [selectedApi]);
    const { showChat } = useStore(chatStore);
    const [animationScope, animate] = useAnimate();
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [chatMode, setChatMode] = useState<'discuss' | 'build'>('build');
    const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
    const mcpSettings = useMCPStore((state) => state.settings);
    const currentChatId = useStore(chatIdAtom);
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [pendingMessage, setPendingMessage] = useState<{ event: React.UIEvent; messageInput?: string } | null>(null);

    const {
      messages,
      isLoading,
      input,
      handleInputChange,
      setInput,
      stop,
      append,
      setMessages,
      reload,
      error,
      data: chatData,
      setData,
      addToolResult,
    } = useChat({
      api: '/api/chat',
      headers: (() => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        const headers: Record<string, string> = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
      })(),
      body: {
        apiKeys,
        files,
        promptId,
        contextOptimization: contextOptimizationEnabled,
        chatMode,
        designScheme,
        supabase: {
          isConnected: supabaseConn.isConnected,
          hasSelectedProject: !!selectedProject,
          credentials: {
            supabaseUrl: supabaseConn?.credentials?.supabaseUrl,
            anonKey: supabaseConn?.credentials?.anonKey,
          },
        },
        maxLLMSteps: mcpSettings.maxLLMSteps,
      },
      sendExtraMessageFields: true,
      onError: (e) => {
        setTemplateLoading(false);
        handleError(e, 'chat');
      },
      onFinish: (message, response) => {
        const usage = response.usage;
        setData(undefined);

        if (usage) {
          console.log('Token usage:', usage);
          logStore.logProvider('Chat response completed', {
            component: 'Chat',
            action: 'response',
            model,
            provider: provider.name,
            usage,
            messageLength: message.content.length,
          });
        }

        logger.debug('Finished streaming');
      },
      initialMessages,
      initialInput: Cookies.get(PROMPT_COOKIE_KEY) || '',
    });
    useEffect(() => {
      const prompt = searchParams.get('prompt');

      // console.log(prompt, searchParams, model, provider);

      if (prompt) {
        setSearchParams({});
        runAnimation();
        append({
          role: 'user',
          content: createMessageWithMetadata(prompt),
        });
      }
    }, [model, provider, searchParams]);

    const { enhancingPrompt, promptEnhanced, enhancePrompt, resetEnhancer } = usePromptEnhancer();
    const { parsedMessages, parseMessages } = useMessageParser();

    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;

    useEffect(() => {
      chatStore.setKey('started', initialMessages.length > 0);
    }, []);

    useEffect(() => {
      // Only process if we have new messages
      const lastMessage = messages[messages.length - 1];
      const lastMessageId = lastMessage?.id;
      
      // Always parse messages for UI updates
      parseMessages(messages, isLoading);
      
      // Skip save if no messages or same message as last processed
      if (!lastMessageId || lastMessageId === lastProcessedMessageId.current) {
        return;
      }
      
      // Update the last processed message ID
      lastProcessedMessageId.current = lastMessageId;
      
      // Trigger debounced save
      processSampledMessages({
        messages,
        initialMessages,
        isLoading,
        parseMessages,
        storeMessageHistory,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages, isLoading]); // Only depend on messages and isLoading, not the functions

    const scrollTextArea = () => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    };

    const abort = () => {
      stop();
      chatStore.setKey('aborted', true);
      workbenchStore.abortAllActions();

      logStore.logProvider('Chat response aborted', {
        component: 'Chat',
        action: 'abort',
        model,
        provider: provider.name,
      });
    };

    const handleError = useCallback(
      (error: any, context: 'chat' | 'template' | 'llmcall' = 'chat') => {
        logger.error(`${context} request failed`, error);

        stop();
        setTemplateLoading(false);

        let errorInfo = {
          message: 'An unexpected error occurred',
          isRetryable: true,
          statusCode: 500,
          provider: provider.name,
          type: 'unknown' as const,
          retryDelay: 0,
        };

        if (error.message) {
          try {
            const parsed = JSON.parse(error.message);

            if (parsed.error || parsed.message) {
              errorInfo = { ...errorInfo, ...parsed };
            } else {
              errorInfo.message = error.message;
            }
          } catch {
            errorInfo.message = error.message;
          }
        }

        let errorType: LlmErrorAlertType['errorType'] = 'unknown';
        let title = 'Request Failed';

        if (errorInfo.statusCode === 401 || errorInfo.message.toLowerCase().includes('api key')) {
          errorType = 'authentication';
          title = 'Authentication Error';
        } else if (errorInfo.statusCode === 429 || errorInfo.message.toLowerCase().includes('rate limit')) {
          errorType = 'rate_limit';
          title = 'Rate Limit Exceeded';
        } else if (errorInfo.message.toLowerCase().includes('quota')) {
          errorType = 'quota';
          title = 'Quota Exceeded';
        } else if (errorInfo.statusCode >= 500) {
          errorType = 'network';
          title = 'Server Error';
        }

        logStore.logError(`${context} request failed`, error, {
          component: 'Chat',
          action: 'request',
          error: errorInfo.message,
          context,
          retryable: errorInfo.isRetryable,
          errorType,
          provider: provider.name,
        });

        // Create API error alert
        setLlmErrorAlert({
          type: 'error',
          title,
          description: errorInfo.message,
          provider: provider.name,
          errorType,
        });
        setData([]);
      },
      [provider.name, stop],
    );

    const clearApiErrorAlert = useCallback(() => {
      setLlmErrorAlert(undefined);
    }, []);

    useEffect(() => {
      const textarea = textareaRef.current;

      if (textarea) {
        textarea.style.height = 'auto';

        const scrollHeight = textarea.scrollHeight;

        textarea.style.height = `${Math.min(scrollHeight, TEXTAREA_MAX_HEIGHT)}px`;
        textarea.style.overflowY = scrollHeight > TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden';
      }
    }, [input, textareaRef]);

    const runAnimation = async () => {
      if (chatStarted) {
        return;
      }

      await Promise.all([
        animate('#examples', { opacity: 0, display: 'none' }, { duration: 0.1 }),
        animate('#intro', { opacity: 0, flex: 1 }, { duration: 0.2, ease: cubicEasingFn }),
      ]);

      chatStore.setKey('started', true);

      setChatStarted(true);
    };

    /**
     * Creates a message with model and provider metadata
     * Note: The prefix is required for backend processing and ensures
     * model/provider info travels with each message
     * @param content - The actual message content
     * @returns Formatted message with metadata prefix
     */
    const createMessageWithMetadata = (content: string): string => {
      return `[Model: ${model}]\n\n[Provider: ${provider.name}]\n\n${content}`;
    };

    // Helper function to create message parts array from text and images
    const createMessageParts = (text: string, images: string[] = []): Array<TextUIPart | FileUIPart> => {
      // Create an array of properly typed message parts
      const parts: Array<TextUIPart | FileUIPart> = [
        {
          type: 'text',
          text,
        },
      ];

      // Add image parts if any
      images.forEach((imageData) => {
        // Extract correct MIME type from the data URL
        const mimeType = imageData.split(';')[0].split(':')[1] || 'image/jpeg';

        // Create file part according to AI SDK format
        parts.push({
          type: 'file',
          mimeType,
          data: imageData.replace(/^data:image\/[^;]+;base64,/, ''),
        });
      });

      return parts;
    };

    // Helper function to convert File[] to Attachment[] for AI SDK
    const filesToAttachments = async (files: File[]): Promise<Attachment[] | undefined> => {
      if (files.length === 0) {
        return undefined;
      }

      const attachments = await Promise.all(
        files.map(
          (file) =>
            new Promise<Attachment>((resolve) => {
              const reader = new FileReader();

              reader.onloadend = () => {
                resolve({
                  name: file.name,
                  contentType: file.type,
                  url: reader.result as string,
                });
              };
              reader.readAsDataURL(file);
            }),
        ),
      );

      return attachments;
    };

    const sendMessage = async (_event: React.UIEvent, messageInput?: string) => {
      // Check if user is authenticated
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        // Save the pending message and show auth dialog
        setPendingMessage({ event: _event, messageInput });
        setShowAuthDialog(true);
        return;
      }

      const messageContent = messageInput || input;

      if (!messageContent?.trim()) {
        return;
      }

      if (isLoading) {
        abort();
        return;
      }

      let finalMessageContent = messageContent;

      if (selectedElement) {
        console.log('Selected Element:', selectedElement);

        const elementInfo = `<div class=\"__raxSelectedElement__\" data-element='${JSON.stringify(selectedElement)}'>${JSON.stringify(`${selectedElement.displayText}`)}</div>`;
        finalMessageContent = messageContent + elementInfo;
      }

      runAnimation();

      if (!chatStarted) {
        setTemplateLoading(true);

        const templateResponse = await handleTemplateSelection(finalMessageContent);

        if (templateResponse) {
          const { assistantMessage, userMessage } = templateResponse;
          const userMessageText = createMessageWithMetadata(finalMessageContent);

          // Add automatic npm install and dev server start after template import (hidden from UI)
          const installAction = `
<raxArtifact id="auto-install-${new Date().getTime()}" title="" type="bundled">
<raxAction type="shell">npm install && npm run dev</raxAction>
</raxArtifact>`;
          const modifiedAssistantMessage = assistantMessage + installAction;

          setMessages([
            {
              id: `1-${new Date().getTime()}`,
              role: 'user',
              content: userMessageText,
              parts: createMessageParts(userMessageText, attachments.images),
            },
            {
              id: `2-${new Date().getTime()}`,
              role: 'assistant',
              content: modifiedAssistantMessage,
              annotations: ['templateImport'],
            },
            {
              id: `3-${new Date().getTime()}`,
              role: 'user',
              content: createMessageWithMetadata(userMessage),
              annotations: ['hidden'],
            },
          ]);

          const reloadOptions =
            attachments.files.length > 0
              ? { experimental_attachments: await filesToAttachments(attachments.files) }
              : undefined;

          reload(reloadOptions);
          setInput('');
          Cookies.remove(PROMPT_COOKIE_KEY);

          setAttachments({ files: [], images: [] });

          resetEnhancer();

          textareaRef.current?.blur();
          setTemplateLoading(false);

          return;
        }

        // If autoSelectTemplate is disabled or template selection failed, proceed with normal message
        const userMessageText = createMessageWithMetadata(finalMessageContent);
        const messageAttachments = attachments.files.length > 0 ? await filesToAttachments(attachments.files) : undefined;

        setMessages([
          {
            id: `${new Date().getTime()}`,
            role: 'user',
            content: userMessageText,
            parts: createMessageParts(userMessageText, attachments.images),
            experimental_attachments: messageAttachments,
          },
        ]);
        reload(messageAttachments ? { experimental_attachments: messageAttachments } : undefined);
        setTemplateLoading(false);
        setInput('');
        Cookies.remove(PROMPT_COOKIE_KEY);

        setAttachments({ files: [], images: [] });

        resetEnhancer();

        textareaRef.current?.blur();

        return;
      }

      if (error != null) {
        setMessages(messages.slice(0, -1));
      }

      const modifiedFiles = workbenchStore.getModifiedFiles();

      chatStore.setKey('aborted', false);

      if (modifiedFiles !== undefined) {
        const userUpdateArtifact = filesToArtifacts(modifiedFiles, `${Date.now()}`);
        const messageText = createMessageWithMetadata(`${userUpdateArtifact}${finalMessageContent}`);

        const attachmentOptions =
          attachments.files.length > 0 ? { experimental_attachments: await filesToAttachments(attachments.files) } : undefined;

        append(
          {
            role: 'user',
            content: messageText,
            parts: createMessageParts(messageText, attachments.images),
          },
          attachmentOptions,
        );

        workbenchStore.resetAllFileModifications();
      } else {
        const messageText = createMessageWithMetadata(finalMessageContent);

        const attachmentOptions =
          attachments.files.length > 0 ? { experimental_attachments: await filesToAttachments(attachments.files) } : undefined;

        append(
          {
            role: 'user',
            content: messageText,
            parts: createMessageParts(messageText, attachments.images),
          },
          attachmentOptions,
        );
      }

      setInput('');
      Cookies.remove(PROMPT_COOKIE_KEY);

      setAttachments({ files: [], images: [] });

      resetEnhancer();

      textareaRef.current?.blur();
    };

    /**
     * Handles the change event for the textarea and updates the input state.
     * @param event - The change event from the textarea.
     */
    const onTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleInputChange(event);
    };

    /**
     * Handles template selection and import for new chats
     * @param messageContent - The user's message content
     * @returns Template data if successful, null otherwise
     */
    const handleTemplateSelection = async (messageContent: string) => {
      if (!autoSelectTemplate) {
        return null;
      }

      try {
        const { template, title } = await selectStarterTemplate({
          message: messageContent,
          model,
          provider,
        });

        if (template === 'blank') {
          return null;
        }

        const templateResponse = await getTemplates(template, title);
        
        logStore.logProvider('Template imported successfully', {
          component: 'Chat',
          action: 'template_import',
          template,
          title,
        });
        
        return templateResponse;
      } catch (error: any) {
        console.error('Template selection failed:', error);
        
        logStore.logError('Template selection failed', error, {
          component: 'Chat',
          action: 'template_selection',
          model,
          provider: provider.name,
        });
        
        if (error.message.includes('rate limit')) {
          toast.warning('Rate limit exceeded. Skipping starter template\nContinuing with blank template');
        } else {
          toast.warning('Failed to import starter template\nContinuing with blank template');
        }
        return null;
      }
    };

    /**
     * Debounced function to cache the prompt in cookies.
     * Caches the trimmed value of the textarea input after a delay to optimize performance.
     */
    const debouncedCachePrompt = useCallback(
      debounce((event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const trimmedValue = event.target.value.trim();
        Cookies.set(PROMPT_COOKIE_KEY, trimmedValue, { expires: 30 });
      }, 1000),
      [],
    );

    // Cleanup debounced function on unmount
    useEffect(() => {
      return () => {
        debouncedCachePrompt.cancel();
      };
    }, [debouncedCachePrompt]);

    useEffect(() => {
      const storedApiKeys = Cookies.get('apiKeys');
      const keys: Record<string, string> = storedApiKeys ? JSON.parse(storedApiKeys) : {};
      setApiKeys(keys);
    }, []);

    const handleModelChange = (newModel: string) => {
      setModel(newModel);
      Cookies.set('selectedModel', newModel, { expires: 30 });
    };

    const handleProviderChange = (newProvider: ProviderInfo) => {
      setProvider(newProvider);
      Cookies.set('selectedProvider', newProvider.name, { expires: 30 });
    };

    return (
      <>
        <BaseChat
          ref={animationScope}
          textareaRef={textareaRef}
          input={input}
          showChat={showChat}
          chatStarted={chatStarted}
          isStreaming={isLoading || templateLoading}
          onStreamingChange={(streaming) => {
            streamingState.set(streaming);
          }}
          enhancingPrompt={enhancingPrompt}
          promptEnhanced={promptEnhanced}
          sendMessage={sendMessage}
          model={model}
          setModel={handleModelChange}
          provider={provider}
          setProvider={handleProviderChange}
          providerList={activeProviders}
          selectedApi={selectedApi}
          setSelectedApi={setSelectedApi}
          handleInputChange={(e) => {
            onTextareaChange(e);
            debouncedCachePrompt(e);
          }}
          handleStop={abort}
          description={description}
          importChat={importChat}
          exportChat={exportChat}
          messages={messages.map((message, i) => {
            if (message.role === 'user') {
              return message;
            }

            return {
              ...message,
              content: parsedMessages[i] || '',
            };
          })}
          enhancePrompt={() => {
            enhancePrompt(
              input,
              (input) => {
                setInput(input);
                scrollTextArea();
              },
              model,
              provider,
              apiKeys,
            );
          }}
          uploadedFiles={attachments.files}
          setUploadedFiles={(files) => setAttachments({ ...attachments, files })}
          imageDataList={attachments.images}
          setImageDataList={(images) => setAttachments({ ...attachments, images })}
          actionAlert={actionAlert}
          clearAlert={() => workbenchStore.clearAlert()}
          supabaseAlert={supabaseAlert}
          clearSupabaseAlert={() => workbenchStore.clearSupabaseAlert()}
          deployAlert={deployAlert}
          clearDeployAlert={() => workbenchStore.clearDeployAlert()}
          llmErrorAlert={llmErrorAlert}
          clearLlmErrorAlert={clearApiErrorAlert}
          data={chatData}
          chatMode={chatMode}
          setChatMode={setChatMode}
          append={append}
          designScheme={designScheme}
          setDesignScheme={setDesignScheme}
          selectedElement={selectedElement}
          setSelectedElement={setSelectedElement}
          addToolResult={addToolResult}
        />
        <AuthDialog
          isOpen={showAuthDialog}
          onClose={() => {
            setShowAuthDialog(false);
            setPendingMessage(null);
          }}
          onSuccess={() => {
            // After successful login, send the pending message if it exists
            if (pendingMessage) {
              const { event, messageInput } = pendingMessage;
              setPendingMessage(null);
              // Send the message after a small delay to ensure auth state is updated
              setTimeout(() => {
                sendMessage(event, messageInput);
              }, 100);
            }
          }}
        />
      </>
    );
  },
);
