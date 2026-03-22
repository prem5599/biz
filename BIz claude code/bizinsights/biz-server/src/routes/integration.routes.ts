import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import axios from 'axios';
import Stripe from 'stripe';
import jwt from 'jsonwebtoken';

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function meta(obj: Record<string, unknown>): string {
  return JSON.stringify(obj);
}

function parseMeta(str: string | null | undefined): any {
  if (!str) return {};
  try { return JSON.parse(str); } catch { return {}; }
}

// ─── Available integrations ──────────────────────────────────────────────────

router.get('/available', authenticate, async (_req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: [
      { id: 'shopify',          name: 'Shopify',          description: 'Connect your Shopify store',       category: 'ecommerce' },
      { id: 'stripe',           name: 'Stripe',           description: 'Connect your Stripe account',      category: 'payments' },
      { id: 'google-analytics', name: 'Google Analytics', description: 'Connect Google Analytics 4',       category: 'analytics' },
      { id: 'facebook-ads',     name: 'Facebook Ads',     description: 'Connect Facebook Ads Manager',     category: 'advertising' },
      { id: 'woocommerce',      name: 'WooCommerce',      description: 'Connect your WooCommerce store',   category: 'ecommerce' },
    ]
  });
});

// ─── Connected integrations for an org ───────────────────────────────────────

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { organizationId } = req.query;
    if (!organizationId) {
      return res.status(400).json({ success: false, error: 'Organization ID required' });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId: organizationId as string, userId: req.user!.id }
    });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    const integrations = await prisma.integration.findMany({
      where: { organizationId: organizationId as string },
      orderBy: { createdAt: 'desc' },
      select: { id: true, platform: true, status: true, lastSyncAt: true, createdAt: true, updatedAt: true, metadata: true }
    });

    const sanitised = integrations.map((i) => ({
      ...i,
      platform: i.platform.toLowerCase().replace('_', '-'),
      metadata: parseMeta(i.metadata),
    }));

    res.json({ success: true, data: sanitised });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch integrations' });
  }
});

// ─── Connect ─────────────────────────────────────────────────────────────────

router.post('/:platform/connect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const platform = req.params.platform.toLowerCase();
    const { organizationId, ...credentials } = req.body;

    if (!organizationId) return res.status(400).json({ success: false, error: 'Organization ID required' });

    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: req.user!.id }
    });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    switch (platform) {
      case 'shopify':          return connectShopify(res, organizationId, credentials);
      case 'stripe':           return connectStripe(res, organizationId, credentials);
      case 'google-analytics': return connectGoogleAnalytics(res, organizationId, credentials);
      case 'facebook-ads':     return connectFacebookAds(res, organizationId, credentials);
      case 'woocommerce':      return connectWooCommerce(res, organizationId, credentials);
      default:
        return res.status(400).json({ success: false, error: `Unsupported platform: ${platform}` });
    }
  } catch (error) {
    console.error('Error connecting integration:', error);
    res.status(500).json({ success: false, error: 'Failed to connect integration' });
  }
});

// ─── Disconnect ───────────────────────────────────────────────────────────────

router.post('/:platform/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const platform = req.params.platform.toUpperCase().replace('-', '_');
    const { organizationId } = req.body;

    if (!organizationId) return res.status(400).json({ success: false, error: 'Organization ID required' });

    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: req.user!.id }
    });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    const integration = await prisma.integration.findUnique({
      where: { organizationId_platform: { organizationId, platform } }
    });
    if (!integration) return res.status(404).json({ success: false, error: 'Integration not found' });

    await prisma.dataPoint.deleteMany({ where: { integrationId: integration.id, organizationId } });
    await prisma.integration.delete({ where: { id: integration.id } });

    res.json({ success: true, message: `${platform} disconnected successfully` });
  } catch (error) {
    console.error('Error disconnecting integration:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect integration' });
  }
});

// ─── Sync ────────────────────────────────────────────────────────────────────

