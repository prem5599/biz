import crypto from 'crypto'

/**
 * Shopify OAuth Security Utilities
 * Handles HMAC validation, state generation, and token exchange
 */

export interface ShopifyOAuthConfig {
  apiKey: string
  apiSecret: string
  scopes: string
  redirectUri: string
}

export interface ShopifyTokenResponse {
  access_token: string
  scope: string
}

export interface ShopifyShopData {
  shop: {
    id: number
    name: string
    email: string
    domain: string
    province: string
    country: string
    address1: string
    zip: string
    city: string
    phone: string
    created_at: string
    updated_at: string
    country_code: string
    country_name: string
    currency: string
    customer_email: string
    timezone: string
    shop_owner: string
    money_format: string
    money_with_currency_format: string
    weight_unit: string
    province_code: string
    plan_name: string
    plan_display_name: string
    myshopify_domain: string
  }
}

/**
 * Generate a secure random state parameter for CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Generate a nonce for additional security
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Validate HMAC signature from Shopify
 * This ensures the request actually came from Shopify
 */
export function validateHmac(query: Record<string, string>, secret: string): boolean {
  const { hmac, ...params } = query

  if (!hmac) {
    return false
  }

  // Sort parameters alphabetically and create query string
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')

  // Generate HMAC
  const computedHmac = crypto
    .createHmac('sha256', secret)
    .update(sortedParams)
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(hmac, 'hex'),
      Buffer.from(computedHmac, 'hex')
    )
  } catch (error) {
    return false
  }
}

/**
 * Build Shopify OAuth authorization URL
 */
export function buildAuthorizationUrl(
  shop: string,
  config: ShopifyOAuthConfig,
  state: string,
  nonce: string
): string {
  // Ensure shop domain is properly formatted
  const shopDomain = shop.includes('.myshopify.com')
    ? shop
    : `${shop}.myshopify.com`

  const params = new URLSearchParams({
    client_id: config.apiKey,
    scope: config.scopes,
    redirect_uri: config.redirectUri,
    state: state,
    grant_options: nonce,
  })

  return `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  shop: string,
  code: string,
  config: ShopifyOAuthConfig
): Promise<ShopifyTokenResponse> {
  const shopDomain = shop.includes('.myshopify.com')
    ? shop
    : `${shop}.myshopify.com`

  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.apiKey,
      client_secret: config.apiSecret,
      code: code,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to exchange code for token: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data
}

/**
 * Fetch shop information from Shopify API
 */
export async function fetchShopData(
  shop: string,
  accessToken: string
): Promise<ShopifyShopData> {
  const shopDomain = shop.includes('.myshopify.com')
    ? shop
    : `${shop}.myshopify.com`

  const response = await fetch(`https://${shopDomain}/admin/api/2024-01/shop.json`, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch shop data: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data
}

/**
 * Validate shop domain format
 */
export function validateShopDomain(shop: string): boolean {
  // Shop should be alphanumeric with hyphens
  const shopName = shop.replace('.myshopify.com', '')
  const shopPattern = /^[a-zA-Z0-9-]+$/
  return shopPattern.test(shopName)
}

/**
 * Sanitize shop domain (remove .myshopify.com if present)
 */
export function sanitizeShopDomain(shop: string): string {
  return shop.replace('.myshopify.com', '').toLowerCase()
}

/**
 * Encrypt sensitive data before storing in database
 */
export function encryptToken(token: string, encryptionKey: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(encryptionKey, 'salt', 32)
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(algorithm, key, iv)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  // Return IV + encrypted data
  return iv.toString('hex') + ':' + encrypted
}

/**
 * Decrypt sensitive data when retrieving from database
 */
export function decryptToken(encryptedToken: string, encryptionKey: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(encryptionKey, 'salt', 32)

  const parts = encryptedToken.split(':')
  const iv = Buffer.from(parts[0], 'hex')
  const encrypted = parts[1]

  const decipher = crypto.createDecipheriv(algorithm, key, iv)
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * Get Shopify OAuth configuration from environment variables
 */
export function getShopifyConfig(): ShopifyOAuthConfig {
  const apiKey = process.env.SHOPIFY_API_KEY || process.env.SHOPIFY_CLIENT_ID
  const apiSecret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL

  if (!apiKey || !apiSecret || !appUrl) {
    throw new Error('Missing required Shopify OAuth configuration. Please set SHOPIFY_API_KEY, SHOPIFY_API_SECRET, and NEXT_PUBLIC_APP_URL in your environment variables.')
  }

  return {
    apiKey,
    apiSecret,
    scopes: process.env.SHOPIFY_SCOPES || 'read_products,read_orders,read_customers,read_analytics',
    redirectUri: `${appUrl}/api/integrations/shopify/oauth/callback`,
  }
}
