# BizInsights Production Deployment Guide

This guide will help you deploy BizInsights to production using Vercel, Supabase, and other cloud services.

## Prerequisites

- Node.js 20+ installed
- Git installed
- Accounts on:
  - [Vercel](https://vercel.com) (Frontend & API hosting)
  - [Supabase](https://supabase.com) (PostgreSQL database)
  - [Upstash](https://upstash.com) (Redis)
  - [Resend](https://resend.com) (Email delivery)
  - [Stripe](https://stripe.com) (Payments)

## 1. Database Setup (Supabase)

### Create a New Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Enter project details:
   - Name: `bizinsights-production`
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### Get Database Connection String

1. Go to Project Settings > Database
2. Copy the "Connection string" under "Connection pooling"
3. Replace `[YOUR-PASSWORD]` with your database password
4. This will be your `DATABASE_URL`

Example:
```
postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

## 2. Redis Setup (Upstash)

### Create Redis Database

1. Go to [Upstash Console](https://console.upstash.com)
2. Click "Create Database"
3. Choose:
   - Name: `bizinsights-redis`
   - Type: Global (for best availability)
   - Region: Choose primary region
4. Click "Create"

### Get Redis URL

1. In your database dashboard, find "REST API" section
2. Copy the `UPSTASH_REDIS_REST_URL`
3. Copy the `UPSTASH_REDIS_REST_TOKEN`

## 3. Email Service Setup (Resend)

1. Go to [Resend](https://resend.com/login)
2. Create an account or sign in
3. Go to API Keys
4. Click "Create API Key"
5. Name it `bizinsights-production`
6. Copy the API key - this is your `RESEND_API_KEY`

### Add Domain (Optional but Recommended)

1. Go to Domains in Resend dashboard
2. Add your domain (e.g., `bizinsights.com`)
3. Follow DNS setup instructions
4. Verify domain

## 4. Stripe Setup

### Get API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Switch to "Live mode" (toggle in left sidebar)
3. Go to Developers > API keys
4. Copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Secret key → `STRIPE_SECRET_KEY`
5. Go to Developers > Webhooks
6. Click "Add endpoint"
7. URL: `https://your-domain.com/api/webhooks/stripe`
8. Select events: `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_succeeded`
9. Copy webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### Create Products

1. Go to Products
2. Create products for each tier:
   - **Pro Plan**: $29/month
   - **Business Plan**: $79/month
   - **Enterprise Plan**: $199/month
3. Copy price IDs for each plan

## 5. OAuth Configuration

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable APIs:
   - Google Analytics Data API
   - Google Analytics API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs:
   - `https://your-domain.com/api/auth/callback/google`
   - `https://your-domain.com/api/integrations/google-analytics/oauth/callback`
7. Copy:
   - Client ID → `GOOGLE_CLIENT_ID`
   - Client Secret → `GOOGLE_CLIENT_SECRET`

### Shopify App

1. Go to [Shopify Partners](https://partners.shopify.com)
2. Apps > Create app
3. Choose "Custom app"
4. Fill in app details
5. App setup:
   - App URL: `https://your-domain.com`
   - Allowed redirection URL: `https://your-domain.com/api/integrations/shopify/oauth/callback`
6. API scopes: `read_orders`, `read_products`, `read_customers`, `read_analytics`
7. Copy:
   - API key → `SHOPIFY_API_KEY`
   - API secret → `SHOPIFY_API_SECRET`

### Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create App > Business type
3. Add Facebook Login product
4. Settings > Basic:
   - App Domains: `your-domain.com`
   - Privacy Policy URL
   - Terms of Service URL
5. Facebook Login > Settings:
   - Valid OAuth Redirect URIs: `https://your-domain.com/api/integrations/facebook-ads/oauth/callback`
6. Copy:
   - App ID → `FACEBOOK_APP_ID`
   - App Secret → `FACEBOOK_APP_SECRET`

## 6. Environment Variables

Create `.env.production` file:

```bash
# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres

# Auth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key-here-use-openssl-rand-base64-32

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here

# Email (Resend)
RESEND_API_KEY=re_xxx
EMAIL_FROM=noreply@your-domain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# Shopify
SHOPIFY_API_KEY=xxx
SHOPIFY_API_SECRET=xxx

# Facebook
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx

# Monitoring (Optional)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Encryption
ENCRYPTION_KEY=your-32-char-encryption-key-here
```

## 7. Vercel Deployment

### Install Vercel CLI

```bash
npm install -g vercel
```

### Login to Vercel

```bash
vercel login
```

### Link Project

```bash
vercel link
```

### Add Environment Variables

```bash
# Add all environment variables from .env.production
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
# ... repeat for all variables
```

Or add them via Vercel Dashboard:
1. Go to your project
2. Settings > Environment Variables
3. Add each variable

### Deploy to Production

```bash
# Deploy
vercel --prod

# Or push to main branch if you have Git integration
git push origin main
```

## 8. Database Migration

After deployment, run migrations:

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="your-production-database-url"

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## 9. Post-Deployment Setup

### Verify Deployment

1. Visit your production URL
2. Test user registration
3. Test OAuth logins
4. Connect a test integration
5. Generate a test report

### Set up Monitoring

1. Configure Sentry (if using):
   ```bash
   npm install @sentry/nextjs
   npx @sentry/wizard -i nextjs
   ```

2. Set up PostHog (if using):
   - Add PostHog snippet to app layout
   - Configure event tracking

### Configure Webhooks

1. **Stripe Webhooks**:
   - Endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Events: All subscription and payment events

2. **Shopify Webhooks** (per store):
   - `orders/create`
   - `orders/updated`
   - `orders/paid`

### Set up Cron Jobs

For background tasks:
1. Go to Vercel Dashboard > Settings > Cron Jobs
2. Add cron jobs for:
   - Data sync: `0 */6 * * *` (every 6 hours)
   - Report generation: `0 9 * * 1` (every Monday at 9 AM)
   - Cleanup: `0 2 * * *` (daily at 2 AM)

## 10. Security Checklist

- [ ] All environment variables are set correctly
- [ ] Database password is strong and secure
- [ ] NEXTAUTH_SECRET is random and secure
- [ ] HTTPS is enabled (Vercel does this automatically)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] SQL injection protection (Prisma handles this)
- [ ] XSS protection enabled
- [ ] CSRF protection enabled (NextAuth handles this)
- [ ] Stripe webhook signature verification enabled
- [ ] OAuth redirect URLs are whitelisted

## 11. Performance Optimization

### Enable Caching

1. Configure CDN caching headers
2. Enable Vercel Edge Caching for static assets
3. Set up Redis caching for frequently accessed data

### Database Optimization

1. Add necessary indexes (check Prisma schema)
2. Enable connection pooling (Supabase does this automatically)
3. Set up read replicas for heavy read operations (optional)

### Monitoring Setup

1. Set up uptime monitoring (Vercel Analytics, UptimeRobot)
2. Configure error tracking (Sentry)
3. Set up performance monitoring (Vercel Speed Insights)
4. Enable database query logging

## 12. Backup Strategy

### Database Backups

Supabase automatically backs up your database:
- Point-in-time recovery available
- Daily backups retained for 7 days (free tier)
- Configure custom backup schedule in Supabase settings

### Manual Backup

```bash
# Export database
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# Upload to S3 or another storage service
aws s3 cp backup-$(date +%Y%m%d).sql s3://your-backup-bucket/
```

## 13. Scaling Considerations

### When to Scale

- Database: When queries slow down significantly
- Redis: When cache hit rate drops below 80%
- Application: When response times > 1 second

### Scaling Options

1. **Database**:
   - Upgrade Supabase plan for more connections
   - Add read replicas
   - Implement query caching

2. **Application**:
   - Vercel auto-scales
   - Consider serverless functions for heavy operations

3. **Redis**:
   - Upgrade Upstash plan
   - Implement cache warming strategies

## 14. Troubleshooting

### Common Issues

**Database Connection Errors**:
- Check DATABASE_URL is correct
- Verify database is accessible from Vercel
- Check connection pool limits

**Authentication Issues**:
- Verify NEXTAUTH_URL matches deployed URL
- Check OAuth redirect URLs are correct
- Ensure NEXTAUTH_SECRET is set

**Build Failures**:
- Check build logs in Vercel dashboard
- Verify all dependencies are in package.json
- Ensure TypeScript has no errors

**API Errors**:
- Check environment variables are set
- Verify external API keys are valid
- Check rate limits on external services

## 15. Maintenance

### Regular Tasks

- **Daily**: Monitor error rates and performance
- **Weekly**: Review usage metrics and costs
- **Monthly**: Update dependencies, review security advisories
- **Quarterly**: Database optimization, cleanup old data

### Update Process

1. Test updates in staging environment
2. Run database migrations if needed
3. Deploy to production during low-traffic period
4. Monitor for errors post-deployment
5. Rollback if issues detected

## Support

For deployment issues:
- Check Vercel documentation: https://vercel.com/docs
- Supabase documentation: https://supabase.com/docs
- Create an issue on GitHub: [your-repo]/issues

## Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Prisma Production Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
