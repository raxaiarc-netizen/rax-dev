import { json, redirect, type MetaFunction, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { useStore } from '@nanostores/react';
import { Suspense, lazy, useState, useEffect } from 'react';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import { chatStore } from '~/lib/stores/chat';
import { getSessionFromRequest } from '~/lib/auth/session.server';

// OPTIMIZED: Lazy load StarfieldBackground - it's heavy and not critical for initial render
const StarfieldBackground = lazy(() => 
  import('~/components/ui/StarfieldBackground').then(module => ({ 
    default: module.StarfieldBackground 
  }))
);

export const meta: MetaFunction = () => {
  return [{ title: 'Rax' }, { name: 'description', content: 'Talk with Rax, an AI assistant from StackBlitz' }];
};

// OPTIMIZED: Add cache headers to the loader
export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const env = context.cloudflare.env as any;
  const db = env.DB;

  // Optional: Check authentication but don't redirect
  let user = null;
  if (db && env.JWT_SECRET) {
    try {
      const sessionData = await getSessionFromRequest(request, db, env.JWT_SECRET);
      if (sessionData) {
        user = sessionData.user;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  }

  return json(
    { user },
    {
      headers: {
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    }
  );
};

// Simple loading skeleton component
const LoadingSkeleton = () => (
  <div className="flex flex-col h-full w-full relative bg-black">
    <div className="relative z-10 flex flex-col h-full w-full" style={{ paddingTop: 'var(--header-height)' }}>
      {/* Header skeleton */}
      <div className="flex items-center px-4 h-[var(--header-height)] fixed top-0 left-0 w-full bg-[#1a1b1c]">
        <div className="w-20 h-8 bg-gray-800 rounded animate-pulse" />
      </div>
      {/* Content skeleton */}
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">Loading...</div>
      </div>
    </div>
  </div>
);

/**
 * Landing page component for Rax
 * OPTIMIZED: Deferred loading of heavy components with loading skeleton
 */
export default function Index() {
  const { started: chatStarted } = useStore(chatStore);
  const [showBackground, setShowBackground] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // OPTIMIZED: Only load StarfieldBackground after initial render
  useEffect(() => {
    const timer = setTimeout(() => setShowBackground(true), 100);
    const loadTimer = setTimeout(() => setIsInitialLoad(false), 50);
    return () => {
      clearTimeout(timer);
      clearTimeout(loadTimer);
    };
  }, []);

  // Show minimal skeleton during very first render
  if (isInitialLoad) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="flex flex-col h-full w-full relative">
      {showBackground && (
        <div className={chatStarted ? 'opacity-0 pointer-events-none' : 'opacity-100'} style={{ transition: 'opacity 0.5s ease-out' }}>
          <Suspense fallback={<div />}>
            <StarfieldBackground />
          </Suspense>
        </div>
      )}
      <div className="relative z-10 flex flex-col h-full w-full" style={{ backgroundColor: chatStarted ? '#191a1a' : undefined, paddingTop: 'var(--header-height)' }}>
        <Header />
        <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
      </div>
    </div>
  );
}
