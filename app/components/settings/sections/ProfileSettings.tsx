import { useState, useEffect } from 'react';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

interface ProfileSettingsProps {
  user: User;
}

interface ProfileData {
  username: string;
  name: string;
  description: string;
  location: string;
  link: string;
  hideProfilePicture: boolean;
  generationSound: string;
}

const soundOptions = [
  { value: 'none', label: 'None' },
  { value: 'chime', label: 'Chime' },
  { value: 'bell', label: 'Bell' },
  { value: 'notification', label: 'Notification' },
  { value: 'success', label: 'Success' },
];

export function ProfileSettings({ user }: ProfileSettingsProps) {
  const [profile, setProfile] = useState<ProfileData>(() => {
    const saved = localStorage.getItem('user_profile_settings');
    return saved
      ? JSON.parse(saved)
      : {
          username: user.name || '',
          name: user.name || '',
          description: '',
          location: '',
          link: '',
          hideProfilePicture: false,
          generationSound: 'chime',
        };
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    localStorage.setItem('user_profile_settings', JSON.stringify(profile));
  }, [profile]);

  const handleChange = (field: keyof ProfileData, value: string | boolean) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      // Simulate upload - in real app, upload to server
      const reader = new FileReader();
      reader.onloadend = () => {
        toast.success('Profile picture updated');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload profile picture');
      setIsUploading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      // In real app, call API to delete account
      toast.success('Account deletion initiated');
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  const initials = user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase();

  return (
    <div className="space-y-8 max-w-2xl pb-8">
      {/* Avatar Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Your Avatar</h3>
        <p className="text-sm text-gray-400 mb-4">
          Your avatar is either fetched from your linked identity provider or automatically generated based on your
          account.
        </p>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-xl font-semibold text-white">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/60 rounded-full cursor-pointer transition-all">
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              {isUploading ? (
                <span className="i-ph:spinner-gap w-6 h-6 text-white animate-spin" />
              ) : (
                <span className="i-ph:camera w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </label>
          </div>
          <button
            onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#0f0f0f] border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Change Avatar
          </button>
        </div>
      </div>

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
        <input
          type="text"
          value={profile.username}
          onChange={(e) => handleChange('username', e.target.value)}
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0f0f0f] border border-gray-700',
            'text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all',
          )}
          placeholder="Enter your username"
        />
      </div>

      {/* Email (Read-only) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
        <p className="text-sm text-gray-400 mb-2">Your email address associated with your account.</p>
        <div
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0a0a0a] border border-gray-800',
            'text-gray-500 text-sm',
          )}
        >
          {user.email}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
        <p className="text-sm text-gray-400 mb-2">Your full name, as visible to others.</p>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => handleChange('name', e.target.value)}
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0f0f0f] border border-gray-700',
            'text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all',
          )}
          placeholder="Enter your full name"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
        <p className="text-sm text-gray-400 mb-2">A short description of yourself or your work.</p>
        <textarea
          value={profile.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0f0f0f] border border-gray-700',
            'text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all resize-none',
          )}
          placeholder="Tell us about yourself"
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Location</label>
        <p className="text-sm text-gray-400 mb-2">Where you're based.</p>
        <input
          type="text"
          value={profile.location}
          onChange={(e) => handleChange('location', e.target.value)}
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0f0f0f] border border-gray-700',
            'text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all',
          )}
          placeholder="e.g., San Francisco, CA"
        />
      </div>

      {/* Link */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Link</label>
        <p className="text-sm text-gray-400 mb-2">Add a link to your personal website or portfolio.</p>
        <input
          type="url"
          value={profile.link}
          onChange={(e) => handleChange('link', e.target.value)}
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0f0f0f] border border-gray-700',
            'text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all',
          )}
          placeholder="https://"
        />
      </div>

      {/* Hide Profile Picture */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="hideProfile"
          checked={profile.hideProfilePicture}
          onChange={(e) => handleChange('hideProfilePicture', e.target.checked)}
          className="w-4 h-4 rounded bg-[#0f0f0f] border-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
        />
        <label htmlFor="hideProfile" className="text-sm text-gray-300">
          Hide Profile Picture
        </label>
      </div>

      {/* Generation Complete Sound */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Generation complete sound</label>
        <p className="text-sm text-gray-400 mb-2">Plays a satisfying sound notification when a generation is finished.</p>
        <select
          value={profile.generationSound}
          onChange={(e) => handleChange('generationSound', e.target.value)}
          className={classNames(
            'w-full px-4 py-2.5 rounded-lg',
            'bg-[#0f0f0f] border border-gray-700',
            'text-white text-sm',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'transition-all',
          )}
        >
          {soundOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Linked Sign-in Providers */}
      <div className="border-t border-gray-800 pt-8">
        <h3 className="text-sm font-medium text-gray-300 mb-2">Linked sign-in providers</h3>
        <p className="text-sm text-gray-400 mb-4">Manage authentication providers linked to your account.</p>
        <div className="bg-[#0f0f0f] border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                <span className="i-ph:google-logo w-5 h-5 text-gray-900" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Google</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded-full">
                    Primary
                  </span>
                </div>
                <span className="text-sm text-gray-400">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div className="border-t border-red-900/30 pt-8">
        <h3 className="text-sm font-medium text-red-400 mb-2">Delete account</h3>
        <p className="text-sm text-gray-400 mb-4">Permanently delete your rax account. This cannot be undone.</p>
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Delete Account
          </button>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-sm text-red-400 mb-4">
              Are you sure? This will permanently delete your account and all associated data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Delete My Account
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-[#0f0f0f] border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

