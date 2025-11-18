/**
 * Encryption Service
 * AES-256-GCM encryption for sensitive data (tokens, credentials)
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

/**
 * Get encryption key from environment
 * Must be 32 bytes (256 bits) for AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }

  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }

  // Derive a proper 256-bit key using PBKDF2
  return crypto.pbkdf2Sync(key, 'bizinsights-salt', 100000, 32, 'sha256');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param text - Plain text to encrypt
 * @returns Base64 encoded encrypted string
 */
export function encrypt(text: string): string {
  if (!text) {
    throw new Error('Cannot encrypt empty text');
  }

  try {
    const key = getEncryptionKey();

    // Generate random IV and salt
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // Encrypt the text
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final(),
    ]);

    // Get authentication tag
    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted
    const result = Buffer.concat([salt, iv, tag, encrypted]);

    // Return as base64
    return result.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt AES-256-GCM encrypted data
 * @param encryptedText - Base64 encoded encrypted string
 * @returns Decrypted plain text
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error('Cannot decrypt empty text');
  }

  try {
    const key = getEncryptionKey();

    // Convert from base64
    const buffer = Buffer.from(encryptedText, 'base64');

    // Extract components
    const salt = buffer.subarray(0, SALT_LENGTH);
    const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION);
    const tag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION);
    const encrypted = buffer.subarray(ENCRYPTED_POSITION);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash data using SHA-256 (for non-reversible hashing)
 * @param text - Text to hash
 * @returns Hex encoded hash
 */
export function hash(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * Verify HMAC signature (for webhook verification)
 * @param data - Data that was signed
 * @param signature - Signature to verify
 * @param secret - Secret key
 * @returns True if signature is valid
 */
export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

/**
 * Generate secure random token
 * @param length - Length of token in bytes (default 32)
 * @returns Hex encoded random token
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Verify Shopify HMAC signature
 * @param data - Request body or query string
 * @param hmacHeader - HMAC from Shopify header
 * @param secret - Shopify app secret
 * @returns True if valid
 */
export function verifyShopifyHMAC(data: string, hmacHeader: string, secret: string): boolean {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(data, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(hmacHeader),
    Buffer.from(hash)
  );
}

/**
 * Verify Stripe webhook signature
 * @param payload - Raw request body
 * @param signature - Stripe signature header
 * @param secret - Webhook secret
 * @returns True if valid
 */
export function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const stripe = require('stripe');
    // Stripe's built-in signature verification is timing-safe
    stripe.webhooks.signature.verifyHeader(payload, signature, secret);
    return true;
  } catch (error) {
    console.error('Stripe signature verification failed:', error);
    return false;
  }
}
