const express = require('express');
const { google } = require('googleapis');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');
const crypto = require('crypto');
const cors = require('cors');
const { GoogleAnalyticsDB, createTables } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Initialize database on startup
createTables();

// In-memory state store for OAuth flow
const stateStore = new Map();

// Google OAuth configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/oauth2callback'
);

// Required scopes
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

// Token refresh middleware
async function refreshTokenIfNeeded(userId) {
  const tokens = await GoogleAnalyticsDB.getTokens(userId);
  if (!tokens) throw new Error('No tokens found for user');

  // Check if token needs refresh (1 min before expiry)
  if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60000) {
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
      
      await GoogleAnalyticsDB.storeTokens(userId, newTokens);
      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh token');
    }
  }

  return tokens;
}

// Generate secure state parameter
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

// Routes

// Initialize Google OAuth flow
app.get('/auth-google', (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId parameter required' });
    }

    const state = generateState();
    stateStore.set(state, {
      userId,
      expires: Date.now() + 10 * 60 * 1000
    });

    // Clean up expired states
    setTimeout(() => stateStore.delete(state), 10 * 60 * 1000);

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: state,
      prompt: 'consent',
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

    if (error) {
      console.error('OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth-error?error=${error}`);
    }

    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state parameter' });
    }

    // Validate state
    const stateData = stateStore.get(state);
    if (!stateData || Date.now() > stateData.expires) {
      stateStore.delete(state);
      return res.status(400).json({ error: 'Invalid or expired state parameter' });
    }

    const userId = stateData.userId;
    stateStore.delete(state);

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
    }

    // Store tokens in database
    await GoogleAnalyticsDB.storeTokens(userId, tokens);

    // Get user info
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Store user info
    await GoogleAnalyticsDB.storeUser(
      userId, 
      userInfo.data.email, 
      userInfo.data.name
    );

    // Get and store Analytics accounts
    try {
      const analytics = google.analytics('v3');
      const accounts = await analytics.management.accounts.list({
        auth: oauth2Client
      });

      if (accounts.data.items) {
        await GoogleAnalyticsDB.storeAnalyticsAccounts(userId, accounts.data.items);
      }
    } catch (analyticsError) {
      console.warn('Failed to fetch Analytics accounts:', analyticsError.message);
    }

    console.log(`OAuth success for user ${userId}`);
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
    
    // Try to get from database first
    let accounts = await GoogleAnalyticsDB.getAnalyticsAccounts(userId);
    
    if (accounts.length === 0) {
      // Fetch from Google if not in database
      const tokens = await refreshTokenIfNeeded(userId);
      oauth2Client.setCredentials(tokens);

      const analytics = google.analytics('v3');
      const response = await analytics.management.accounts.list({
        auth: oauth2Client
      });

      accounts = response.data.items || [];
      
      // Store in database for future use
      if (accounts.length > 0) {
        await GoogleAnalyticsDB.storeAnalyticsAccounts(userId, accounts);
      }
    }

    res.json({ accounts });

  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Analytics accounts',
      details: error.message 
    });
  }
});

