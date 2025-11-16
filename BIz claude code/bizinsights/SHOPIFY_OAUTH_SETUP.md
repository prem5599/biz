# Shopify OAuth Integration Setup Guide

This guide will help you set up the Shopify OAuth integration for BizInsights, enabling your users to connect their Shopify stores with a single click.

## 🎯 Overview

The Shopify OAuth integration allows users to:
- Connect their Shopify store without manually entering API keys
- Authenticate securely through Shopify's OAuth flow
- Grant permissions with full transparency
- Have their stores automatically synced with BizInsights

## 📋 Prerequisites

1. A Shopify Partners account (free)
2. Your BizInsights application deployed and accessible via HTTPS (required for production)
3. Access to your server's environment variables

## 🚀 Step-by-Step Setup

### Step 1: Create a Shopify Partners Account

1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Click **"Join now"** or **"Sign up"**
3. Complete the registration process
4. Verify your email address

### Step 2: Create a Shopify App

1. Log into your [Shopify Partners Dashboard](https://partners.shopify.com/)
2. Click **"Apps"** in the left sidebar
3. Click **"Create app"**
4. Choose **"Create app manually"**
5. Fill in the app details:
   - **App name**: `BizInsights Analytics` (or your preferred name)
   - **App URL**: `https://yourdomain.com` (your production URL)
     - For development: `http://localhost:3002` (temporary, will need updating)
   - **Allowed redirection URL(s)**:
     ```
     https://yourdomain.com/api/integrations/shopify/oauth/callback
     ```
     - For development: `http://localhost:3002/api/integrations/shopify/oauth/callback`

6. Click **"Create app"**

### Step 3: Configure App Settings

1. After creating the app, go to **"Configuration"** tab
2. Under **"App URL"**, ensure it matches your deployment URL
3. Under **"Allowed redirection URL(s)"**, add:
   ```
   https://yourdomain.com/api/integrations/shopify/oauth/callback
   ```

4. Scroll down to **"App credentials"** section
5. Copy the following values (you'll need these for Step 4):
   - **API key** (also called Client ID)
   - **API secret key** (also called Client Secret)

### Step 4: Configure OAuth Scopes

1. In your Shopify app settings, go to **"Configuration"**
2. Scroll to **"Admin API access scopes"**
3. Enable the following scopes:
   - `read_products` - Read products, variants, and collections
   - `read_orders` - Read orders, transactions, and fulfillments
   - `read_customers` - Read customer details and customer groups
   - `read_analytics` - Read analytics data

4. Click **"Save"**

### Step 5: Update Environment Variables

1. Open your `.env` file
2. Update the following variables with the values from Step 3:

```bash
# Shopify OAuth Configuration
SHOPIFY_API_KEY="YOUR_SHOPIFY_API_KEY_HERE"
SHOPIFY_API_SECRET="YOUR_SHOPIFY_API_SECRET_HERE"
SHOPIFY_SCOPES="read_products,read_orders,read_customers,read_analytics"

# Your app URL (must match Shopify app configuration)
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
APP_URL="https://yourdomain.com"

# Encryption key for storing access tokens securely
ENCRYPTION_KEY="your-secure-encryption-key-minimum-32-characters-long"
```

3. **Important**: Generate a strong encryption key:
   ```bash
   # Using Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Or using OpenSSL
   openssl rand -hex 32
   ```

4. Save the `.env` file
5. Restart your application for changes to take effect

### Step 6: Verify Installation

1. Start your application:
   ```bash
   npm run dev
   ```

2. Navigate to the integrations page:
   ```
   http://localhost:3002/dashboard/integrations
   ```

3. Click **"Connect"** on the Shopify integration card
4. Enter a test shop name (if you have a development store)
5. You should be redirected to Shopify's authorization page

## 🔒 Security Best Practices

### Production Checklist

- [ ] Use HTTPS for all URLs (required by Shopify)
- [ ] Generate a strong, unique encryption key (32+ characters)
- [ ] Never commit API keys to version control
- [ ] Store environment variables securely
- [ ] Enable CSRF protection (already implemented via state parameter)
- [ ] Implement rate limiting on OAuth endpoints
- [ ] Monitor OAuth callback logs for suspicious activity
- [ ] Use the same encryption key across all instances for distributed systems

### HMAC Validation

Our implementation automatically validates HMAC signatures from Shopify to ensure:
- Requests actually come from Shopify
- Request parameters haven't been tampered with
- Protection against man-in-the-middle attacks

### State Parameter

We use a cryptographically secure state parameter to protect against CSRF attacks:
- Unique state generated for each OAuth session
- Stored in database and validated on callback
- Expires after successful use or timeout

### Token Encryption

All Shopify access tokens are encrypted before storing in the database:
- AES-256-CBC encryption
- Unique initialization vector (IV) for each token
- Only decrypted when making API requests to Shopify

## 🧪 Testing the OAuth Flow

### With a Development Store

1. Create a development store in your Shopify Partners account:
   - Go to **Stores** → **Add store** → **Development store**
   - Fill in store details and create

2. Test the OAuth flow:
   - Go to your BizInsights integrations page
   - Click "Connect" on Shopify
   - Enter your development store name
   - Approve the permissions
   - Verify successful connection

### Testing Locally with ngrok

For testing OAuth locally without deploying:

1. Install ngrok: `npm install -g ngrok`

2. Start your local server:
   ```bash
   npm run dev
   ```

3. In a new terminal, start ngrok:
   ```bash
   ngrok http 3002
   ```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Update your Shopify app settings:
   - App URL: `https://abc123.ngrok.io`
   - Allowed redirection URL: `https://abc123.ngrok.io/api/integrations/shopify/oauth/callback`

6. Update your `.env`:
   ```bash
   NEXT_PUBLIC_APP_URL="https://abc123.ngrok.io"
   APP_URL="https://abc123.ngrok.io"
   ```

7. Restart your app and test the OAuth flow

## 🐛 Troubleshooting

### "Invalid OAuth callback"

**Cause**: Redirect URI doesn't match what's configured in Shopify app settings

**Solution**:
- Verify redirect URI in Shopify app matches exactly: `https://yourdomain.com/api/integrations/shopify/oauth/callback`
- Check for trailing slashes
- Ensure HTTPS is used in production

### "Missing required Shopify OAuth configuration"

**Cause**: Environment variables not set correctly

**Solution**:
- Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are set in `.env`
- Restart your application after updating `.env`
- Check for typos in environment variable names

### "HMAC validation failed"

**Cause**: Request doesn't come from Shopify or was tampered with

**Solution**:
- Verify you're using the correct API secret
- Check that you haven't modified any URL parameters manually
- Ensure your system clock is synchronized (for timestamp validation)

### "OAuth session not found or expired"

**Cause**: State parameter validation failed

**Solution**:
- Don't refresh the page during OAuth flow
- Complete OAuth flow within 5 minutes
- Ensure database is accessible and working
- Try initiating a new OAuth flow

### "Token exchange failed"

**Cause**: Authorization code is invalid or already used

**Solution**:
- Each authorization code can only be used once
- Don't refresh the callback page
- Initiate a new OAuth flow
- Verify API credentials are correct

## 📊 Monitoring OAuth Connections

View OAuth flow logs in your application console:

```bash
[Shopify OAuth] Redirecting to authorization URL for shop: mystore
[Shopify OAuth Callback] Received callback from Shopify
[Shopify OAuth Callback] HMAC validation passed ✓
[Shopify OAuth Callback] State validation passed ✓
[Shopify OAuth Callback] Access token obtained ✓
[Shopify OAuth Callback] Successfully connected shop: mystore
```

## 🔄 Migration from Manual API Keys

If you already have users with manual API key connections:

1. The old manual connection method remains available as a fallback
2. Users can disconnect and reconnect using OAuth
3. OAuth connections are more secure and easier to manage
4. Consider prompting existing users to migrate to OAuth

## 📚 Additional Resources

- [Shopify OAuth Documentation](https://shopify.dev/docs/apps/build/authentication-authorization)
- [Shopify Admin API Reference](https://shopify.dev/docs/api/admin-rest)
- [Shopify Partners Dashboard](https://partners.shopify.com/)
- [Shopify API Rate Limits](https://shopify.dev/docs/api/usage/rate-limits)

## 🆘 Support

If you encounter issues not covered in this guide:

1. Check the application logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure your Shopify app configuration matches your application URLs
4. Test with a development store first before production

## ✅ Production Deployment Checklist

Before going live:

- [ ] Shopify app configured with production URLs (HTTPS)
- [ ] Environment variables set in production environment
- [ ] Strong encryption key generated and configured
- [ ] OAuth callback endpoint accessible publicly
- [ ] SSL/TLS certificate valid and active
- [ ] Database accessible from application servers
- [ ] Application logs configured for monitoring
- [ ] Error tracking enabled (e.g., Sentry)
- [ ] Test OAuth flow with development store
- [ ] Verify token encryption/decryption works
- [ ] Review and audit security settings

---

**Happy integrating! 🎉**

For questions or issues, please refer to the troubleshooting section or check application logs for detailed error messages.
