import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useCurrentOrganization } from '../hooks/useOrganization';
import {
  useAvailableIntegrations,
  useConnectedIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
  useSyncIntegration,
  useOAuthAuthorize,
} from '../hooks/useIntegrations';
import ConnectionDialog from '../components/integrations/ConnectionDialog';
import toast from 'react-hot-toast';
import {
  Link as LinkIcon,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  Loader2,
  ShoppingBag,
  CreditCard,
  BarChart,
  Megaphone,
  Store,
} from 'lucide-react';

const platformIcons: Record<string, React.ReactNode> = {
  shopify: <ShoppingBag className="h-6 w-6" />,
  stripe: <CreditCard className="h-6 w-6" />,
  'google-analytics': <BarChart className="h-6 w-6" />,
  'facebook-ads': <Megaphone className="h-6 w-6" />,
  woocommerce: <Store className="h-6 w-6" />,
};

const platformColors: Record<string, string> = {
  shopify: 'bg-green-500',
  stripe: 'bg-purple-500',
  'google-analytics': 'bg-orange-500',
  'facebook-ads': 'bg-blue-600',
  woocommerce: 'bg-indigo-500',
};

export default function IntegrationsPage() {
  const { organization } = useCurrentOrganization();
  const location = useLocation();
  const navigate = useNavigate();
  const { platform: oauthPlatform } = useParams();

  const { data: availableIntegrations, isLoading: loadingAvailable } = useAvailableIntegrations();
  const { data: connectedIntegrations, isLoading: loadingConnected, refetch } = useConnectedIntegrations(
    organization?.id || null
  );

  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();
  const syncMutation = useSyncIntegration();
  const oauthMutation = useOAuthAuthorize();

  const [syncing, setSyncing] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState<{ platform: string; name: string } | null>(null);

  // Handle OAuth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const code = searchParams.get('code');

    if (oauthPlatform && code && organization?.id) {
      handleOAuthCallback(oauthPlatform, code);
    }
  }, [oauthPlatform, location.search, organization?.id]);

  const handleOAuthCallback = async (platform: string, code: string) => {
    try {
      await connectMutation.mutateAsync({
        platform,
        organizationId: organization!.id,
        data: { code },
      });
      toast.success(`${platform} connected successfully!`);
      navigate('/dashboard/integrations', { replace: true });
      refetch();
    } catch (error) {
      toast.error(`Failed to connect ${platform}`);
      navigate('/dashboard/integrations', { replace: true });
    }
  };

  const handleConnect = async (platform: string, platformName: string) => {
    // Show dialog to collect credentials
    setShowDialog({ platform, name: platformName });
  };

  const handleConnectWithCredentials = async (credentials: any) => {
    if (!organization?.id || !showDialog) return;

    const platform = showDialog.platform;
    setConnecting(platform);
    
    try {
      await connectMutation.mutateAsync({
        platform,
        organizationId: organization.id,
        data: credentials,
      });
      toast.success(`${showDialog.name} connected successfully!`);
      refetch();
      setShowDialog(null);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || `Failed to connect ${showDialog.name}`;
      toast.error(errorMsg);
      throw error; // Re-throw so dialog can handle it
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platform: string) => {
    if (!organization?.id || !confirm(`Disconnect ${platform}?`)) return;

    try {
      await disconnectMutation.mutateAsync({
        platform,
        organizationId: organization.id,
      });
      toast.success(`${platform} disconnected`);
      refetch();
    } catch (error) {
      toast.error(`Failed to disconnect ${platform}`);
    }
  };

  const handleSync = async (platform: string) => {
    if (!organization?.id) return;

    setSyncing(platform);
    try {
      await syncMutation.mutateAsync({
        platform,
        organizationId: organization.id,
      });
      toast.success(`${platform} synced successfully!`);
      refetch();
    } catch (error) {
      toast.error(`Failed to sync ${platform}`);
    } finally {
      setSyncing(null);
    }
  };

  const isConnected = (platformId: string) => {
    return connectedIntegrations?.some(
      (int: any) => int.platform.toLowerCase() === platformId.toLowerCase() && int.status === 'CONNECTED'
    );
  };

  const getConnection = (platformId: string) => {
    return connectedIntegrations?.find(
      (int: any) => int.platform.toLowerCase() === platformId.toLowerCase()
    );
  };

  if (!organization) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Organization Found</h2>
        <p className="text-gray-600">Please create an organization to manage integrations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-600">Connect your e-commerce platforms and analytics tools</p>
      </div>

      {/* Connected Integrations */}
      {connectedIntegrations && connectedIntegrations.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Check className="h-5 w-5 text-green-600 mr-2" />
            Connected Integrations
          </h2>
          <div className="space-y-4">
            {connectedIntegrations.map((integration: any) => (
              <div
                key={integration.id}
                className="flex items-center justify-between p-5 border rounded-lg hover:shadow-sm transition-shadow bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-14 h-14 rounded-lg flex items-center justify-center text-white ${
                      platformColors[integration.platform.toLowerCase()] || 'bg-gray-500'
                    }`}
                  >
                    {platformIcons[integration.platform.toLowerCase()] || (
                      <LinkIcon className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{integration.platform}</h3>
                    <p className="text-sm text-gray-600">
                      Last synced:{' '}
                      {integration.lastSyncAt
                        ? new Date(integration.lastSyncAt).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span
                    className={`px-3 py-1 text-sm rounded-full font-medium ${
                      integration.status === 'CONNECTED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {integration.status}
                  </span>
                  <button
                    onClick={() => handleSync(integration.platform.toLowerCase())}
                    disabled={syncing === integration.platform.toLowerCase()}
                    className="p-2 text-gray-600 hover:bg-white rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
                    title="Sync now"
                  >
                    <RefreshCw
                      className={`h-5 w-5 ${
                        syncing === integration.platform.toLowerCase() ? 'animate-spin' : ''
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => handleDisconnect(integration.platform.toLowerCase())}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                    title="Disconnect"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Available Integrations</h2>
        {loadingAvailable ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableIntegrations?.map((integration: any) => {
              const connected = isConnected(integration.id);
              const connection = getConnection(integration.id);

              return (
                <div key={integration.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center space-x-4 mb-4">
                    <div
                      className={`w-16 h-16 rounded-lg flex items-center justify-center text-white ${
                        platformColors[integration.id] || 'bg-gray-500'
                      }`}
                    >
                      {platformIcons[integration.id] || <LinkIcon className="h-8 w-8" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{integration.name}</h3>
                      {connected && (
                        <span className="text-sm text-green-600 flex items-center mt-1">
                          <Check className="h-4 w-4 mr-1" />
                          Connected
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    {integration.id === 'shopify' && 'Connect your Shopify store to sync orders, customers, and products.'}
                    {integration.id === 'stripe' && 'Sync payment data, subscriptions, and customer information.'}
                    {integration.id === 'google-analytics' && 'Import website traffic and user behavior analytics.'}
                    {integration.id === 'facebook-ads' && 'Track ad performance and campaign metrics.'}
                    {integration.id === 'woocommerce' && 'Connect your WooCommerce store for e-commerce data.'}
                  </p>

                  {connected ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSync(integration.id)}
                        disabled={syncing === integration.id}
                        className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw
                          className={`h-4 w-4 mr-2 ${syncing === integration.id ? 'animate-spin' : ''}`}
                        />
                        {syncing === integration.id ? 'Syncing...' : 'Sync Now'}
                      </button>
                      <button
                        onClick={() => handleDisconnect(integration.id)}
                        className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.id, integration.name)}
                      disabled={connecting === integration.id}
                      className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                    >
                      {connecting === integration.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Connect {integration.name}
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Connection Dialog */}
      {showDialog && (
        <ConnectionDialog
          platform={showDialog.platform}
          platformName={showDialog.name}
          onClose={() => setShowDialog(null)}
          onConnect={handleConnectWithCredentials}
        />
      )}
    </div>
  );
}