// Get GA4 page views report with caching
app.get('/analytics/pageviews/:userId/:propertyId', async (req, res) => {
  try {
    const { userId, propertyId } = req.params;
    const { startDate = '7daysAgo', endDate = 'today' } = req.query;
    
    const reportType = 'pageviews';
    const dateRange = `${startDate}_${endDate}`;
    
    // Check cache first
    const cachedReport = await GoogleAnalyticsDB.getCachedReport(
      userId, propertyId, reportType, dateRange
    );
    
    if (cachedReport) {
      return res.json({
        ...cachedReport,
        cached: true
      });
    }

    // Fetch fresh data
    const tokens = await refreshTokenIfNeeded(userId);
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials(tokens);

    const analyticsDataClient = new BetaAnalyticsDataClient({
      auth: authClient
    });

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' }
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

    // Transform data
    const pageViews = response.rows?.map(row => ({
      pagePath: row.dimensionValues[0]?.value,
      pageTitle: row.dimensionValues[1]?.value,
      pageViews: parseInt(row.metricValues[0]?.value || '0'),
      sessions: parseInt(row.metricValues[1]?.value || '0'),
      bounceRate: parseFloat(row.metricValues[2]?.value || '0'),
      avgSessionDuration: parseFloat(row.metricValues[3]?.value || '0')
    })) || [];

    const reportData = {
      dateRange: { startDate, endDate },
      totalRows: response.rowCount,
      pageViews,
      cached: false
    };

    // Cache the report
    await GoogleAnalyticsDB.storeReport(
      userId, propertyId, reportType, dateRange, reportData, 60
    );

    res.json(reportData);

  } catch (error) {
    console.error('Page views report error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch page views data',
      details: error.message 
    });
  }
});

// Get custom GA4 report
app.post('/analytics/reports/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      propertyId, 
      startDate = '30daysAgo', 
      endDate = 'today',
      metrics = [{ name: 'screenPageViews' }],
      dimensions = [{ name: 'pagePath' }],
      limit = 100
    } = req.body;

    if (!propertyId) {
      return res.status(400).json({ error: 'propertyId is required' });
    }

    const tokens = await refreshTokenIfNeeded(userId);
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials(tokens);

    const analyticsDataClient = new BetaAnalyticsDataClient({
      auth: authClient
    });

    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      metrics,
      dimensions,
      limit,
      orderBys: metrics.length > 0 ? [{
        metric: { metricName: metrics[0].name },
        desc: true,
      }] : undefined,
    });

    res.json({
      dimensionHeaders: response.dimensionHeaders,
      metricHeaders: response.metricHeaders,
      rows: response.rows,
      rowCount: response.rowCount,
      metadata: response.metadata
    });

  } catch (error) {
    console.error('Custom report error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Analytics data',
      details: error.message 
    });
  }
});

// Check authentication status
app.get('/auth/status/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tokens = await GoogleAnalyticsDB.getTokens(userId);
    if (!tokens) {
      return res.json({ authenticated: false });
    }

    // Verify token is still valid
    try {
      await refreshTokenIfNeeded(userId);
      res.json({ 
        authenticated: true,
        hasRefreshToken: !!tokens.refresh_token,
        expiresAt: tokens.expiry_date
      });
    } catch (error) {
      await GoogleAnalyticsDB.deleteUser(userId);
      res.json({ authenticated: false });
    }

  } catch (error) {
    console.error('Auth status check error:', error);
    res.status(500).json({ error: 'Failed to check auth status' });
  }
});

// Revoke access
app.post('/auth/revoke/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tokens = await GoogleAnalyticsDB.getTokens(userId);
    if (tokens?.access_token) {
      oauth2Client.setCredentials(tokens);
      await oauth2Client.revokeToken(tokens.access_token);
    }

    await GoogleAnalyticsDB.deleteUser(userId);

    res.json({ success: true, message: 'Access revoked successfully' });

  } catch (error) {
    console.error('Token revocation error:', error);
    res.status(500).json({ 
      error: 'Failed to revoke access',
      details: error.message 
    });
  }
});

// Admin: Get all users
app.get('/admin/users', async (req, res) => {
  try {
    const users = await GoogleAnalyticsDB.getUsersWithValidTokens();
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Clean expired reports (can be called by cron job)
app.post('/admin/cleanup', async (req, res) => {
  try {
    await GoogleAnalyticsDB.cleanExpiredReports();
    res.json({ success: true, message: 'Cleanup completed' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const users = await GoogleAnalyticsDB.getUsersWithValidTokens();
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      authenticatedUsers: users.length
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Google Analytics OAuth server running on port ${PORT}`);
  console.log(`OAuth callback URL: http://localhost:${PORT}/oauth2callback`);
});

module.exports = app;