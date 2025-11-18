import { memo, useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { workbenchStore } from '~/lib/stores/workbench';
import { vercelConnection } from '~/lib/stores/vercel';
import { chatId } from '~/lib/persistence/useChatHistory';

interface PreviewSimpleProps {
  testMode?: boolean;
}

export const PreviewSimple = memo(({ testMode = false }: PreviewSimpleProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeUrl, setIframeUrl] = useState<string>('');
  const [useVercel, setUseVercel] = useState(false);
  const [vercelUrl, setVercelUrl] = useState<string | null>(null);
  const [isLoadingVercel, setIsLoadingVercel] = useState(false);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[0];
  const connection = useStore(vercelConnection);
  const currentChatId = useStore(chatId);

  // Fetch Vercel deployment URL
  useEffect(() => {
    async function fetchVercelDeployment() {
      if (!connection.token || !currentChatId) {
        setVercelUrl(null);
        return;
      }

      const projectId = localStorage.getItem(`vercel-project-${currentChatId}`);
      if (!projectId) {
        setVercelUrl(null);
        return;
      }

      setIsLoadingVercel(true);

      try {
        const projectsResponse = await fetch('https://api.vercel.com/v9/projects', {
          headers: {
            Authorization: `Bearer ${connection.token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!projectsResponse.ok) {
          throw new Error(`Failed to fetch projects: ${projectsResponse.status}`);
        }

        const projectsData = (await projectsResponse.json()) as any;
        const projects = projectsData.projects || [];

        const chatNumber = currentChatId.split('-')[0];
        const project = projects.find((p: { name: string }) => p.name.includes(`rax-ai-${chatNumber}`));

        if (project) {
          const deploymentsResponse = await fetch(
            `https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${connection.token}`,
                'Content-Type': 'application/json',
              },
            },
          );

          if (deploymentsResponse.ok) {
            const deploymentsData = (await deploymentsResponse.json()) as any;

            if (deploymentsData.deployments && deploymentsData.deployments.length > 0) {
              setVercelUrl(`https://${deploymentsData.deployments[0].url}`);
              console.log('[PreviewSimple] Vercel URL:', `https://${deploymentsData.deployments[0].url}`);
              return;
            }
          }
        }
      } catch (err) {
        console.error('[PreviewSimple] Error fetching Vercel deployment:', err);
        setVercelUrl(null);
      } finally {
        setIsLoadingVercel(false);
      }
    }

    fetchVercelDeployment();
  }, [connection.token, currentChatId]);

  // Set iframe URL based on mode
  useEffect(() => {
    if (testMode) {
      setIframeUrl('https://rax-ai-11-1761116351470.vercel.app/');
      console.log('[PreviewSimple] Test mode - using Vercel URL');
    } else if (useVercel && vercelUrl) {
      setIframeUrl(vercelUrl);
      console.log('[PreviewSimple] Using Vercel URL:', vercelUrl);
    } else if (activePreview?.baseUrl) {
      setIframeUrl(activePreview.baseUrl);
      console.log('[PreviewSimple] Using WebContainer URL:', activePreview.baseUrl);
    } else {
      setIframeUrl('');
      console.log('[PreviewSimple] No URL available');
    }
  }, [activePreview?.baseUrl, testMode, useVercel, vercelUrl]);

  // Log when iframe loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('[PreviewSimple] Iframe loaded successfully');
    };

    const handleError = (e: ErrorEvent) => {
      console.error('[PreviewSimple] Iframe error:', e);
    };

    iframe.addEventListener('load', handleLoad);
    window.addEventListener('error', handleError);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <div className="w-full h-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-2 border-b border-gray-700 text-white text-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold">Preview</span>
          
          {!testMode && vercelUrl && (
            <button
              onClick={() => setUseVercel(!useVercel)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                useVercel
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {useVercel ? '✓ Vercel' : 'WebContainer'}
            </button>
          )}
          
          {isLoadingVercel && (
            <span className="text-gray-400 text-xs">Loading Vercel...</span>
          )}
          
          {testMode && <span className="text-yellow-400">(Test Mode)</span>}
          
          {iframeUrl && (
            <span className="text-gray-400 text-xs truncate ml-auto max-w-md">{iframeUrl}</span>
          )}
        </div>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 relative bg-white">
        {iframeUrl ? (
          <iframe
            ref={iframeRef}
            title="preview"
            src={iframeUrl}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-forms allow-popups allow-modals allow-same-origin"
            allow="cross-origin-isolated; storage-access"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">📭</div>
              <div>No preview available</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

PreviewSimple.displayName = 'PreviewSimple';