router.post('/:platform/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const platform = req.params.platform.toLowerCase();
    const { organizationId } = req.body;

    if (!organizationId) return res.status(400).json({ success: false, error: 'Organization ID required' });

    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: req.user!.id }
    });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    switch (platform) {
      case 'shopify':          return syncShopify(res, organizationId);
      case 'stripe':           return syncStripe(res, organizationId);
      case 'google-analytics': return syncGoogleAnalytics(res, organizationId);
      case 'facebook-ads':     return syncFacebookAds(res, organizationId);
      case 'woocommerce':      return syncWooCommerce(res, organizationId);
      default:
        return res.status(400).json({ success: false, error: `Unsupported platform: ${platform}` });
    }
  } catch (error) {
    console.error('Error syncing integration:', error);
    res.status(500).json({ success: false, error: 'Failed to sync integration' });
  }
});

// ─── OAuth authorize ──────────────────────────────────────────────────────────

router.get('/:platform/oauth/authorize', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const platform = req.params.platform.toLowerCase();
    const { organizationId } = req.query;

    if (!organizationId) return res.status(400).json({ success: false, error: 'Organization ID required' });

    const redirectUri = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/integrations/${platform}/oauth/callback`;
    const state = Buffer.from(JSON.stringify({ organizationId })).toString('base64');
    let authUrl: string;

    switch (platform) {
      case 'shopify': {
        const shop = req.query.shop as string;
        if (!shop) return res.status(400).json({ success: false, error: 'Shop domain required' });
        const scopes = 'read_orders,read_products,read_customers';
        authUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?client_id=${process.env.SHOPIFY_CLIENT_ID || ''}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;
        break;
      }
      case 'facebook-ads': {
        const scopes = 'ads_read,ads_management,read_insights';
        authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_APP_ID || ''}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}`;
        break;
      }
      default:
        return res.status(400).json({ success: false, error: `OAuth not supported for ${platform}` });
    }

    res.json({ success: true, data: { authUrl } });
  } catch (error) {
    console.error('Error getting OAuth URL:', error);
    res.status(500).json({ success: false, error: 'Failed to generate OAuth URL' });
  }
});

// ─── OAuth callback ───────────────────────────────────────────────────────────

