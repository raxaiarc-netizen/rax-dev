import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { chatStore } from '~/lib/stores/chat';
import { ProfileCard, ProfileCardSkeleton } from './ProfileCard.client';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  credits_daily: number;
  credits_purchased: number;
  credits_total: number;
  subscription_tier?: string;
}

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);
  const [, forceUpdate] = useState({});
  const chatStarted = useStore(chatStore).started;

  // Force re-render on navigation
  const triggerUpdate = () => forceUpdate({});

  // Listen for navigation changes
  useEffect(() => {
    // Listen for navigation changes (browser back/forward)
    const handlePopState = () => {
      triggerUpdate();
    };
    
    // Listen for pushState/replaceState (client-side navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      triggerUpdate();
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      triggerUpdate();
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    fetchUser();
    
    // OPTIMIZED: Refresh user data every 5 minutes instead of 30 seconds
    // This reduces unnecessary API calls while keeping data reasonably fresh
    const interval = setInterval(fetchUser, 5 * 60 * 1000);
    
    // Listen for OAuth token updates (avoid full page reload)
    const handleAuthUpdate = () => {
      fetchUser();
    };
    window.addEventListener('auth-token-updated', handleAuthUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('auth-token-updated', handleAuthUpdate);
    };
  }, []);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        setUser(null);
        setPreviousUserId(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as { user: User };
        
        // OPTIMIZED: Clear previous user data if switching accounts
        if (previousUserId && previousUserId !== data.user.id) {
          setUser(null);
          // Small delay to show skeleton when switching accounts
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        setUser(data.user);
        setPreviousUserId(data.user.id);
      } else {
        // Token invalid, clear it
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);
        setPreviousUserId(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      setPreviousUserId(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    // OPTIMIZED: Clear user data immediately to prevent showing stale data
    setUser(null);
    setPreviousUserId(null);
    setIsLoading(false);
    
    // Clear tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    
    // Redirect to home
    window.location.href = '/';
  };

  // OPTIMIZED: Show skeleton while loading instead of nothing
  if (isLoading) {
    // Check pathname directly
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const onHomePage = currentPath === '/';
    const shouldShow = onHomePage && !chatStarted;
    
    if (shouldShow) {
      return <ProfileCardSkeleton />;
    }
    return null;
  }

  // Check pathname directly in render for instant updates
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const onHomePage = currentPath === '/';

  // Hide profile card if chat has started
  const shouldShow = onHomePage && !chatStarted;

  // Only show profile card on home page when user is authenticated and chat hasn't started
  if (user && shouldShow) {
    return <ProfileCard user={user} onLogout={handleLogout} />;
  }

  // Show buttons only on home page when user is NOT authenticated and chat hasn't started
  if (shouldShow) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => (window.location.href = '/login')}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg transition-all shrink-0 outline-none border-none h-7 px-3 gap-1 text-sm font-medium bg-white/12 text-white/95 hover:bg-white/16 active:bg-white/16 cursor-pointer"
        >
          Sign in
        </button>
        <button
          onClick={() => (window.location.href = '/signup')}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg transition-all shrink-0 outline-none border-none h-7 px-3 gap-1 text-sm font-medium bg-white text-gray-950 hover:bg-white/80 active:bg-white/80 cursor-pointer"
        >
          Sign up
        </button>
      </div>
    );
  }

  // Don't show anything on other pages
  return null;
}
