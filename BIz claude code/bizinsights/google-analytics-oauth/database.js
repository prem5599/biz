const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Encryption key for sensitive data
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
const IV_LENGTH = 16;

// Encrypt sensitive data
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipher('aes-256-cbc', ENCRYPTION_KEY);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt sensitive data
function decrypt(text) {
  if (!text) return null;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = textParts.join(':');
  const decipher = crypto.createDecipher('aes-256-cbc', ENCRYPTION_KEY);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Database schema
const createTables = async () => {
  const client = await pool.connect();
  
  try {
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // OAuth tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expiry_date BIGINT,
        token_type VARCHAR(50) DEFAULT 'Bearer',
        scope TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Analytics accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_accounts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
        account_id VARCHAR(255) NOT NULL,
        account_name VARCHAR(255),
        properties JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, account_id)
      )
    `);

    // Analytics reports cache table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics_reports (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
        property_id VARCHAR(255) NOT NULL,
        report_type VARCHAR(100) NOT NULL,
        date_range VARCHAR(50) NOT NULL,
        report_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    // Indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_accounts_user_id ON analytics_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_reports_user_property ON analytics_reports(user_id, property_id);
      CREATE INDEX IF NOT EXISTS idx_analytics_reports_expires ON analytics_reports(expires_at);
    `);

    console.log('Database tables created successfully');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    client.release();
  }
};

// Database helper functions
class GoogleAnalyticsDB {
  // Store user
  static async storeUser(userId, email = null, name = null) {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO users (user_id, email, name) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (user_id) 
         DO UPDATE SET email = $2, name = $3, updated_at = CURRENT_TIMESTAMP`,
        [userId, email, name]
      );
    } finally {
      client.release();
    }
  }

  // Store OAuth tokens
  static async storeTokens(userId, tokens) {
    const client = await pool.connect();
    try {
      // Encrypt sensitive tokens
      const encryptedAccessToken = encrypt(tokens.access_token);
      const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;

      await client.query(
        `INSERT INTO oauth_tokens (user_id, access_token, refresh_token, expiry_date, token_type, scope) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (user_id) 
         DO UPDATE SET 
           access_token = $2, 
           refresh_token = $3, 
           expiry_date = $4, 
           token_type = $5, 
           scope = $6,
           updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          encryptedAccessToken,
          encryptedRefreshToken,
          tokens.expiry_date,
          tokens.token_type || 'Bearer',
          tokens.scope
        ]
      );
    } finally {
      client.release();
    }
  }

  // Get user tokens
  static async getTokens(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM oauth_tokens WHERE user_id = $1',
        [userId]
      );
      
      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        access_token: decrypt(row.access_token),
        refresh_token: row.refresh_token ? decrypt(row.refresh_token) : null,
        expiry_date: row.expiry_date,
        token_type: row.token_type,
        scope: row.scope,
        storedAt: row.updated_at
      };
    } finally {
      client.release();
    }
  }

  // Store Analytics accounts
  static async storeAnalyticsAccounts(userId, accounts) {
    const client = await pool.connect();
    try {
      for (const account of accounts) {
        await client.query(
          `INSERT INTO analytics_accounts (user_id, account_id, account_name, properties) 
           VALUES ($1, $2, $3, $4) 
           ON CONFLICT (user_id, account_id) 
           DO UPDATE SET 
             account_name = $3, 
             properties = $4,
             updated_at = CURRENT_TIMESTAMP`,
          [userId, account.id, account.name, JSON.stringify(account.properties || [])]
        );
      }
    } finally {
      client.release();
    }
  }

  // Get user's Analytics accounts
  static async getAnalyticsAccounts(userId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM analytics_accounts WHERE user_id = $1',
        [userId]
      );
      
      return result.rows.map(row => ({
        id: row.account_id,
        name: row.account_name,
        properties: row.properties || []
      }));
    } finally {
      client.release();
    }
  }

  // Store report data (with caching)
  static async storeReport(userId, propertyId, reportType, dateRange, reportData, ttlMinutes = 60) {
    const client = await pool.connect();
    try {
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
      
      await client.query(
        `INSERT INTO analytics_reports (user_id, property_id, report_type, date_range, report_data, expires_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, propertyId, reportType, dateRange, JSON.stringify(reportData), expiresAt]
      );
    } finally {
      client.release();
    }
  }

  // Get cached report data
  static async getCachedReport(userId, propertyId, reportType, dateRange) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT report_data FROM analytics_reports WHERE user_id = $1 AND property_id = $2 AND report_type = $3 AND date_range = $4 AND expires_at > NOW()',
        [userId, propertyId, reportType, dateRange]
      );
      
      if (result.rows.length === 0) return null;
      return result.rows[0].report_data;
    } finally {
      client.release();
    }
  }

  // Clean expired reports
  static async cleanExpiredReports() {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'DELETE FROM analytics_reports WHERE expires_at < NOW()'
      );
      console.log(`Cleaned ${result.rowCount} expired reports`);
    } finally {
      client.release();
    }
  }

  // Delete user data
  static async deleteUser(userId) {
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM users WHERE user_id = $1', [userId]);
    } finally {
      client.release();
    }
  }

  // Get all users with valid tokens
  static async getUsersWithValidTokens() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT u.user_id, u.email, u.name, t.expiry_date 
        FROM users u 
        JOIN oauth_tokens t ON u.user_id = t.user_id 
        WHERE t.expiry_date > $1 OR t.refresh_token IS NOT NULL
      `, [Date.now()]);
      
      return result.rows;
    } finally {
      client.release();
    }
  }
}

module.exports = {
  pool,
  createTables,
  GoogleAnalyticsDB,
  encrypt,
  decrypt
};