router.post('/:platform/oauth/callback', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const platform = req.params.platform.toLowerCase();
    const { code, organizationId, shop } = req.body;

    if (!organizationId || !code) return res.status(400).json({ success: false, error: 'Organization ID and code required' });

    const membership = await prisma.organizationMember.findFirst({
      where: { organizationId, userId: req.user!.id }
    });
    if (!membership) return res.status(403).json({ success: false, error: 'Access denied' });

    switch (platform) {
      case 'shopify': {
        if (!shop) return res.status(400).json({ success: false, error: 'Shop domain required' });
        const tokenRes = await axios.post(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
          client_id: process.env.SHOPIFY_CLIENT_ID,
          client_secret: process.env.SHOPIFY_CLIENT_SECRET,
          code,
        });
        await prisma.integration.upsert({
          where: { organizationId_platform: { organizationId, platform: 'SHOPIFY' } },
          create: { organizationId, platform: 'SHOPIFY', status: 'CONNECTED', accessToken: tokenRes.data.access_token, metadata: meta({ shopDomain: shop }), lastSyncAt: new Date() },
          update: { status: 'CONNECTED', accessToken: tokenRes.data.access_token, metadata: meta({ shopDomain: shop }), lastSyncAt: new Date() },
        });
        return res.json({ success: true, message: 'Shopify connected via OAuth' });
      }
      case 'facebook-ads': {
        const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: {
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            redirect_uri: `${process.env.SERVER_URL || 'http://localhost:5000'}/api/integrations/facebook-ads/oauth/callback`,
            code,
          }
        });
        await prisma.integration.upsert({
          where: { organizationId_platform: { organizationId, platform: 'FACEBOOK_ADS' } },
          create: { organizationId, platform: 'FACEBOOK_ADS', status: 'CONNECTED', accessToken: tokenRes.data.access_token, lastSyncAt: new Date() },
          update: { status: 'CONNECTED', accessToken: tokenRes.data.access_token, lastSyncAt: new Date() },
        });
        return res.json({ success: true, message: 'Facebook Ads connected via OAuth' });
      }
      default:
        return res.status(400).json({ success: false, error: `OAuth callback not supported for ${platform}` });
    }
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).json({ success: false, error: 'OAuth callback failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Platform connect helpers
// ─────────────────────────────────────────────────────────────────────────────

async function connectShopify(res: Response, organizationId: string, credentials: any) {
  const { shopDomain, accessToken } = credentials;
  if (!shopDomain || !accessToken) {
    return res.status(400).json({ success: false, error: 'Shop domain and access token required' });
  }
  if (!/^[a-zA-Z0-9-]+$/.test(shopDomain)) {
    return res.status(400).json({ success: false, error: 'Invalid shop domain format' });
  }
  try {
    const testRes = await axios.get(`https://${shopDomain}.myshopify.com/admin/api/2023-10/shop.json`, {
      headers: { 'X-Shopify-Access-Token': accessToken }
    });
    if (!testRes.data?.shop) throw new Error('Bad response');
  } catch {
    return res.status(400).json({ success: false, error: 'Failed to connect to Shopify store. Check your credentials.' });
  }
  const integration = await prisma.integration.upsert({
    where: { organizationId_platform: { organizationId, platform: 'SHOPIFY' } },
    create: { organizationId, platform: 'SHOPIFY', status: 'CONNECTED', accessToken, metadata: meta({ shopDomain }), lastSyncAt: new Date() },
    update: { status: 'CONNECTED', accessToken, metadata: meta({ shopDomain }), lastSyncAt: new Date() },
  });
  return res.json({ success: true, data: { integrationId: integration.id, status: integration.status, message: 'Shopify store connected successfully!' } });
}

async function connectStripe(res: Response, organizationId: string, credentials: any) {
  const { secretKey, publishableKey } = credentials;
  if (!secretKey || !publishableKey) return res.status(400).json({ success: false, error: 'Secret key and publishable key required' });
  if (!secretKey.startsWith('sk_')) return res.status(400).json({ success: false, error: 'Invalid secret key format' });
  try {
    const stripe = new Stripe(secretKey);
    await stripe.accounts.retrieve();
  } catch {
    return res.status(400).json({ success: false, error: 'Failed to connect to Stripe. Check your secret key.' });
  }
  const integration = await prisma.integration.upsert({
    where: { organizationId_platform: { organizationId, platform: 'STRIPE' } },
    create: { organizationId, platform: 'STRIPE', status: 'CONNECTED', accessToken: secretKey, config: meta({ publishableKey: `${publishableKey.substring(0, 20)}...` }), lastSyncAt: new Date() },
    update: { status: 'CONNECTED', accessToken: secretKey, config: meta({ publishableKey: `${publishableKey.substring(0, 20)}...` }), lastSyncAt: new Date() },
  });
  return res.json({ success: true, data: { integrationId: integration.id, status: integration.status, message: 'Stripe connected successfully!' } });
}

async function connectGoogleAnalytics(res: Response, organizationId: string, credentials: any) {
  const { propertyId: reqPropertyId, serviceAccountKey: bodyKey } = credentials;
  const finalPropertyId = reqPropertyId || process.env.GA4_PROPERTY_ID;
  if (!finalPropertyId) return res.status(400).json({ success: false, error: 'GA4 Property ID required' });

  let serviceAccountKey: any;
  try {
    serviceAccountKey = typeof bodyKey === 'string' ? JSON.parse(bodyKey) : bodyKey;
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid service account key JSON' });
  }
  if (!serviceAccountKey) return res.status(400).json({ success: false, error: 'Service account key required' });

  try {
    const accessToken = await getGoogleAccessToken(serviceAccountKey);
    await axios.post(
      `https://analyticsdata.googleapis.com/v1beta/properties/${finalPropertyId}:runReport`,
      { dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }], metrics: [{ name: 'sessions' }] },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || 'Connection failed';
    if (msg.includes('PERMISSION_DENIED') || msg.includes('403')) {
      return res.status(403).json({ success: false, error: 'Permission denied. Ensure the service account has Viewer access in Google Analytics.' });
    }
    return res.status(400).json({ success: false, error: `Failed to connect to Google Analytics: ${msg}` });
  }

  const encodedKey = Buffer.from(JSON.stringify(serviceAccountKey)).toString('base64');
  const integration = await prisma.integration.upsert({
    where: { organizationId_platform: { organizationId, platform: 'GOOGLE_ANALYTICS' } },
    create: { organizationId, platform: 'GOOGLE_ANALYTICS', status: 'CONNECTED', accessToken: 'SERVICE_ACCOUNT', config: meta({ serviceAccountKey: encodedKey, propertyId: finalPropertyId, serviceAccountEmail: serviceAccountKey.client_email }), lastSyncAt: new Date() },
    update: { status: 'CONNECTED', accessToken: 'SERVICE_ACCOUNT', config: meta({ serviceAccountKey: encodedKey, propertyId: finalPropertyId, serviceAccountEmail: serviceAccountKey.client_email }), lastSyncAt: new Date() },
  });
  return res.json({ success: true, data: { integrationId: integration.id, propertyId: finalPropertyId, serviceAccountEmail: serviceAccountKey.client_email, message: 'Google Analytics connected successfully!' } });
}

async function connectFacebookAds(res: Response, organizationId: string, credentials: any) {
  const { accessToken, adAccountId } = credentials;
  if (!accessToken || !adAccountId) return res.status(400).json({ success: false, error: 'Access token and ad account ID required' });
  try {
    const testRes = await axios.get(`https://graph.facebook.com/v18.0/${adAccountId}`, {
      params: { access_token: accessToken, fields: 'id,name,account_status' }
    });
    if (!testRes.data?.id) throw new Error('Invalid response');
  } catch {
    return res.status(400).json({ success: false, error: 'Failed to connect to Facebook Ads. Check your credentials.' });
  }
  const integration = await prisma.integration.upsert({
    where: { organizationId_platform: { organizationId, platform: 'FACEBOOK_ADS' } },
    create: { organizationId, platform: 'FACEBOOK_ADS', status: 'CONNECTED', accessToken, metadata: meta({ adAccountId }), lastSyncAt: new Date() },
    update: { status: 'CONNECTED', accessToken, metadata: meta({ adAccountId }), lastSyncAt: new Date() },
  });
  return res.json({ success: true, data: { integrationId: integration.id, status: integration.status, message: 'Facebook Ads connected successfully!' } });
}

async function connectWooCommerce(res: Response, organizationId: string, credentials: any) {
  const { storeUrl, consumerKey, consumerSecret } = credentials;
  if (!storeUrl || !consumerKey || !consumerSecret) return res.status(400).json({ success: false, error: 'Store URL, consumer key, and consumer secret required' });
  const normalizedUrl = storeUrl.replace(/\/$/, '');
  try {
    await axios.get(`${normalizedUrl}/wp-json/wc/v3/system_status`, { auth: { username: consumerKey, password: consumerSecret } });
  } catch {
    return res.status(400).json({ success: false, error: 'Failed to connect to WooCommerce store. Check your credentials.' });
  }
  const integration = await prisma.integration.upsert({
    where: { organizationId_platform: { organizationId, platform: 'WOOCOMMERCE' } },
    create: { organizationId, platform: 'WOOCOMMERCE', status: 'CONNECTED', accessToken: consumerKey, metadata: meta({ storeUrl: normalizedUrl, consumerSecret }), lastSyncAt: new Date() },
    update: { status: 'CONNECTED', accessToken: consumerKey, metadata: meta({ storeUrl: normalizedUrl, consumerSecret }), lastSyncAt: new Date() },
  });
  return res.json({ success: true, data: { integrationId: integration.id, status: integration.status, message: 'WooCommerce connected successfully!' } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform sync helpers
// ─────────────────────────────────────────────────────────────────────────────

async function syncShopify(res: Response, organizationId: string) {
  const integration = await prisma.integration.findUnique({
    where: { organizationId_platform: { organizationId, platform: 'SHOPIFY' } }
  });
  if (!integration || integration.status !== 'CONNECTED') {
    return res.status(404).json({ success: false, error: 'Shopify integration not found or not connected' });
  }

  await prisma.integration.update({ where: { id: integration.id }, data: { status: 'SYNCING' } });
  try {
    const { shopDomain } = parseMeta(integration.metadata);
    const baseUrl = `https://${shopDomain}.myshopify.com/admin/api/2023-10`;
    const headers = { 'X-Shopify-Access-Token': integration.accessToken };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [ordersRes, productsRes, customersRes] = await Promise.all([
      axios.get(`${baseUrl}/orders.json?status=any&limit=250&financial_status=paid`, { headers }),
      axios.get(`${baseUrl}/products.json?limit=250`, { headers }),
      axios.get(`${baseUrl}/customers.json?limit=250&created_at_min=${thirtyDaysAgo}`, { headers }),
    ]);

    const orders = ordersRes.data.orders || [];
    const products = productsRes.data.products || [];
    const customers = customersRes.data.customers || [];

    await prisma.dataPoint.deleteMany({ where: { integrationId: integration.id, organizationId } });

    const now = new Date();
    const dataPoints: any[] = [];

    const revenueByDate = new Map<string, { revenue: number; count: number }>();
    for (const order of orders) {
      const date = new Date(order.created_at).toISOString().split('T')[0];
      if (!revenueByDate.has(date)) revenueByDate.set(date, { revenue: 0, count: 0 });
      const day = revenueByDate.get(date)!;
      day.revenue += parseFloat(order.total_price || '0');
      day.count += 1;
    }
    for (const [date, day] of revenueByDate.entries()) {
      dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'revenue',  value: day.revenue, metadata: meta({ source: 'shopify' }), dateRecorded: new Date(date) });
      dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'orders',   value: day.count,   metadata: meta({ source: 'shopify' }), dateRecorded: new Date(date) });
    }
    if (products.length > 0)  dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'products_total',  value: products.length,  metadata: meta({ source: 'shopify' }), dateRecorded: now });
    if (customers.length > 0) dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'customers_total', value: customers.length, metadata: meta({ source: 'shopify', period: '30_days' }), dateRecorded: now });

    if (dataPoints.length > 0) await prisma.dataPoint.createMany({ data: dataPoints });
    await prisma.integration.update({ where: { id: integration.id }, data: { status: 'CONNECTED', lastSyncAt: now } });

    return res.json({ success: true, data: { ordersProcessed: orders.length, productsProcessed: products.length, customersProcessed: customers.length, dataPointsCreated: dataPoints.length } });
  } catch (error) {
    await prisma.integration.update({ where: { id: integration.id }, data: { status: 'CONNECTED' } });
    throw error;
  }
}

