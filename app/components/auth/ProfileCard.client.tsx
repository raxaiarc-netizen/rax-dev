import { useState, useRef, useEffect } from 'react';
import { SettingsDialog } from '~/components/settings/SettingsDialog';

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

interface ProfileCardProps {
  user: User;
  onLogout: () => void;
}

// Skeleton loading component for ProfileCard
export function ProfileCardSkeleton() {
  return (
    <div className="relative" style={{ zIndex: 1000 }}>
      <div
        className="bg-black/40 backdrop-blur-2xl border-t border-l border-r border-b border-white/10"
        style={{
          borderBottomLeftRadius: '20px',
          borderBottomRightRadius: '20px',
          borderTopLeftRadius: '0',
          borderTopRightRadius: '0',
          position: 'relative',
          zIndex: 1001,
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 w-full bg-white/[0.08]"
          style={{
            borderTopLeftRadius: '0',
            borderTopRightRadius: '0',
            borderBottomLeftRadius: '20px',
            borderBottomRightRadius: '20px',
          }}
        >
          {/* Avatar skeleton */}
          <div className="w-9 h-9 rounded-full bg-white/10 animate-pulse flex-shrink-0" />
          
          {/* User info skeleton */}
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="h-3.5 w-20 bg-white/10 rounded animate-pulse" />
            <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
          </div>
          
          {/* Credits skeleton */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <div className="h-3 w-12 bg-white/10 rounded animate-pulse" />
          </div>
          
          {/* Icon skeleton */}
          <div className="w-4 h-4 bg-white/10 rounded animate-pulse flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}

export function ProfileCard({ user, onLogout }: ProfileCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  const planName = user.subscription_tier === 'pro' ? 'Pro' : 'Free';
  const creditsTotal = user.credits_total ?? 0;

  return (
    <div className="relative" ref={cardRef} style={{ zIndex: 1000 }}>
      {/* Main Card Container */}
      <div
        className="bg-black/40 backdrop-blur-2xl border-t border-l border-r border-white/10"
        style={{
          borderBottom: isOpen ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          borderBottomLeftRadius: isOpen ? '0' : '20px',
          borderBottomRightRadius: isOpen ? '0' : '20px',
          borderTopLeftRadius: '0',
          borderTopRightRadius: '0',
          position: 'relative',
          zIndex: 1001,
          transition: 'border 0.15s ease-out',
        }}
      >
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-3 w-full bg-white/[0.08] hover:bg-white/[0.12] cursor-pointer border-none backdrop-blur-md"
          style={{
            borderTopLeftRadius: '0',
            borderTopRightRadius: '0',
            borderBottomLeftRadius: isOpen ? '0' : '20px',
            borderBottomRightRadius: isOpen ? '0' : '20px',
            transition: 'background-color 0.2s ease-out',
          }}
        >
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 overflow-hidden">
            {user.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt={user.name || user.email} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* User Info */}
          <div className="flex flex-col items-start min-w-0 flex-1">
            <div className="text-sm font-medium text-white/95 truncate max-w-[120px]">
              {user.name || 'User'}
            </div>
            <div className="text-xs text-white/60">
              {planName}
            </div>
          </div>

          {/* Credits Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <span className="text-xs text-white/60">Credits:</span>
            <span className="text-sm font-semibold text-white">{creditsTotal}</span>
          </div>

          {/* Dropdown Icon */}
          <span
            className={`inline-block i-ph:caret-down text-sm text-white/60 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Content - Seamlessly Connected, opens downward */}
        <div 
          className="absolute bg-black/40 backdrop-blur-2xl border-l border-r border-b border-white/10 overflow-hidden"
          style={{
            top: '100%',
            left: '-1px',
            right: '-1px',
            borderBottomLeftRadius: '20px',
            borderBottomRightRadius: '20px',
            zIndex: 1000,
            maxHeight: isOpen ? 'calc(100vh - 120px)' : '0',
            opacity: isOpen ? 1 : 0,
            pointerEvents: isOpen ? 'auto' : 'none',
            transition: 'max-height 0.25s ease-out, opacity 0.2s ease-out',
          }}
        >
            <div 
              className="overflow-y-auto modern-scrollbar"
              style={{ 
                maxHeight: 'calc(100vh - 120px)',
              }}
            >
              {/* Full Profile Section */}
              <div 
                className="p-4 bg-white/[0.12] border-b border-white/10"
                style={{ boxShadow: 'none' }}
              >
              <div className="flex items-center gap-3 mb-3">
                {/* Larger Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 overflow-hidden">
                  {user.avatar_url ? (
                    <img 
                      src={user.avatar_url} 
                      alt={user.name || user.email} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                </div>

                {/* Full User Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate">
                    {user.name || 'User'}
                  </div>
                  <div className="text-xs text-white/60 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Plan Badge and Upgrade */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/5 rounded-lg border border-white/10">
                  <span className="text-xs font-medium text-white/90">{planName} Plan</span>
                </div>
                {planName === 'Free' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = '/pricing';
                    }}
                    className="text-xs font-medium text-blue-400 hover:text-blue-300 bg-transparent border-none transition-colors"
                  >
                    Upgrade →
                  </button>
                )}
              </div>
            </div>

             {/* Credits Progress Section */}
             <div className="p-4 bg-white/[0.07] border-b border-white/10 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-white/60">Credits Remaining</span>
                <span className="text-xs font-semibold text-white">{creditsTotal} / {user.credits_daily + user.credits_purchased}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((creditsTotal / Math.max(user.credits_daily + user.credits_purchased, 1)) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>

             {/* Menu Items */}
             <div className="p-2 bg-white/5 backdrop-blur-md">
              <button
                onClick={() => {
                  setSettingsOpen(true);
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/90 bg-transparent border-none hover:bg-white/5 transition-all cursor-pointer"
              >
                <span className="inline-block i-ph:gear text-base" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  window.location.href = '/pricing';
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/90 bg-transparent border-none hover:bg-white/5 transition-all cursor-pointer"
              >
                <span className="inline-block i-ph:credit-card text-base" />
                <span>Plans & Billing</span>
              </button>

              <button
                onClick={() => {
                  window.location.href = '/redemption';
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/90 bg-transparent border-none hover:bg-white/5 transition-all cursor-pointer"
              >
                <span className="inline-block i-ph:gift text-base" />
                <span>Redeem Credits</span>
              </button>

              <button
                onClick={() => {
                  window.open('https://stackblitz-labs.github.io/rax.ai/', '_blank');
                  setIsOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/90 bg-transparent border-none hover:bg-white/5 transition-all cursor-pointer"
              >
                <span className="inline-block i-ph:question text-base" />
                <span>Help Center</span>
              </button>
            </div>

              {/* Sign Out */}
              <div className="p-2 border-t border-white/10 bg-white/5 backdrop-blur-md">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onLogout();
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 bg-transparent border-none hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  <span className="inline-block i-ph:sign-out text-base" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          </div>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} />
    </div>
  );
}

