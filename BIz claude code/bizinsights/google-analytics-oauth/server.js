const express = require('express');
const { google } = require('googleapis');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const crypto = require('crypto');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// In-memory token storage (use database in production)
const tokenStore = new Map();
const stateStore = new Map();

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
);

// Required scopes for Google Analytics
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly'
];

// Generate secure state parameter
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

// Validate state parameter
function validateState(state) {
  const storedState = stateStore.get(state);
  if (!storedState || Date.now() > storedState.expires) {
    stateStore.delete(state);
    return false;
  }
  stateStore.delete(state);
  return true;
}

// Store user tokens securely
function storeUserTokens(userId, tokens) {
  tokenStore.set(userId, {
    ...tokens,
    storedAt: Date.now()
  });
}

// Get user tokens
function getUserTokens(userId) {
  return tokenStore.get(userId);
}

// Check if token needs refresh
function isTokenExpired(tokens) {
  if (!tokens.expiry_date) return false;
  return Date.now() >= tokens.expiry_date - 60000; // Refresh 1 min before expiry
}

// Refresh access token
async function refreshTokenIfNeeded(userId) {
  const tokens = getUserTokens(userId);
  if (!tokens) throw new Error('No tokens found for user');

  if (isTokenExpired(tokens)) {
    oauth2Client.setCredentials({
      refresh_token: tokens.refresh_token
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      const newTokens = {
        ...tokens,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date
      };
      
      storeUserTokens(userId, newTokens);
      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh token');
    }
  }

  return tokens;
}

// Routes

// Initialize Google OAuth flow
app.get('/auth-google', (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId parameter required' });
    }

    // Generate and store state
    const state = generateState();
    stateStore.set(state, {
      userId,
      expires: Date.now() + 10 * 60 * 1000 // 10 minutes
    });

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: state,
      prompt: 'consent', // Force consent to get refresh token
      include_granted_scopes: true
    });

    res.json({ authUrl });
  } catch (error) {
    console.error('Auth URL generation error:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Handle OAuth callback
app.get('/oauth2callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-error?error=${error}`);
    }

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // Validate state parameter
    if (!validateState(state)) {
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    // Get stored state data
    const stateData = stateStore.get(state);
    const userId = stateData?.userId;

    if (!userId) {
      return res.status(400).json({ error: 'Invalid state data' });
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Store tokens for user
    storeUserTokens(userId, tokens);

    // Set credentials for immediate use
    oauth2Client.setCredentials(tokens);

    // Get user's Analytics accounts to verify access
    const analytics = google.analytics('v3');
    const accounts = await analytics.management.accounts.list({
      auth: oauth2Client
    });

    console.log(`OAuth success for user ${userId}:`, {
      hasRefreshToken: !!tokens.refresh_token,
      accountsCount: accounts.data.items?.length || 0
    });

    // Redirect to success page
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-success?userId=${userId}`);

  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-error?error=callback_failed`);
  }
});

// Get user's Analytics accounts
app.get('/analytics/accounts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Refresh token if needed
    const tokens = await refreshTokenIfNeeded(userId);
    oauth2Client.setCredentials(tokens);

    // Get Analytics accounts
    const analytics = google.analytics('v3');
    const accounts = await analytics.management.accounts.list({
      auth: oauth2Client
    });

    res.json({
      accounts: accounts.data.items || []
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Analytics accounts',
      details: error.message 
    });
  }
});

// Get Analytics properties for an account
app.get('/analytics/properties/:userId/:accountId', async (req, res) => {
  try {
    const { userId, accountId } = req.params;
    
    const tokens = await refreshTokenIfNeeded(userId);
    oauth2Client.setCredentials(tokens);

    const analytics = google.analytics('v3');
    const properties = await analytics.management.webproperties.list({
      auth: oauth2Client,
      accountId: accountId
    });

    res.json({
      properties: properties.data.items || []
    });

  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Analytics properties',
      details: error.message 
    });
  }
});

