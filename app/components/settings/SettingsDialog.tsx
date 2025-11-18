import { useState } from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';
import { ProfileSettings, IntegrationsSettings, BillingSettings, FeedbackSettings } from './sections';

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

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  user: User;
}

type SettingsSection = 'profile' | 'integrations' | 'billing' | 'feedback';

interface SidebarItem {
  id: SettingsSection;
  label: string;
  icon: string;
}

interface SidebarGroup {
  category: string;
  items: SidebarItem[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    category: 'General',
    items: [
      { id: 'integrations', label: 'Integrations', icon: 'i-ph:plug' },
    ],
  },
  {
    category: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: 'i-ph:user-circle' },
      { id: 'billing', label: 'Plans and Billing', icon: 'i-ph:credit-card' },
    ],
  },
  {
    category: 'Support',
    items: [
      { id: 'feedback', label: 'Feedback', icon: 'i-ph:chat-circle-dots' },
    ],
  },
];

export function SettingsDialog({ open, onClose, user }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return <ProfileSettings user={user} />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'billing':
        return <BillingSettings user={user} />;
      case 'feedback':
        return <FeedbackSettings />;
      default:
        return null;
    }
  };

  const getSectionTitle = () => {
    for (const group of sidebarGroups) {
      const item = group.items.find((item) => item.id === activeSection);
      if (item) return item.label;
    }
    return 'Settings';
  };

  return (
    <RadixDialog.Root open={open} onOpenChange={onClose}>
      <RadixDialog.Portal>
        <AnimatePresence>
          {open && (
            <>
              {/* Backdrop with blur and fade in/out */}
              <RadixDialog.Overlay asChild forceMount>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="fixed inset-0 z-[9998] bg-black/65 backdrop-blur-sm"
                />
              </RadixDialog.Overlay>

              {/* Dialog Content with scale and fade */}
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <RadixDialog.Content asChild forceMount aria-describedby={undefined}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className={classNames(
                      'overflow-hidden p-0',
                      'w-full md:max-w-[700px] lg:max-w-[900px]',
                      'h-[90vh] md:max-h-[600px]',
                      'bg-[#1a1a1a] rounded-2xl',
                      'border border-gray-800',
                      'shadow-2xl',
                      'flex',
                      'focus:outline-none',
                    )}
                  >
          <RadixDialog.Title className="sr-only">Settings</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">
            Customize your settings here.
          </RadixDialog.Description>

          {/* Sidebar - Hidden on mobile */}
          <div className="hidden md:flex w-[200px] lg:w-[240px] bg-[#0f0f0f] border-r border-gray-800 flex-col">
            {/* Sidebar Header */}
            <div className="px-2 pt-6 pb-4">
              <span className="text-sm font-medium text-white pl-2">Settings</span>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="w-full flex flex-col gap-4 px-2">
                {sidebarGroups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {/* Category Header */}
                    <div className="text-xs text-gray-500 px-2 mb-2">
                      {group.category}
                    </div>

                    {/* Category Items */}
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveSection(item.id)}
                          className={classNames(
                            'w-full flex items-center gap-2 py-2.5 px-2 rounded-lg',
                            'text-sm transition-all duration-200',
                            'bg-transparent border-none cursor-pointer text-left',
                            activeSection === item.id
                              ? 'bg-white/10 font-medium text-white'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5',
                          )}
                        >
                          <span className={classNames(item.icon, 'w-4 h-4 flex-shrink-0')} />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <main className="flex flex-1 flex-col overflow-hidden">
            {/* Header with breadcrumb and close button */}
            <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-gray-800 px-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Settings</span>
                <span className="text-gray-600">/</span>
                <span className="text-sm text-white font-medium">{getSectionTitle()}</span>
              </div>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className={classNames(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  'text-gray-400 hover:text-white',
                  'hover:bg-gray-800 transition-all duration-200',
                  'active:scale-95',
                )}
              >
                <span className="i-ph:x w-5 h-5" />
              </button>
            </header>

            {/* Scrollable Content Area */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.15, ease: 'easeInOut' }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
                  </motion.div>
                </RadixDialog.Content>
              </div>
            </>
          )}
        </AnimatePresence>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

