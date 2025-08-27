const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const cors = require('cors');
const { ShopifyDB, createTables } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

// Initialize database on startup
createTables();

// In-memory state store (for OAuth state validation)
const stateStore = new Map();

// Shopify app configuration
const SHOPIFY_CONFIG = {
  clientId: process.env.SHOPIFY_CLIENT_ID,
  clientSecret: process.env.SHOPIFY_CLIENT_SECRET,
  redirectUri: process.env.SHOPIFY_REDIRECT_URI || 'http://localhost:3000/callback',
  scopes: 'read_products,read_orders,write_orders,read_customers,write_webhooks'
};

// HMAC validation helper
function validateHMAC(query, secret) {
  const { hmac, ...params } = query;
  
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(hmac, 'hex'),
    Buffer.from(computedHmac, 'hex')
  );
}

// Generate OAuth authorization URL
function generateOAuthURL(shop, state) {
  const params = new URLSearchParams({
    client_id: SHOPIFY_CONFIG.clientId,
    scope: SHOPIFY_CONFIG.scopes,
    redirect_uri: SHOPIFY_CONFIG.redirectUri,
    state: state,
    'grant_options[]': 'per-user'
  });
  
  return `https://${shop}.myshopify.com/admin/oauth/authorize?${params.toString()}`;
}

// Routes
app.get('/auth', (req, res) => {
  const { shop } = req.query;
  
  if (!shop) {
    return res.status(400).json({ error: 'Shop parameter is required' });
  }
  
  const shopRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
  if (!shopRegex.test(shop)) {
    return res.status(400).json({ error: 'Invalid shop domain' });
  }
  
  const state = crypto.randomBytes(32).toString('hex');
  stateStore.set(`state_${state}`, { shop, timestamp: Date.now() });
  
  // Clean up old states (older than 10 minutes)
  setTimeout(() => stateStore.delete(`state_${state}`), 10 * 60 * 1000);
  
  const authURL = generateOAuthURL(shop, state);
  
  res.json({ authURL });
});

app.get('/callback', async (req, res) => {
  try {
    const { code, hmac, state, shop, timestamp } = req.query;
    
    if (!code || !hmac || !state || !shop) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const storedState = stateStore.get(`state_${state}`);
    if (!storedState || storedState.shop !== shop) {
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    stateStore.delete(`state_${state}`);
    
    if (!validateHMAC(req.query, SHOPIFY_CONFIG.clientSecret)) {
      return res.status(400).json({ error: 'HMAC validation failed' });
    }
    
    // Exchange code for access token
    const tokenResponse = await axios.post(`https://${shop}.myshopify.com/admin/oauth/access_token`, {
      client_id: SHOPIFY_CONFIG.clientId,
      client_secret: SHOPIFY_CONFIG.clientSecret,
      code: code
    });
    
    const { access_token, scope } = tokenResponse.data;
    
    // Store token in database
    await ShopifyDB.storeShopToken(shop, access_token, scope);
    
    // Register webhook for orders/create
    await registerWebhook(shop, access_token);
    
    res.json({ 
      success: true, 
      message: 'App installed successfully',
      shop: shop,
      scope: scope
    });
    
  } catch (error) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Installation failed',
      details: error.response?.data || error.message
    });
  }
});

// Get shop's products using GraphQL
app.get('/products/:shop', async (req, res) => {
  try {
    const { shop } = req.params;
    const { limit = 10, cursor } = req.query;
    
    const shopData = await ShopifyDB.getShopToken(shop);
    if (!shopData) {
      return res.status(404).json({ error: 'Shop not found or not authenticated' });
    }
    
    const query = `
      query getProducts($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            node {
              id
              title
              handle
              status
              vendor
              productType
              createdAt
              updatedAt
              totalInventory
              images(first: 1) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    inventoryQuantity
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `;
    
    const variables = {
      first: parseInt(limit),
      ...(cursor && { after: cursor })
    };
    
    const response = await axios.post(
      `https://${shop}.myshopify.com/admin/api/2024-01/graphql.json`,
      { query, variables },
      {
        headers: {
          'X-Shopify-Access-Token': shopData.access_token,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json(response.data);
    
  } catch (error) {
    console.error('Products API error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.response?.data || error.message
    });
  }
});

// Webhook registration helper
async function registerWebhook(shop, accessToken) {
  try {
    const webhookData = {
      webhook: {
        topic: 'orders/create',
        address: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/webhooks/orders/create`,
        format: 'json'
      }
    };
    
    const response = await axios.post(
      `https://${shop}.myshopify.com/admin/api/2024-01/webhooks.json`,
      webhookData,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // Store webhook registration in database
    await ShopifyDB.storeWebhook(
      shop,
      response.data.webhook.id,
      'orders/create',
      webhookData.webhook.address
    );
    
    console.log(`Webhook registered for shop: ${shop}`);
  } catch (error) {
    console.error('Webhook registration error:', error.response?.data || error.message);
  }
}

// Webhook endpoint for orders/create
app.post('/webhooks/orders/create', async (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-Sha256');
    const shop = req.get('X-Shopify-Shop-Domain');
    
    const calculated_hmac = crypto
      .createHmac('sha256', SHOPIFY_CONFIG.clientSecret)
      .update(JSON.stringify(req.body))
      .digest('base64');
    
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(calculated_hmac))) {
      return res.status(401).json({ error: 'Webhook verification failed' });
    }
    
    // Store order in database
    await ShopifyDB.storeOrder(shop, req.body);
    
    console.log('New order received and stored:', {
      shop: shop,
      orderId: req.body.id,
      orderName: req.body.name,
      totalPrice: req.body.total_price
    });
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Get all connected shops
app.get('/shops', async (req, res) => {
  try {
    const shops = await ShopifyDB.getAllShops();
    res.json({ shops });
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

app.listen(PORT, () => {
  console.log(`Shopify OAuth server running on port ${PORT}`);
  console.log(`OAuth callback URL: http://localhost:${PORT}/callback`);
  console.log(`Webhook URL: http://localhost:${PORT}/webhooks/orders/create`);
});

module.exports = app;