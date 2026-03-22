# Environment Setup Guide

This guide explains how to configure environment variables for both the frontend and backend.

---

## 📁 Environment Files Location

```
bizinsights/
├── biz-client/
│   ├── .env              # Frontend environment variables
│   └── .env.example      # Frontend template
│
└── biz-server/
    ├── .env              # Backend environment variables
    └── .env.example      # Backend template
```

---

## 🔧 Backend Configuration (biz-server/.env)

### Required Variables

```env
# Database - SQLite for development
DATABASE_URL="file:../prisma/dev.db"

# JWT Secret - CHANGE THIS IN PRODUCTION!
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Server Port
PORT=5000

# Frontend URL (for CORS)
CLIENT_URL="http://localhost:5173"

# Environment
NODE_ENV="development"
```

### Optional Variables

#### Redis (for background jobs)
```env
REDIS_URL="redis://localhost:6379"
```

#### Stripe (for billing)
```env
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_BUSINESS_PRICE_ID="price_..."
STRIPE_ENTERPRISE_PRICE_ID="price_..."
```

#### Email Service (Resend)
```env
RESEND_API_KEY="re_..."
```

#### Shopify Integration
```env
SHOPIFY_CLIENT_ID="your_shopify_client_id"
SHOPIFY_CLIENT_SECRET="your_shopify_client_secret"
SHOPIFY_WEBHOOK_SECRET="your_webhook_secret"
```

#### Google Analytics Integration
```env
GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
```

#### Facebook Ads Integration
```env
FACEBOOK_APP_ID="your_facebook_app_id"
FACEBOOK_APP_SECRET="your_facebook_app_secret"
```

#### Security
```env
ENCRYPTION_KEY="32-character-encryption-key-here"
```

#### Monitoring
```env
SENTRY_DSN="https://...@sentry.io/..."
```

---

## 🎨 Frontend Configuration (biz-client/.env)

### Required Variables

```env
# Backend API URL
VITE_API_URL=http://localhost:5000/api
```

### Optional Variables

```env
# Google Analytics
VITE_GOOGLE_ANALYTICS_ID="G-XXXXXXXXXX"

# Sentry Error Tracking
VITE_SENTRY_DSN="https://...@sentry.io/..."
```

---

## 🚀 Quick Setup

### 1. Copy Example Files

```bash
# Backend
cd biz-server
cp .env.example .env

# Frontend
cd ../biz-client
cp .env.example .env
```

### 2. Update Required Variables

**Backend (.env):**
- Change `JWT_SECRET` to a random 32+ character string
- Verify `DATABASE_URL` points to correct location
- Update `CLIENT_URL` if frontend runs on different port

**Frontend (.env):**
- Verify `VITE_API_URL` matches backend URL

### 3. Add Optional Services

Only add credentials for services you plan to use:
- Stripe for billing
- Shopify for e-commerce integration
- Google Analytics for analytics
- Facebook Ads for advertising
- Resend for email
- Redis for background jobs

---

## 🔐 Security Best Practices

### Development
- ✅ Use `.env` files (already in `.gitignore`)
- ✅ Never commit `.env` files to git
- ✅ Use example files (`.env.example`) for templates
- ✅ Use weak secrets for local development

### Production
- ⚠️ **CHANGE ALL SECRETS** before deploying
- ⚠️ Use environment variables from hosting platform
- ⚠️ Use strong, random secrets (32+ characters)
- ⚠️ Enable HTTPS
- ⚠️ Use production database (PostgreSQL)

---

## 🎯 Environment-Specific Configuration

### Development
```env
NODE_ENV="development"
DATABASE_URL="file:../prisma/dev.db"
CLIENT_URL="http://localhost:5173"
VITE_API_URL=http://localhost:5000/api
```

### Production
```env
NODE_ENV="production"
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
CLIENT_URL="https://yourdomain.com"
VITE_API_URL=https://api.yourdomain.com/api
```

---

## 🔑 Generating Secrets

### JWT Secret
```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32

# Online
# Visit: https://generate-secret.vercel.app/32
```

### Encryption Key
```bash
# Same as JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔗 Getting OAuth Credentials

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Analytics API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/integrations/google-analytics/oauth/callback`
   - Production: `https://api.yourdomain.com/api/integrations/google-analytics/oauth/callback`
6. Copy Client ID and Client Secret

### Shopify App
1. Go to [Shopify Partners](https://partners.shopify.com/)
2. Create a new app
3. Set up OAuth redirect URL:
   - Development: `http://localhost:5000/api/integrations/shopify/oauth/callback`
   - Production: `https://api.yourdomain.com/api/integrations/shopify/oauth/callback`
4. Copy API key and API secret key

### Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add "Marketing API" product
4. Set up OAuth redirect URI:
   - Development: `http://localhost:5000/api/integrations/facebook-ads/oauth/callback`
   - Production: `https://api.yourdomain.com/api/integrations/facebook-ads/oauth/callback`
5. Copy App ID and App Secret

### Stripe
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Get API keys from "Developers" → "API keys"
3. Use test keys for development
4. Create webhook endpoint:
   - Development: `http://localhost:5000/api/webhooks/stripe`
   - Production: `https://api.yourdomain.com/api/webhooks/stripe`
5. Copy webhook secret

### Resend (Email)
1. Go to [Resend](https://resend.com/)
2. Create account and verify domain
3. Go to "API Keys" and create new key
4. Copy API key

---

## ✅ Verification

### Check Backend Environment
```bash
cd biz-server
npm run dev
```

Look for:
- ✅ Server running on correct port
- ✅ Database connection successful
- ✅ No environment variable errors

### Check Frontend Environment
```bash
cd biz-client
npm run dev
```

Look for:
- ✅ Frontend running on correct port
- ✅ API calls going to correct backend URL
- ✅ No CORS errors

---

## 🐛 Troubleshooting

### "JWT_SECRET is not defined"
- Make sure `JWT_SECRET` is set in `biz-server/.env`
- Restart the backend server

### "CORS Error"
- Check `CLIENT_URL` in backend `.env` matches frontend URL
- Verify frontend is running on port 5173

### "Database connection failed"
- Check `DATABASE_URL` path is correct
- Run `npm run prisma:push` to create database

### "API calls failing"
- Check `VITE_API_URL` in frontend `.env`
- Verify backend is running on port 5000
- Check browser console for errors

---

## 📚 Related Documentation

- [README.md](../README.md) - Main documentation
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [MIGRATION-COMPLETE.md](./MIGRATION-COMPLETE.md) - Architecture details

---

**Last Updated**: 2026-01-11
