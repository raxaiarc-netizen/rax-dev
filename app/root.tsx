import { useStore } from '@nanostores/react';
import type { LinksFunction } from '@remix-run/cloudflare';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react';
import tailwindReset from '@unocss/reset/tailwind-compat.css?url';
import { themeStore } from './lib/stores/theme';
import { stripIndents } from './utils/stripIndent';
import { createHead } from 'remix-island';
import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ClientOnly } from 'remix-utils/client-only';

import reactToastifyStyles from 'react-toastify/dist/ReactToastify.css?url';
import globalStyles from './styles/index.scss?url';
import xtermStyles from '@xterm/xterm/css/xterm.css?url';

import 'virtual:uno.css';

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    href: '/favicon.svg',
    type: 'image/svg+xml',
  },
  // Preload critical CSS to avoid render blocking
  { rel: 'preload', href: globalStyles, as: 'style' },
  { rel: 'stylesheet', href: reactToastifyStyles },
  { rel: 'stylesheet', href: tailwindReset },
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'stylesheet', href: xtermStyles },
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    // OPTIMIZED: Add font-display: swap for faster initial render
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  },
];

const inlineThemeCode = stripIndents`
  setTutorialKitTheme();

  function setTutorialKitTheme() {
    let theme = localStorage.getItem('rax_theme');

    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.querySelector('html')?.setAttribute('data-theme', theme);
  }
`;

export const Head = createHead(() => (
  <>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <Meta />
    <Links />
    <style dangerouslySetInnerHTML={{ __html: `
      html, body, #root {
        background-color: #000000 !important;
        margin: 0;
        padding: 0;
      }
      html {
        background: #000000 !important;
      }
      body {
        background: #000000 !important;
      }
      /* Prevent white flash during page transitions */
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: #000000;
        z-index: -1;
        pointer-events: none;
      }
    ` }} />
    <script dangerouslySetInnerHTML={{ __html: inlineThemeCode }} />
  </>
));

export function Layout({ children }: { children: React.ReactNode }) {
  const theme = useStore(themeStore);

  useEffect(() => {
    document.querySelector('html')?.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <ClientOnly>{() => <DndProvider backend={HTML5Backend}>{children}</DndProvider>}</ClientOnly>
      <ScrollRestoration />
      <Scripts />
    </>
  );
}

import { logStore } from './lib/stores/logs';
import { AuthProvider } from './lib/hooks/useAuth.tsx';

export default function App() {
  const theme = useStore(themeStore);
  const [isAuthCallback, setIsAuthCallback] = useState(false);

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    const error = url.searchParams.get('error');

    if (token) {
      // Show loading state during OAuth processing
      setIsAuthCallback(true);
      
      // Store the access token
      localStorage.setItem('accessToken', token);
      
      // Clean up URL by removing the token parameter
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
      
      // OPTIMIZED: Dispatch custom event instead of full page reload
      // This triggers AuthButton to refresh without reloading the entire page
      window.dispatchEvent(new CustomEvent('auth-token-updated'));
      
      // For safety, also trigger a location change event
      window.dispatchEvent(new Event('popstate'));
      
      // Remove loading state after a short delay
      setTimeout(() => setIsAuthCallback(false), 500);
    } else if (error) {
      // Handle OAuth errors
      console.error('OAuth error:', error);
      const errorMessage = url.searchParams.get('message');
      if (errorMessage) {
        console.error('Error details:', errorMessage);
      }
      // Clean up URL
      url.searchParams.delete('error');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.toString());
    }

    logStore.logSystem('Application initialized', {
      theme,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });

    // OPTIMIZED: Defer debug logger initialization to after page is interactive
    // This prevents blocking the initial render
    const timeoutId = setTimeout(() => {
      import('./utils/debugLogger')
        .then(({ debugLogger }) => {
          /*
           * The debug logger initializes itself and starts disabled by default
           * It will only start capturing when enableDebugMode() is called
           */
          const status = debugLogger.getStatus();
          logStore.logSystem('Debug logging ready', {
            initialized: status.initialized,
            capturing: status.capturing,
            enabled: status.enabled,
          });
        })
        .catch((error) => {
          logStore.logError('Failed to initialize debug logging', error);
        });
    }, 2000); // Wait 2 seconds after page load

    return () => clearTimeout(timeoutId);
  }, []);

  // Show minimal loading during OAuth callback processing
  if (isAuthCallback) {
    return (
      <Layout>
        <AuthProvider>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#000000',
          }}>
            <div style={{
              color: '#fff',
              fontSize: '18px',
              fontFamily: 'Inter, sans-serif',
            }}>
              Completing sign in...
            </div>
          </div>
        </AuthProvider>
      </Layout>
    );
  }

  return (
    <Layout>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </Layout>
  );
}