async function syncStripe(res: Response, organizationId: string) {
  const integration = await prisma.integration.findUnique({
    where: { organizationId_platform: { organizationId, platform: 'STRIPE' } }
  });
  if (!integration || integration.status !== 'CONNECTED') {
    return res.status(404).json({ success: false, error: 'Stripe integration not found or not connected' });
  }

  const stripe = new Stripe(integration.accessToken);
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  const [charges, customers] = await Promise.all([
    stripe.charges.list({ created: { gte: thirtyDaysAgo }, limit: 100 }),
    stripe.customers.list({ created: { gte: thirtyDaysAgo }, limit: 100 }),
  ]);

  await prisma.dataPoint.deleteMany({ where: { integrationId: integration.id, organizationId } });

  const dataPoints: any[] = [];
  const revenueByDate = new Map<string, { revenue: number; count: number }>();
  for (const charge of charges.data) {
    if (charge.status === 'succeeded') {
      const date = new Date(charge.created * 1000).toISOString().split('T')[0];
      if (!revenueByDate.has(date)) revenueByDate.set(date, { revenue: 0, count: 0 });
      const day = revenueByDate.get(date)!;
      day.revenue += charge.amount / 100;
      day.count += 1;
    }
  }
  for (const [date, day] of revenueByDate.entries()) {
    dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'revenue', value: day.revenue, metadata: meta({ source: 'stripe' }), dateRecorded: new Date(date) });
    dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'orders',  value: day.count,   metadata: meta({ source: 'stripe' }), dateRecorded: new Date(date) });
  }
  dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'customers_total', value: customers.data.length, metadata: meta({ source: 'stripe' }), dateRecorded: new Date() });

  if (dataPoints.length > 0) await prisma.dataPoint.createMany({ data: dataPoints });
  await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });

  return res.json({ success: true, data: { chargesProcessed: charges.data.length, customersProcessed: customers.data.length, dataPointsCreated: dataPoints.length } });
}

