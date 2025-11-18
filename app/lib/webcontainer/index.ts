import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';
import { cleanStackTrace } from '~/utils/stacktrace';

interface WebContainerContext {
  loaded: boolean;
  pnpmReady: boolean;
  pnpmPromise?: Promise<void>;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
  pnpmReady: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

export let webcontainer: Promise<WebContainer> = new Promise(() => {
  // noop for ssr
});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({
          coep: 'credentialless',
          workdirName: WORK_DIR_NAME,
          forwardPreviewErrors: true, // Enable error forwarding from iframes
        });
      })
      .then(async (webcontainer) => {
        webcontainerContext.loaded = true;

        const { workbenchStore } = await import('~/lib/stores/workbench');

        const response = await fetch('/inspector-script.js');
        const inspectorScript = await response.text();
        await webcontainer.setPreviewScript(inspectorScript);

        // Listen for preview errors
        webcontainer.on('preview-message', (message) => {
          console.log('WebContainer preview message:', message);

          // Handle both uncaught exceptions and unhandled promise rejections
          if (message.type === 'PREVIEW_UNCAUGHT_EXCEPTION' || message.type === 'PREVIEW_UNHANDLED_REJECTION') {
            const isPromise = message.type === 'PREVIEW_UNHANDLED_REJECTION';
            const title = isPromise ? 'Unhandled Promise Rejection' : 'Uncaught Exception';
            workbenchStore.actionAlert.set({
              type: 'preview',
              title,
              description: 'message' in message ? message.message : 'Unknown error',
              content: `Error occurred at ${message.pathname}${message.search}${message.hash}\nPort: ${message.port}\n\nStack trace:\n${cleanStackTrace(message.stack || '')}`,
              source: 'preview',
            });
          }
        });

        // Install pnpm in background - don't block WebContainer ready state
        console.log('[WebContainer] Installing pnpm in background...');
        const pnpmPromise = (async () => {
          try {
            const pnpmInstall = await webcontainer.spawn('npm', ['install', '-g', 'pnpm@9.14.4']);
            await pnpmInstall.exit;
            console.log('[WebContainer] pnpm installed successfully');
            webcontainerContext.pnpmReady = true;

            // Configure pnpm for optimal performance
            await webcontainer.spawn('pnpm', ['config', 'set', 'store-dir', '/tmp/.pnpm-store']);
            await webcontainer.spawn('pnpm', ['config', 'set', 'prefer-offline', 'true']);
            
            // Pre-install common dependencies in background
            console.log('[WebContainer] Pre-caching common dependencies...');
            const commonPackages = [
              'react@^18.2.0',
              'react-dom@^18.2.0',
              'vite@^5.0.0',
              '@vitejs/plugin-react@^4.0.0',
            ];
            
            // Install in background without blocking
            webcontainer.spawn('pnpm', ['add', '-g', ...commonPackages]).then((proc) => {
              proc.exit.then(() => {
                console.log('[WebContainer] Common dependencies cached');
              }).catch(() => {
                console.log('[WebContainer] Failed to cache some dependencies (non-critical)');
              });
            });
          } catch (error) {
            console.warn('[WebContainer] pnpm installation failed, falling back to npm:', error);
            webcontainerContext.pnpmReady = false;
          }
        })();
        
        // Store promise for action-runner to wait if needed
        webcontainerContext.pnpmPromise = pnpmPromise;

        return webcontainer;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
