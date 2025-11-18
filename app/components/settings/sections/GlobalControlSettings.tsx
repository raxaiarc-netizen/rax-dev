import { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { Switch } from '~/components/ui/Switch';
import { toast } from 'react-toastify';

interface User {
  id: string;
  email: string;
  name: string | null;
  subscription_tier?: string;
}

interface GlobalControlSettingsProps {
  user: User;
}

interface GlobalSettings {
  language: string;
  defaultModel: string;
  defaultChatAccess: string;
  showCreditBalance: boolean;
  removeMGXBadge: boolean;
}

const languages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
];

const models = [
  { value: 'claude-4-5-sonnet', label: 'claude-4-5-sonnet' },
  { value: 'gpt-4', label: 'gpt-4' },
  { value: 'gpt-4-turbo', label: 'gpt-4-turbo' },
  { value: 'claude-3-opus', label: 'claude-3-opus' },
  { value: 'claude-3-sonnet', label: 'claude-3-sonnet' },
];

const accessLevels = [
  { value: 'public', label: 'Public', description: 'Anyone can view this chat' },
  { value: 'private', label: 'Private', description: 'Only you can view this chat' },
  { value: 'unlisted', label: 'Unlisted', description: 'Anyone with the link can view' },
];

export function GlobalControlSettings({ user }: GlobalControlSettingsProps) {
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const saved = localStorage.getItem('global_settings');
    return saved
      ? JSON.parse(saved)
      : {
          language: 'en',
          defaultModel: 'claude-4-5-sonnet',
          defaultChatAccess: 'public',
          showCreditBalance: true,
          removeMGXBadge: false,
        };
  });

  const isPro = user.subscription_tier === 'pro' || user.subscription_tier === 'enterprise';

  useEffect(() => {
    localStorage.setItem('global_settings', JSON.stringify(settings));
  }, [settings]);

  const handleChange = (field: keyof GlobalSettings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    toast.success('Settings updated');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Current Language */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Language</label>
        <select
          value={settings.language}
          onChange={(e) => handleChange('language', e.target.value)}
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0f0f0f] border border-gray-700',
            'text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all',
          )}
        >
          {languages.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      {/* Default Model */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Select Model</label>
        <select
          value={settings.defaultModel}
          onChange={(e) => handleChange('defaultModel', e.target.value)}
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0f0f0f] border border-gray-700',
            'text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all',
          )}
        >
          {models.map((model) => (
            <option key={model.value} value={model.value}>
              {model.label}
            </option>
          ))}
        </select>
      </div>

      {/* Permissions */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Permissions</label>
        <p className="text-sm text-gray-400 mb-3">Set Default Access for Chats</p>
        <select
          value={settings.defaultChatAccess}
          onChange={(e) => handleChange('defaultChatAccess', e.target.value)}
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0f0f0f] border border-gray-700',
            'text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all',
          )}
        >
          {accessLevels.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-2">
          {accessLevels.find((l) => l.value === settings.defaultChatAccess)?.description}
        </p>
      </div>

      {/* Credit Balance Reminder */}
      <div className="border-t border-gray-800 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-300">Credit Balance Reminder</h3>
            <p className="text-sm text-gray-400 mt-1">Show remaining credits</p>
          </div>
          <Switch
            checked={settings.showCreditBalance}
            onCheckedChange={(checked) => handleChange('showCreditBalance', checked)}
          />
        </div>
      </div>

      {/* Remove MGX Badge */}
      <div className="border-t border-gray-800 pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-gray-300">Remove MGX Badge</h3>
                <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
                  Pro+
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Remove MGX badge on published link</p>
            </div>
          </div>
          <div className={!isPro ? 'opacity-50 pointer-events-none' : ''}>
            <Switch
              checked={isPro && settings.removeMGXBadge}
              onCheckedChange={(checked) => {
                if (!isPro) {
                  toast.error('This feature requires a Pro+ subscription');
                  return;
                }
                handleChange('removeMGXBadge', checked);
              }}
            />
          </div>
        </div>
        {!isPro && (
          <p className="text-xs text-gray-500 mt-2">
            Upgrade to Pro+ to remove the MGX badge from your published chats
          </p>
        )}
      </div>
    </div>
  );
}