async function syncGoogleAnalytics(res: Response, organizationId: string) {
  const integration = await prisma.integration.findFirst({
    where: { organizationId, platform: 'GOOGLE_ANALYTICS', status: 'CONNECTED' }
  });
  if (!integration) return res.status(404).json({ success: false, error: 'Google Analytics integration not found' });

  const config = parseMeta(integration.config);
  const { serviceAccountKey: encodedKey, propertyId } = config;
  if (!encodedKey || !propertyId) return res.status(400).json({ success: false, error: 'Invalid integration configuration' });

  const serviceAccount = JSON.parse(Buffer.from(encodedKey, 'base64').toString());
  const accessToken = await getGoogleAccessToken(serviceAccount);
  const gaBase = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}`;
  const headers = { Authorization: `Bearer ${accessToken}` };
  const dateRange = { startDate: '30daysAgo', endDate: 'today' };

  const [summaryRes, pagesRes, sourcesRes, dailyRes] = await Promise.all([
    axios.post(`${gaBase}:runReport`, { dateRanges: [dateRange], metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }] }, { headers }),
    axios.post(`${gaBase}:runReport`, { dateRanges: [dateRange], dimensions: [{ name: 'pagePath' }], metrics: [{ name: 'screenPageViews' }], orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 10 }, { headers }),
    axios.post(`${gaBase}:runReport`, { dateRanges: [dateRange], dimensions: [{ name: 'sessionDefaultChannelGroup' }], metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }, { headers }),
    axios.post(`${gaBase}:runReport`, { dateRanges: [dateRange], dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }], orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }] }, { headers }),
  ]);

  const metrics = summaryRes.data.rows?.[0]?.metricValues || [];
  const analyticsData = {
    sessions:           parseInt(metrics[0]?.value || '0'),
    pageviews:          parseInt(metrics[1]?.value || '0'),
    users:              parseInt(metrics[2]?.value || '0'),
    bounceRate:         parseFloat(metrics[3]?.value || '0').toFixed(2),
    avgSessionDuration: parseInt(metrics[4]?.value || '0'),
    topPages:       (pagesRes.data.rows   || []).slice(0, 10).map((r: any) => ({ page: r.dimensionValues?.[0]?.value || '/', views: parseInt(r.metricValues?.[0]?.value || '0') })),
    trafficSources: (sourcesRes.data.rows || []).map((r: any) => ({ source: r.dimensionValues?.[0]?.value || 'Unknown', sessions: parseInt(r.metricValues?.[0]?.value || '0') })),
    dailyTrend:     (dailyRes.data.rows   || []).map((r: any) => ({ date: r.dimensionValues?.[0]?.value || '', sessions: parseInt(r.metricValues?.[0]?.value || '0') })),
  };

  await prisma.dataPoint.deleteMany({ where: { integrationId: integration.id, organizationId, metricType: 'ga_snapshot' } });
  await prisma.dataPoint.create({
    data: { organizationId, integrationId: integration.id, metricType: 'ga_snapshot', value: analyticsData.sessions, dateRecorded: new Date(), metadata: meta(analyticsData) }
  });
  await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });

  return res.json({ success: true, data: { sessions: analyticsData.sessions, users: analyticsData.users, pageviews: analyticsData.pageviews, syncedAt: new Date().toISOString() } });
}

async function syncFacebookAds(res: Response, organizationId: string) {
  const integration = await prisma.integration.findUnique({
    where: { organizationId_platform: { organizationId, platform: 'FACEBOOK_ADS' } }
  });
  if (!integration || integration.status !== 'CONNECTED') {
    return res.status(404).json({ success: false, error: 'Facebook Ads integration not found' });
  }

  const { adAccountId } = parseMeta(integration.metadata);
  const insightsRes = await axios.get(`https://graph.facebook.com/v18.0/${adAccountId}/insights`, {
    params: { access_token: integration.accessToken, fields: 'spend,impressions,clicks,reach', date_preset: 'last_30d', time_increment: 1 }
  });

  const insights = insightsRes.data.data || [];
  await prisma.dataPoint.deleteMany({ where: { integrationId: integration.id, organizationId } });
  const dataPoints = insights.map((day: any) => ({
    integrationId: integration.id, organizationId,
    metricType: 'ad_spend', value: parseFloat(day.spend || '0'),
    metadata: meta({ impressions: day.impressions, clicks: day.clicks, reach: day.reach }),
    dateRecorded: new Date(day.date_start),
  }));
  if (dataPoints.length > 0) await prisma.dataPoint.createMany({ data: dataPoints });
  await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });

  return res.json({ success: true, data: { daysProcessed: insights.length, dataPointsCreated: dataPoints.length } });
}

