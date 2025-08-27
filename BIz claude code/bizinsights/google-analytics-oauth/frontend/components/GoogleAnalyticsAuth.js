import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

export default function GoogleAnalyticsAuth({ userId, onAuthSuccess }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [pageViewsData, setPageViewsData] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, [userId]);

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE}/auth/status/${userId}`);
      setIsAuthenticated(response.data.authenticated);
      if (response.data.authenticated) {
        await fetchAccounts();
      }
    } catch (err) {
      console.error('Auth status check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.get(`${API_BASE}/auth-google?userId=${userId}`);
      window.location.href = response.data.authUrl;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate Google auth');
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API_BASE}/analytics/accounts/${userId}`);
      setAccounts(response.data.accounts);
    } catch (err) {
      setError('Failed to fetch Analytics accounts');
    }
  };

  const fetchPageViews = async () => {
    if (!selectedProperty) return;

    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE}/analytics/pageviews/${userId}/${selectedProperty}`
      );
      setPageViewsData(response.data);
    } catch (err) {
      setError('Failed to fetch page views data');
    } finally {
      setLoading(false);
    }
  };

  const revokeAccess = async () => {
    try {
      await axios.post(`${API_BASE}/auth/revoke/${userId}`);
      setIsAuthenticated(false);
      setAccounts([]);
      setPageViewsData(null);
      setSelectedProperty('');
    } catch (err) {
      setError('Failed to revoke access');
    }
  };

  if (loading && !pageViewsData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Google Analytics Integration
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Connect your Google Analytics account to view your data
            </p>
            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Connecting...' : '🔗 Connect Google Analytics'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <span className="text-green-500 mr-2">✅</span>
                <span className="text-gray-700">Connected to Google Analytics</span>
              </div>
              <button
                onClick={revokeAccess}
                className="text-red-500 hover:text-red-600 text-sm"
              >
                Disconnect
              </button>
            </div>

            {accounts.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Analytics Property:
                </label>
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a property...</option>
                  {accounts.map(account => 
                    account.properties?.map(property => (
                      <option key={property.id} value={property.id}>
                        {account.name} - {property.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {selectedProperty && (
              <div className="mb-6">
                <button
                  onClick={fetchPageViews}
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : '📊 Fetch Page Views'}
                </button>
              </div>
            )}

            {pageViewsData && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-4">
                  Page Views Report
                  {pageViewsData.cached && (
                    <span className="text-sm text-gray-500 ml-2">(Cached)</span>
                  )}
                </h3>
                
                <div className="mb-4 text-sm text-gray-600">
                  Date Range: {pageViewsData.dateRange.startDate} to {pageViewsData.dateRange.endDate}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Page Path</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Page Title</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Page Views</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Sessions</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-700">Bounce Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {pageViewsData.pageViews.map((page, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-blue-600 font-mono">
                            {page.pagePath}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {page.pageTitle || 'N/A'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {page.pageViews.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {page.sessions.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {(page.bounceRate * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  Total Rows: {pageViewsData.totalRows}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}