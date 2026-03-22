# 🎯 Facebook Ads Integration - Complete Guide

## Overview

The Facebook Ads integration enables BizInsights to sync campaign data, calculate ROAS, track conversions, and provide actionable insights from Facebook Marketing campaigns.

## ✅ What's Implemented

### Core Features (100% Complete)
- ✅ **Facebook OAuth Flow** - Secure authentication with Facebook Login
- ✅ **Long-Lived Tokens** - 60-day access tokens automatically obtained
- ✅ **Ad Account Management** - Select and switch between multiple ad accounts
- ✅ **Campaign Data Sync** - Comprehensive campaign performance data
- ✅ **Performance Metrics** - CPM, CPC, CTR, ROAS calculations
- ✅ **Conversion Tracking** - Purchases, leads, add-to-cart events
- ✅ **Automatic Syncing** - Daily background sync via job queue
- ✅ **Real-time Insights** - Campaign-level and aggregate metrics
- ✅ **Data Storage** - Optimized data points in database

### API Endpoints
1. **OAuth**: `/api/integrations/facebook-ads/oauth/authorize`
2. **Callback**: `/api/integrations/facebook-ads/oauth/callback`
3. **Connect**: `/api/integrations/facebook-ads/connect`
4. **Sync**: `/api/integrations/facebook-ads/sync`
5. **Accounts**: `/api/integrations/facebook-ads/accounts`
6. **Campaigns**: `/api/integrations/facebook-ads/campaigns`
7. **Insights**: `/api/integrations/facebook-ads/insights`

---

## 🔧 Setup Instructions

### 1. Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **"Create App"**
3. Select **"Business"** as app type
4. Fill in app details:
   - **App Name**: BizInsights
   - **App Contact Email**: Your email
   - **Business Account**: Select or create

### 2. Configure Facebook Marketing API

1. In your app dashboard, go to **Add Products**
2. Click **Set Up** on **Marketing API**
3. Complete Business Verification (if required)
4. Request **Advanced Access** for:
   - `ads_read` - Read ad account data
   - `ads_management` - Manage ad campaigns
   - `business_management` - Access Business Manager

### 3. Set Up OAuth Redirect

1. Go to **Facebook Login** → **Settings**
2. Add to **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3002/api/integrations/facebook-ads/oauth/callback
   https://yourdomain.com/api/integrations/facebook-ads/oauth/callback
   ```
3. Save changes

### 4. Get App Credentials

1. Go to **Settings** → **Basic**
2. Copy:
   - **App ID**
   - **App Secret** (click "Show")

### 5. Configure Environment Variables

Add to `.env`:

```bash
# Facebook Ads Configuration
FACEBOOK_APP_ID="your-app-id-here"
FACEBOOK_APP_SECRET="your-app-secret-here"
```

---

## 📊 Usage

### Connect Facebook Ads (OAuth Flow)

**Frontend Code:**
```typescript
// Redirect to OAuth
window.location.href = `/api/integrations/facebook-ads/oauth/authorize?organizationId=${orgId}`;
```

**What Happens:**
1. User redirected to Facebook Login
2. User grants permissions
3. Callback receives authorization code
4. Code exchanged for access token
5. Short-lived token exchanged for long-lived token (60 days)
6. User's ad accounts fetched
7. First ad account selected automatically
8. Integration saved to database

### Manual Sync

**Synchronous:**
```typescript
const response = await fetch('/api/integrations/facebook-ads/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org-id',
    async: false  // Sync immediately
  })
});

const data = await response.json();
console.log(`Synced ${data.data.campaignsSynced} campaigns`);
```

**Asynchronous (Queued):**
```typescript
const response = await fetch('/api/integrations/facebook-ads/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    organizationId: 'org-id',
    async: true  // Queue for background processing
  })
});
```

### Get Ad Accounts

```typescript
const response = await fetch(
  `/api/integrations/facebook-ads/accounts?integrationId=${integrationId}`
);

const data = await response.json();
const accounts = data.data.adAccounts;
// [{id, name, currency, status, isSelected}, ...]
```

### Switch Ad Account

```typescript
const response = await fetch('/api/integrations/facebook-ads/accounts', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    integrationId: 'integration-id',
    adAccountId: 'act_12345678'
  })
});
```

### Get Campaigns

```typescript
const response = await fetch(
  `/api/integrations/facebook-ads/campaigns?integrationId=${integrationId}&status=ACTIVE,PAUSED`
);

const data = await response.json();
const campaigns = data.data.campaigns;
// [{id, name, status, objective, dailyBudget, ...}, ...]
```

### Get Insights

```typescript
const response = await fetch(
  `/api/integrations/facebook-ads/insights?integrationId=${integrationId}&days=30&level=campaign`
);

