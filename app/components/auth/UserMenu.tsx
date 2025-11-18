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

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  compact?: boolean; // New prop for header version
}

export function UserMenu({ user, onLogout, compact = false }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('dark');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user.name
    ? user.name[0].toUpperCase()
    : user.email[0].toUpperCase();

  const planName = user.subscription_tier || 'Free';
  const creditsDaily = user.credits_daily ?? 0;
  const creditsTotal = user.credits_total ?? 0;
  const maxDailyCredits = 5; // Default for free tier
  const creditsUsed = maxDailyCredits - creditsDaily;
  const creditsPercentage = creditsUsed > 0 ? ((creditsUsed / maxDailyCredits) * 100).toFixed(0) : '0';
  const creditsLeft = creditsTotal;

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      {compact ? (
        // Compact version for header
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-rax-elements-background-depth-2 rounded-lg border border-rax-elements-borderColor hover:bg-rax-elements-background-depth-3 transition-colors"
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name || user.email} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>{initials}</span>
            )}
          </div>

          {/* Name and Credits */}
          <div className="flex flex-col items-start min-w-0">
            <div className="text-sm font-medium text-rax-elements-textPrimary truncate max-w-[120px]">
              {user.name || 'User'}
            </div>
            <div className="text-xs text-rax-elements-textSecondary">
              {creditsLeft ?? 0} credits
            </div>
          </div>

          {/* Dropdown Icon */}
          <span
            className={`inline-block i-ph:caret-down text-sm text-rax-elements-textSecondary transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      ) : (
        // Full version for sidebar - Combined container with rounded corners
        <div className="bg-gray-950 rounded-xl border border-gray-700/50 overflow-hidden">
          {/* User Info Row */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-3 px-3 py-3 w-full bg-transparent border-none cursor-pointer hover:bg-white/5 transition-colors"
          >
            {/* Avatar - Circle with initial */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-medium text-white flex-shrink-0">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name || user.email} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>

            {/* Name and Plan - Vertical Stack */}
            <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5">
              <div className="text-sm font-semibold text-gray-100 truncate max-w-full">
                {user.name || 'User'}
              </div>
              <div className="text-xs font-medium text-gray-400">
                {planName}
              </div>
            </div>

            {/* Dropdown Icon */}
            <span
              className={`inline-block i-ph:caret-down text-sm text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Divider */}
          <div className="h-px bg-gray-700/50 mx-3" />

          {/* Credits Section */}
          <div className="px-3 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span>Credits remaining</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = '/pricing';
                }}
                className="px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-md transition-colors"
              >
                Upgrade
              </button>
            </div>

            {/* Progress Bar and Credits Left */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden relative">
                <div className="h-full flex">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${creditsPercentage}%` }}
                  />
                </div>
              </div>
              <span className="text-xs font-semibold text-gray-100 whitespace-nowrap min-w-[45px] text-right">
                {creditsLeft ?? 0} left
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-80 rounded-2xl border border-gray-800/70 bg-gray-950 shadow-lg p-4 z-50">
          {/* Profile Section */}
          <div className="flex cursor-pointer items-center gap-3 border-b border-gray-800 pb-4">
            <div className="group relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-full">
              <div className="flex h-full w-full items-center justify-center text-lg font-medium text-white bg-gradient-to-br from-purple-500 to-blue-500">
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
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="inline-block i-ph:camera text-white text-sm" />
              </div>
            </div>
            <div className="overflow-hidden">
              <div className="truncate text-base font-semibold text-white" title={user.name || 'User'}>
                {user.name || 'User'}
              </div>
              <div className="truncate text-sm text-gray-400" title={user.email}>
                {user.email}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="my-3 flex flex-col gap-1">
            <button
              onClick={() => {
                setSettingsOpen(true);
                setIsOpen(false);
              }}
              className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-gray-200 bg-transparent border-none hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <span className="inline-block i-ph:gear h-4 w-4" />
              <span>Settings</span>
            </button>

            <button
              onClick={() => {
                window.location.href = '/pricing';
                setIsOpen(false);
              }}
              className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-gray-200 bg-transparent border-none hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <span className="inline-block i-ph:credit-card h-4 w-4" />
              <span>Plans and Billing</span>
            </button>

            <button
              onClick={() => {
                window.open('https://stackblitz-labs.github.io/rax.ai/', '_blank');
                setIsOpen(false);
              }}
              className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-gray-200 bg-transparent border-none hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <span className="inline-block i-ph:question h-4 w-4" />
              <span>Help Center</span>
            </button>

            <button
              onClick={() => {
                window.location.href = '/redemption';
                setIsOpen(false);
              }}
              className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-gray-200 bg-transparent border-none hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <span className="inline-block i-ph:gift h-4 w-4" />
              <span>Redemption</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-800 pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-sm text-red-500 bg-transparent border-none hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <span className="inline-block i-ph:sign-out h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} user={user} />
    </div>
  );
}