// Get GA4 data using Analytics Data API
app.post('/analytics/reports/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { propertyId, startDate, endDate, metrics, dimensions } = req.body;

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }

    // Refresh token if needed
    const tokens = await refreshTokenIfNeeded(userId);
    
    // Initialize Analytics Data client with refreshed tokens
    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: 'not-needed-for-oauth',
        private_key: 'not-needed-for-oauth'
      },
      auth: {
        getAccessToken: async () => {
          return { token: tokens.access_token };
        }
      }
    });

    // Default report configuration
    const reportRequest = {
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: startDate || '30daysAgo',
          endDate: endDate || 'today',
        },
      ],
      metrics: metrics || [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'bounceRate' }
      ],
      dimensions: dimensions || [
        { name: 'pagePath' },
        { name: 'pageTitle' }
      ],
      limit: 100,
      orderBys: [
        {
          metric: { metricName: 'screenPageViews' },
          desc: true,
        },
      ],
    };

    // Run the report
    const [response] = await analyticsDataClient.runReport(reportRequest);

    // Format response
    const formattedData = {
      dimensionHeaders: response.dimensionHeaders,
      metricHeaders: response.metricHeaders,
      rows: response.rows,
      rowCount: response.rowCount,
      metadata: response.metadata
    };

    res.json(formattedData);

  } catch (error) {
    console.error('Analytics report error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Analytics data',
      details: error.message 
    });
  }
});

// Get page views by URL (specific GA4 report)
app.get('/analytics/pageviews/:userId/:propertyId', async (req, res) => {
  try {
    const { userId, propertyId } = req.params;
    const { startDate, endDate } = req.query;

    const tokens = await refreshTokenIfNeeded(userId);
    
    // Use OAuth2Client for authentication with Analytics Data API
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials(tokens);

    const analyticsDataClient = new BetaAnalyticsDataClient({
      auth: authClient
    });

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: startDate || '7daysAgo',
          endDate: endDate || 'today',
        },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'bounceRate' }
      ],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' }
      ],
      orderBys: [
        {
          metric: { metricName: 'screenPageViews' },
          desc: true,
        },
      ],
      limit: 50,
    });

    // Transform data into readable format
    const pageViews = response.rows?.map(row => ({
      pagePath: row.dimensionValues[0]?.value,
      pageTitle: row.dimensionValues[1]?.value,
      pageViews: parseInt(row.metricValues[0]?.value || '0'),
      sessions: parseInt(row.metricValues[1]?.value || '0'),
      bounceRate: parseFloat(row.metricValues[2]?.value || '0')
    })) || [];

    res.json({
      dateRange: {
        startDate: startDate || '7daysAgo',
        endDate: endDate || 'today'
      },
      totalRows: response.rowCount,
      pageViews
    });

  } catch (error) {
    console.error('Page views report error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch page views data',
      details: error.message 
    });
  }
});

// Revoke user's access
app.post('/auth/revoke/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tokens = getUserTokens(userId);
    if (!tokens) {
      return res.status(404).json({ error: 'User tokens not found' });
    }

    // Revoke tokens with Google
    if (tokens.access_token) {
      await oauth2Client.revokeToken(tokens.access_token);
    }

    // Remove from storage
    tokenStore.delete(userId);

    res.json({ success: true, message: 'Access revoked successfully' });

  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({ 
      error: 'Failed to revoke access',
      details: error.message 
    });
  }
});

// Check authentication status
app.get('/auth/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tokens = getUserTokens(userId);
    if (!tokens) {
      return res.json({ authenticated: false });
    }

    // Try to refresh token to verify it's still valid
    try {
      await refreshTokenIfNeeded(userId);
      res.json({ 
        authenticated: true,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: tokens.expiry_date
      });
    } catch (error) {
      // Token is invalid
      tokenStore.delete(userId);
      res.json({ authenticated: false });
    }

  } catch (error) {
    console.error('Auth status check error:', error);
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    authenticatedUsers: tokenStore.size
  });
});

app.listen(PORT, () => {
  console.log(`Google Analytics OAuth server running on port ${PORT}`);
  console.log(`OAuth callback URL: http://localhost:${PORT}/oauth2callback`);
});

module.exports = app;