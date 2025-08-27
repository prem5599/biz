const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Database schema
const createTables = async () => {
  const client = await pool.connect();
  
  try {
    // Shops table for storing access tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        shop_domain VARCHAR(255) UNIQUE NOT NULL,
        access_token TEXT NOT NULL,
        scope TEXT NOT NULL,
        installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Webhooks table for tracking registered webhooks
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id SERIAL PRIMARY KEY,
        shop_domain VARCHAR(255) REFERENCES shops(shop_domain),
        webhook_id BIGINT NOT NULL,
        topic VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Orders table for storing webhook data
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        shop_domain VARCHAR(255) REFERENCES shops(shop_domain),
        shopify_order_id BIGINT NOT NULL,
        order_name VARCHAR(50),
        total_price DECIMAL(10,2),
        currency VARCHAR(3),
        financial_status VARCHAR(50),
        fulfillment_status VARCHAR(50),
        customer_email VARCHAR(255),
        order_data JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    client.release();
  }
};

// Database helper functions
class ShopifyDB {
  // Store shop access token
  static async storeShopToken(shopDomain, accessToken, scope) {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO shops (shop_domain, access_token, scope) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (shop_domain) 
         DO UPDATE SET access_token = $2, scope = $3, updated_at = CURRENT_TIMESTAMP`,
        [shopDomain, accessToken, scope]
      );
    } finally {
      client.release();
    }
  }
  
  // Get shop access token
  static async getShopToken(shopDomain) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM shops WHERE shop_domain = $1',
        [shopDomain]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }
  
  // Store webhook registration
  static async storeWebhook(shopDomain, webhookId, topic, address) {
    const client = await pool.connect();
    try {
      await client.query(
        'INSERT INTO webhooks (shop_domain, webhook_id, topic, address) VALUES ($1, $2, $3, $4)',
        [shopDomain, webhookId, topic, address]
      );
    } finally {
      client.release();
    }
  }
  
  // Store order from webhook
  static async storeOrder(shopDomain, orderData) {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO orders (
          shop_domain, shopify_order_id, order_name, total_price, 
          currency, financial_status, fulfillment_status, 
          customer_email, order_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          shopDomain,
          orderData.id,
          orderData.name,
          parseFloat(orderData.total_price),
          orderData.currency,
          orderData.financial_status,
          orderData.fulfillment_status,
          orderData.customer?.email,
          JSON.stringify(orderData)
        ]
      );
    } finally {
      client.release();
    }
  }
  
  // Get all connected shops
  static async getAllShops() {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT shop_domain, scope, installed_at FROM shops');
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = {
  pool,
  createTables,
  ShopifyDB
};