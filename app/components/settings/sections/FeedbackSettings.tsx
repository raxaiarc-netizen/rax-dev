import { useState } from 'react';
import { classNames } from '~/utils/classNames';
import { toast } from 'react-toastify';

export function FeedbackSettings() {
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'general'>('general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Thank you for your feedback!');
      setSubject('');
      setMessage('');
    } catch (error) {
      toast.error('Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl pb-8">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Send us your feedback</h3>
        <p className="text-sm text-gray-400">
          We'd love to hear your thoughts, suggestions, or issues you're experiencing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Feedback Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-3">Feedback Type</label>
          <div className="flex gap-3">
            {[
              { value: 'general', label: 'General', icon: 'i-ph:chat-circle-dots' },
              { value: 'bug', label: 'Bug Report', icon: 'i-ph:bug' },
              { value: 'feature', label: 'Feature Request', icon: 'i-ph:lightbulb' },
            ].map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setFeedbackType(type.value as any)}
                className={classNames(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg',
                  'text-sm font-medium transition-all duration-200',
                  'border',
                  feedbackType === type.value
                    ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                    : 'bg-[#0f0f0f] border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300',
                )}
              >
                <span className={classNames(type.icon, 'w-5 h-5')} />
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={classNames(
              'w-full px-4 py-2.5 rounded-lg',
              'bg-[#0f0f0f] border border-gray-700',
              'text-white text-sm',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
              'transition-all',
            )}
            placeholder="Brief description of your feedback"
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className={classNames(
              'w-full px-4 py-2.5 rounded-lg',
              'bg-[#0f0f0f] border border-gray-700',
              'text-white text-sm',
              'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
              'transition-all resize-none',
            )}
            placeholder="Tell us more about your feedback..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className={classNames(
              'px-6 py-2.5 rounded-lg',
              'text-sm font-medium text-white',
              'bg-blue-500 hover:bg-blue-600',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'active:scale-95',
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="i-ph:spinner-gap w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              'Submit Feedback'
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setSubject('');
              setMessage('');
            }}
            className={classNames(
              'px-6 py-2.5 rounded-lg',
              'text-sm font-medium text-gray-300',
              'bg-[#0f0f0f] border border-gray-700',
              'hover:bg-gray-800',
              'transition-all duration-200',
            )}
          >
            Clear
          </button>
        </div>
      </form>

      {/* Contact Info */}
      <div className="mt-8 bg-[#0f0f0f] border border-gray-700 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="i-ph:info w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-white mb-1">Need immediate help?</h4>
            <p className="text-sm text-gray-400">
              Visit our{' '}
              <a
                href="https://stackblitz-labs.github.io/rax.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Help Center
              </a>{' '}
              for instant answers to common questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