const data = await response.json();
const insights = data.data.insights;
const aggregateMetrics = data.data.aggregateMetrics;

// aggregateMetrics: {totalSpend, totalImpressions, totalClicks, averageROAS, ...}
```

---

## 📈 Metrics Tracked

### Campaign Metrics
- **Spend** - Total ad spend
- **Impressions** - Number of times ads shown
- **Clicks** - Number of clicks on ads
- **Reach** - Unique people reached
- **Frequency** - Average impressions per person

### Performance Metrics
- **CPM** - Cost per 1,000 impressions
- **CPC** - Cost per click
- **CTR** - Click-through rate (%)
- **ROAS** - Return on ad spend

### Conversion Metrics
- **Purchases** - Purchase conversions
- **Leads** - Lead conversions
- **Add to Cart** - Add-to-cart events
- **Revenue** - Total conversion value

---

## 🔄 Automatic Syncing

### Background Job Scheduling

Facebook Ads data syncs automatically **once per day** via the job queue system.

**Schedule:** Daily at midnight
**What's Synced:**
- All campaigns (ACTIVE, PAUSED, ARCHIVED)
- Last 30 days of performance data
- Campaign-level insights
- Conversion data

**View Sync Status:**
```bash
# Check job queue
GET /api/jobs/monitoring

# Check last sync time
GET /api/organizations/{id}/integrations
# Look for lastSyncAt field
```

**Trigger Manual Sync:**
```typescript
// Via job scheduler
import { jobScheduler } from '@/lib/queue/job-scheduler';
await jobScheduler.scheduleImmediateSync(integrationId);

// Via API
POST /api/integrations/facebook-ads/sync
```

---

## 💾 Data Storage

### Integration Config
```json
{
  "accessToken": "base64-encoded-token",
  "adAccountId": "act_12345678",
  "adAccountName": "My Ad Account",
  "currency": "USD",
  "expiresAt": "2025-03-15T00:00:00.000Z",
  "adAccounts": [
    {"id": "act_12345678", "name": "Account 1", "currency": "USD"},
    {"id": "act_87654321", "name": "Account 2", "currency": "EUR"}
  ]
}
```

### Data Points Created

**1. Ad Spend (`metricType: 'ad_spend'`)**
```typescript
{
  value: 1234.56,  // Total spend
  currency: 'USD',
  metadata: {
    campaignId: '123',
    campaignName: 'Summer Campaign',
    impressions: 50000,
    clicks: 2500,
    reach: 35000,
    cpm: 24.69,
    cpc: 0.49,
    ctr: 5.0,
    roas: 3.5,
    purchases: 150,
    leads: 75,
    addToCart: 300
  }
}
```

**2. Impressions (`metricType: 'impressions'`)**
```typescript
{
  value: 50000,
  metadata: {
    campaignId: '123',
    campaignName: 'Summer Campaign',
    source: 'facebook_ads'
  }
}
```

**3. Conversions (`metricType: 'conversions'`)**
```typescript
{
  value: 150,  // Number of purchases
  metadata: {
    campaignId: '123',
    campaignName: 'Summer Campaign',
    conversionType: 'purchase',
    roas: 3.5,
    source: 'facebook_ads'
  }
}
```

---

## 🔍 Facebook Ads Client

### Usage

```typescript
import { FacebookAdsClient, getDateRange } from '@/lib/facebook-ads-client';

const client = new FacebookAdsClient(accessToken);

// Get ad accounts
const accounts = await client.getAdAccounts();

// Get campaigns
const campaigns = await client.getCampaigns('act_12345678', {
  status: ['ACTIVE', 'PAUSED'],
  limit: 100
});

// Get insights
const dateRange = getDateRange(30);  // Last 30 days
const insights = await client.getAdAccountInsights(
  'act_12345678',
  dateRange.startDate,
  dateRange.endDate,
  { level: 'campaign' }
);

// Calculate ROAS
const roas = client.calculateROAS(insights[0]);

// Get conversion count
const purchases = client.getConversionCount(insights[0], 'purchase');