async function syncWooCommerce(res: Response, organizationId: string) {
  const integration = await prisma.integration.findUnique({
    where: { organizationId_platform: { organizationId, platform: 'WOOCOMMERCE' } }
  });
  if (!integration || integration.status !== 'CONNECTED') {
    return res.status(404).json({ success: false, error: 'WooCommerce integration not found' });
  }

  const { storeUrl, consumerSecret } = parseMeta(integration.metadata);
  const auth = { username: integration.accessToken, password: consumerSecret };

  const [ordersRes, productsRes, customersRes] = await Promise.all([
    axios.get(`${storeUrl}/wp-json/wc/v3/orders`,    { auth, params: { per_page: 100, status: 'completed' } }),
    axios.get(`${storeUrl}/wp-json/wc/v3/products`,  { auth, params: { per_page: 100 } }),
    axios.get(`${storeUrl}/wp-json/wc/v3/customers`, { auth, params: { per_page: 100 } }),
  ]);

  const orders    = ordersRes.data    || [];
  const products  = productsRes.data  || [];
  const customers = customersRes.data || [];

  await prisma.dataPoint.deleteMany({ where: { integrationId: integration.id, organizationId } });
  const now = new Date();
  const dataPoints: any[] = [];

  const revenueByDate = new Map<string, { revenue: number; count: number }>();
  for (const order of orders) {
    const date = new Date(order.date_created).toISOString().split('T')[0];
    if (!revenueByDate.has(date)) revenueByDate.set(date, { revenue: 0, count: 0 });
    const day = revenueByDate.get(date)!;
    day.revenue += parseFloat(order.total || '0');
    day.count += 1;
  }
  for (const [date, day] of revenueByDate.entries()) {
    dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'revenue', value: day.revenue, metadata: meta({ source: 'woocommerce' }), dateRecorded: new Date(date) });
    dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'orders',  value: day.count,   metadata: meta({ source: 'woocommerce' }), dateRecorded: new Date(date) });
  }
  dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'products_total',  value: products.length,  metadata: meta({ source: 'woocommerce' }), dateRecorded: now });
  dataPoints.push({ integrationId: integration.id, organizationId, metricType: 'customers_total', value: customers.length, metadata: meta({ source: 'woocommerce' }), dateRecorded: now });

  if (dataPoints.length > 0) await prisma.dataPoint.createMany({ data: dataPoints });
  await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: now } });

  return res.json({ success: true, data: { ordersProcessed: orders.length, productsProcessed: products.length, customersProcessed: customers.length, dataPointsCreated: dataPoints.length } });
}

// ─────────────────────────────────────────────────────────────────────────────
// Google service-account JWT helper
// ─────────────────────────────────────────────────────────────────────────────

async function getGoogleAccessToken(serviceAccountKey: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccountKey.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const signed = jwt.sign(payload, serviceAccountKey.private_key, { algorithm: 'RS256' });
  const tokenRes = await axios.post('https://oauth2.googleapis.com/token', null, {
    params: { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: signed }
  });
  return tokenRes.data.access_token;
}

export default router;
