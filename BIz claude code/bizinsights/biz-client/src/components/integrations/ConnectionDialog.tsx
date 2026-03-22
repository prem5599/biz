import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ConnectionDialogProps {
  platform: string;
  platformName: string;
  onClose: () => void;
  onConnect: (credentials: any) => Promise<void>;
}

export default function ConnectionDialog({
  platform,
  platformName,
  onClose,
  onConnect,
}: ConnectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const getFields = () => {
    switch (platform) {
      case 'shopify':
        return [
          { name: 'shopDomain', label: 'Shop Domain', placeholder: 'your-store', type: 'text', required: true },
          { name: 'accessToken', label: 'Access Token', placeholder: 'shpat_...', type: 'password', required: true },
        ];
      case 'stripe':
        return [
          { name: 'secretKey', label: 'Secret Key', placeholder: 'sk_...', type: 'password', required: true },
          { name: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_...', type: 'text', required: true },
        ];
      case 'google-analytics':
        return [
          { name: 'propertyId', label: 'GA4 Property ID', placeholder: '123456789', type: 'text', required: true },
          { name: 'serviceAccountKey', label: 'Service Account JSON', placeholder: 'Paste JSON here', type: 'textarea', required: true },
        ];
      case 'facebook-ads':
        return [
          { name: 'accessToken', label: 'Access Token', placeholder: 'EAA...', type: 'password', required: true },
          { name: 'adAccountId', label: 'Ad Account ID', placeholder: 'act_...', type: 'text', required: true },
        ];
      case 'woocommerce':
        return [
          { name: 'storeUrl', label: 'Store URL', placeholder: 'https://yourstore.com', type: 'text', required: true },
          { name: 'consumerKey', label: 'Consumer Key', placeholder: 'ck_...', type: 'text', required: true },
          { name: 'consumerSecret', label: 'Consumer Secret', placeholder: 'cs_...', type: 'password', required: true },
        ];
      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onConnect(formData);
      toast.success(`${platformName} connected successfully!`);
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to connect ${platformName}`);
    } finally {
      setLoading(false);
    }
  };

  const fields = getFields();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Connect {platformName}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.type === 'textarea' ? (
                <textarea
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                />
              ) : (
                <input
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
          ))}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              {platform === 'shopify' && 'Enter your Shopify store domain (without .myshopify.com) and access token from your Shopify admin.'}
              {platform === 'stripe' && 'Get your API keys from the Stripe Dashboard under Developers > API keys.'}
              {platform === 'google-analytics' && 'Create a service account in Google Cloud Console and paste the JSON key here.'}
              {platform === 'facebook-ads' && 'Get your access token from Facebook Business Manager and your ad account ID.'}
              {platform === 'woocommerce' && 'Generate API keys in WooCommerce > Settings > Advanced > REST API.'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