// Validate token
const validation = await client.validateAccessToken();
if (!validation.isValid) {
  console.log('Token expired or invalid');
}
```

---

## 🚨 Error Handling

### Common Errors

**1. Invalid Access Token**
```json
{
  "success": false,
  "error": {
    "code": "SYNC_ERROR",
    "message": "Facebook access token is invalid or expired"
  }
}
```
**Solution:** Re-authenticate via OAuth flow

**2. No Ad Accounts**
```
Redirect: /dashboard/integrations?error=no_ad_accounts
```
**Solution:** User needs to have access to at least one Facebook Ad Account

**3. Rate Limiting**
```
Facebook API Error: Rate limit exceeded
```
**Solution:** Wait and retry. Facebook rate limits reset every hour

**4. Insufficient Permissions**
```
Facebook API Error: Insufficient permissions for this action
```
**Solution:** Request Advanced Access for required permissions

---

## 🔒 Security

### Token Storage
- Access tokens stored **base64 encoded** in database
- Long-lived tokens valid for **60 days**
- Automatic token validation before sync
- Re-authentication required when token expires

### Permissions Required
- `ads_read` - Read ad account and campaign data
- `ads_management` - (Optional) Manage campaigns
- `business_management` - Access Business Manager data

### Best Practices
1. Store tokens securely (database encryption recommended)
2. Validate tokens before API calls
3. Handle token expiration gracefully
4. Use HTTPS for all OAuth callbacks
5. Implement retry logic for API failures

---

## 📊 ROAS Calculation

### How ROAS is Calculated

```typescript
ROAS = Revenue / Spend

// Example:
// Spend: $1,000
// Revenue from conversions: $3,500
// ROAS = 3,500 / 1,000 = 3.5

// Interpretation: For every $1 spent, you get $3.50 back
```

### Finding Conversion Revenue

Facebook tracks purchase values in `action_values` array:
```typescript
const purchaseValue = insights.action_values.find(
  av => av.action_type === 'omni_purchase' || av.action_type === 'purchase'
);

const revenue = parseFloat(purchaseValue.value);
const roas = revenue / spend;
```

---

## 🎯 Optimization Tips

### 1. Data Freshness
- Daily sync provides fresh data without hitting rate limits
- Manual sync available for on-demand updates
- Background queue prevents blocking user requests

### 2. Performance
- Campaign-level insights provide good balance of detail vs performance
- Ad-level insights available but more API calls required
- Aggregate metrics calculated efficiently

### 3. Cost Management
- Monitor API rate limits
- Use appropriate date ranges
- Cache insights data in database
- Leverage background jobs for heavy lifting

---

## 🐛 Troubleshooting

### Token Expired
**Problem:** Sync fails with "invalid token" error

**Solution:**
1. Check token expiration: `config.expiresAt`
2. Re-authenticate: Go to OAuth flow
3. New 60-day token will be obtained

### No Data Synced
**Problem:** Sync completes but no data in database

**Solution:**
1. Check if campaigns exist: `GET /api/integrations/facebook-ads/campaigns`
2. Verify date range has data
3. Check campaign status (ACTIVE/PAUSED/ARCHIVED)
4. Review sync logs for errors

### Rate Limit Hit
**Problem:** API returns rate limit error

**Solution:**
1. Wait 1 hour for limits to reset
2. Reduce sync frequency
3. Use smaller date ranges
4. Implement exponential backoff

### Missing Conversions
**Problem:** ROAS shows 0 or conversions missing

**Solution:**
1. Verify Facebook Pixel is installed on website
2. Check conversion tracking in Facebook Ads Manager
3. Ensure pixel fires purchase events
4. May take 24-48 hours for conversion data to appear

---

## 📚 Additional Resources

- [Facebook Marketing API Documentation](https://developers.facebook.com/docs/marketing-apis)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Ads Insights API](https://developers.facebook.com/docs/marketing-api/insights)
- [Facebook Business Manager](https://business.facebook.com/)
- [Developer Console](https://developers.facebook.com/apps/)

---

## ✅ Implementation Checklist

### Setup
- [ ] Create Facebook App
- [ ] Configure Marketing API
- [ ] Set up OAuth redirects
- [ ] Get App ID and Secret
- [ ] Add to environment variables
- [ ] Test OAuth flow

### Testing
- [ ] Connect ad account successfully
- [ ] View campaigns list
- [ ] Sync campaign data
- [ ] Verify data points in database
- [ ] Check ROAS calculations
- [ ] Test background sync job

### Production
- [ ] Use production Facebook App
- [ ] Configure production redirect URIs
- [ ] Set up SSL/HTTPS
- [ ] Monitor sync job queue
- [ ] Set up error alerting
- [ ] Document for team

---

## 🎉 Success Indicators

The Facebook Ads integration is working correctly when:

1. ✅ OAuth flow completes without errors
2. ✅ Ad accounts list populated
3. ✅ Campaigns fetched successfully
4. ✅ Insights show real metrics
5. ✅ ROAS calculated correctly
6. ✅ Data points created in database
7. ✅ Background sync runs daily
8. ✅ No token expiration errors

---

**Need Help?** Check logs:
- Worker: `pm2 logs bizinsights-worker`
- Next.js: `npm run dev` output
- Database: Check `DataPoint` table for new records
