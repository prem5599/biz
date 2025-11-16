# Shopify OAuth - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Create Shopify App (2 minutes)

1. Go to [Shopify Partners](https://partners.shopify.com/) → **Apps** → **Create app**
2. Choose **"Create app manually"**
3. Fill in:
   - App name: `BizInsights Analytics`
   - App URL: `https://yourdomain.com`
   - Redirect URL: `https://yourdomain.com/api/integrations/shopify/oauth/callback`

4. Save and copy **API key** and **API secret**

### 2. Configure Scopes (1 minute)

In app settings → **Configuration** → **Admin API access scopes**, enable:
- ✅ `read_products`
- ✅ `read_orders`
- ✅ `read_customers`
- ✅ `read_analytics`

### 3. Update Environment Variables (2 minutes)

Edit `.env`:

```bash
SHOPIFY_API_KEY="paste_your_api_key_here"
SHOPIFY_API_SECRET="paste_your_api_secret_here"
SHOPIFY_SCOPES="read_products,read_orders,read_customers,read_analytics"

# Generate encryption key:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="your_generated_encryption_key_here"
```

### 4. Restart & Test

```bash
npm run dev
```

Navigate to `/dashboard/integrations` → Click "Connect" on Shopify → Enter shop name → Authorize!

## 🎯 User Flow

1. User clicks **"Connect Shopify"**
2. User enters shop name (e.g., `mystore`)
3. Redirected to Shopify login
4. User approves permissions
5. **✨ Automatically connected!**

## 🔐 Security Features

- ✅ HMAC signature validation
- ✅ CSRF protection (state parameter)
- ✅ Token encryption (AES-256-CBC)
- ✅ Replay attack prevention
- ✅ Secure token storage

## 📝 What Changed

### New Files Created
- `src/lib/shopify-oauth.ts` - Security utilities & OAuth helpers
- `src/components/integrations/shopify-oauth-dialog.tsx` - User-friendly shop input
- `SHOPIFY_OAUTH_SETUP.md` - Detailed setup guide

### Modified Files
- `src/app/api/integrations/shopify/oauth/authorize/route.ts` - OAuth initiation
- `src/app/api/integrations/shopify/oauth/callback/route.ts` - Token exchange & validation
- `src/app/dashboard/integrations/page.tsx` - OAuth flow integration
- `.env` - New environment variables

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Invalid OAuth callback" | Check redirect URI matches Shopify app exactly |
| "Missing configuration" | Verify `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` in `.env` |
| "HMAC validation failed" | Using correct API secret? Don't modify URL params |
| "State validation failed" | Complete OAuth within 5 minutes, don't refresh page |

## 📚 Full Documentation

See **SHOPIFY_OAUTH_SETUP.md** for:
- Detailed step-by-step instructions
- Production deployment checklist
- ngrok testing setup
- Security best practices
- Monitoring and logging

## 🎉 That's It!

Your users can now connect their Shopify stores with a single click instead of copying API keys!

**Before:** 5-10 minutes, requires technical knowledge
**After:** 30 seconds, anyone can do it! ✨
