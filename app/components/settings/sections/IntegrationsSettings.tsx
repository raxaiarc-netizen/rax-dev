import { classNames } from '~/utils/classNames';

interface Integration {
  id: string;
  name: string;
  icon: string;
  description: string;
  connected: boolean;
  status?: 'connected' | 'disconnected' | 'error';
}

const integrations: Integration[] = [
  {
    id: 'supabase',
    name: 'Supabase',
    icon: 'i-ph:database',
    description: 'Connect to your Supabase database',
    connected: false,
    status: 'disconnected',
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'i-ph:github-logo',
    description: 'Connect your GitHub repositories',
    connected: false,
    status: 'disconnected',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    icon: 'i-ph:gitlab-logo',
    description: 'Connect your GitLab repositories',
    connected: false,
    status: 'disconnected',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    icon: 'i-ph:triangle',
    description: 'Deploy to Vercel',
    connected: false,
    status: 'disconnected',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    icon: 'i-ph:diamond',
    description: 'Deploy to Netlify',
    connected: false,
    status: 'disconnected',
  },
];

export function IntegrationsSettings() {
  const handleConnect = (integrationId: string) => {
    console.log('Connecting to', integrationId);
    // In real app, open OAuth flow or configuration dialog
  };

  const handleDisconnect = (integrationId: string) => {
    console.log('Disconnecting from', integrationId);
    // In real app, disconnect the integration
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-gray-400 mb-6">
        Connect third-party services to enhance your workflow and automate deployments.
      </p>

      <div className="space-y-3">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className={classNames(
              'bg-[#0f0f0f] border border-gray-700 rounded-lg p-5',
              'hover:border-gray-600 transition-colors',
            )}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={classNames(
                    'w-12 h-12 rounded-lg flex items-center justify-center',
                    integration.connected ? 'bg-blue-500/20' : 'bg-gray-800',
                  )}
                >
                  <span className={classNames(integration.icon, 'w-6 h-6', integration.connected ? 'text-blue-400' : 'text-gray-400')} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-white">{integration.name}</h3>
                    {integration.connected && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-green-500/20 text-green-400 rounded-full">
                        Connected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{integration.description}</p>
                </div>
              </div>
              <div>
                {integration.connected ? (
                  <button
                    onClick={() => handleDisconnect(integration.id)}
                    className="px-4 py-2 text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={() => handleConnect(integration.id)}
                    className="px-4 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
        <div className="flex gap-3">
          <span className="i-ph:info w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-400 mb-1">Need help with integrations?</h4>
            <p className="text-sm text-gray-400">
              Check out our documentation to learn more about setting up and configuring integrations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

