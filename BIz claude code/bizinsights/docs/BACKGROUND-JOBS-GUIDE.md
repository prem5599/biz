# 🚀 Background Jobs System - Complete Guide

## Overview

The BizInsights Background Jobs System provides asynchronous job processing for data synchronization, insights generation, webhook handling, and more. Built with **Bull Queue** and **Redis**.

## Architecture

```
┌─────────────────┐
│   Next.js App   │
│    (Web UI)     │
└────────┬────────┘
         │
         ├── Enqueue Jobs
         │
┌────────▼────────┐        ┌──────────────┐
│  Queue Service  │◄──────►│    Redis     │
│   (Bull Queue)  │        │ (Job Storage)│
└────────┬────────┘        └──────────────┘
         │
         ├── Process Jobs
         │
┌────────▼────────┐
│  Queue Worker   │
│   (Processors)  │
└────────┬────────┘
         │
         ├──► Data Sync
         ├──► Insights Generation
         ├──► Webhook Processing
         ├──► Report Generation
         ├──► Email Sending
         └──► Alert Creation
```

## 📦 Components

### 1. Redis Client (`src/lib/redis.ts`)
- Singleton Redis connection
- Caching utilities
- Connection management

### 2. Queue Service (`src/lib/queue/queue-service.ts`)
- Manages all job queues
- Queue operations (add, remove, pause, resume)
- Statistics and monitoring

### 3. Job Processors (`src/lib/queue/processors/`)
- `data-sync.processor.ts` - Syncs data from integrations
- `insights-generation.processor.ts` - Generates AI insights
- `webhook.processor.ts` - Processes webhook events
- `report.processor.ts` - Generates reports
- `email.processor.ts` - Sends emails
- `alert.processor.ts` - Creates alerts

### 4. Job Scheduler (`src/lib/queue/job-scheduler.ts`)
- Sets up recurring jobs
- Manages cron schedules
- Integration-specific timing

### 5. Queue Worker (`src/workers/queue-worker.ts`)
- Standalone worker process
- Processes jobs from all queues
- Graceful shutdown handling

### 6. Monitoring API (`src/app/api/jobs/`)
- Queue statistics
- Job retry endpoints
- Queue management

## 🔧 Setup Instructions

### Prerequisites

1. **Install Redis**

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Windows (WSL2)
sudo apt-get install redis-server
sudo service redis-server start
```

2. **Verify Redis is Running**

```bash
redis-cli ping
# Should return: PONG
```

3. **Configure Environment Variables**

Add to your `.env` file:

```bash
REDIS_URL="redis://localhost:6379"
RESEND_API_KEY=""  # Optional: for email sending
EMAIL_FROM="BizInsights <noreply@bizinsights.com>"
```

### Starting the System

#### Development Mode

**Terminal 1: Start Next.js App**
```bash
npm run dev
```

**Terminal 2: Start Queue Worker**
```bash
npm run worker:dev
```

#### Production Mode

**Terminal 1: Start Next.js App**
```bash
npm run build
npm start
```

**Terminal 2: Start Queue Worker**
```bash
npm run worker
```

#### Using PM2 (Recommended for Production)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start npm --name "bizinsights-app" -- start

# Start worker
pm2 start npm --name "bizinsights-worker" -- run worker

# View logs
pm2 logs

# Monitor processes
pm2 monit

# Save process list
pm2 save
pm2 startup
```

## 📋 Queue Types

### 1. Data Sync Queue
**Purpose:** Synchronize data from integrated platforms

**Job Data:**
```typescript
{
  integrationId: string;
  organizationId: string;
  platform: 'shopify' | 'stripe' | 'google-analytics' | 'facebook-ads';
  syncType: 'full' | 'incremental';
  startDate?: string;
  endDate?: string;
}
```

**Schedule:**
- Shopify/WooCommerce: Every 2 hours
- Stripe: Every 3 hours
- Google Analytics: Every 4 hours
- Facebook Ads: Daily

**Example:**
```typescript
import { queueService, QueueName } from '@/lib/queue/queue-service';

await queueService.addJob(QueueName.DATA_SYNC, {
  integrationId: '123',
  organizationId: '456',
  platform: 'shopify',
  syncType: 'incremental',
});
```

### 2. Insights Generation Queue
**Purpose:** Generate AI-powered business insights

**Job Data:**
```typescript
{
  organizationId: string;
  period: '7d' | '30d' | '90d' | '1y';
  forceRegenerate?: boolean;
}
```

**Schedule:** Every 6 hours

**Example:**
```typescript
await queueService.addJob(QueueName.INSIGHTS_GENERATION, {
  organizationId: '456',
  period: '30d',
  forceRegenerate: true,
});
```

### 3. Webhook Processing Queue
**Purpose:** Process incoming webhooks asynchronously

**Job Data:**
```typescript
{
  platform: string;
  eventType: string;
  payload: any;
  signature: string;
  organizationId?: string;
  integrationId?: string;
}
```

**Example:**
```typescript
await queueService.addJob(QueueName.WEBHOOK_PROCESSING, {
  platform: 'shopify',
  eventType: 'orders/create',
  payload: orderData,
  signature: 'hmac-signature',
  integrationId: '123',
});
```

### 4. Report Generation Queue
**Purpose:** Generate and deliver reports

**Job Data:**
```typescript
{
  reportId: string;
  organizationId: string;
  reportType: 'weekly' | 'monthly' | 'quarterly';
  period: string;
  recipientEmails?: string[];
}
```

**Example:**
```typescript
await queueService.addJob(QueueName.REPORT_GENERATION, {
  reportId: 'report-123',
  organizationId: '456',
  reportType: 'weekly',
  period: '7d',
  recipientEmails: ['user@example.com'],
});
```

### 5. Email Sending Queue
**Purpose:** Send transactional emails

**Job Data:**
```typescript
{
  to: string | string[];
  subject: string;
  template: string;
  data: any;
  organizationId?: string;
}
```

**Available Templates:**
- `report-delivery`
- `team-invitation`
- `alert-notification`
- `welcome`

**Example:**
```typescript
await queueService.addJob(QueueName.EMAIL_SENDING, {
  to: 'user@example.com',
  subject: 'Welcome to BizInsights',
  template: 'welcome',
  data: { name: 'John Doe' },
});
```

### 6. Alerts Queue
**Purpose:** Create and deliver alerts

**Job Data:**
```typescript
{
  organizationId: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  metadata: any;
}
```

**Example:**
```typescript
await queueService.addJob(QueueName.ALERTS, {
  organizationId: '456',
  alertType: 'DATA_ANOMALY',
  severity: 'HIGH',
  message: 'Revenue dropped 50% from yesterday',
  metadata: { metric: 'revenue', change: -50 },
});
```

## 🔄 Usage Examples

### Trigger Manual Data Sync

```typescript
import { jobScheduler } from '@/lib/queue/job-scheduler';

// Trigger immediate sync for an integration
await jobScheduler.scheduleImmediateSync(integrationId);
```

### Generate Insights On-Demand

```typescript
// Generate insights for last 30 days
await jobScheduler.scheduleImmediateInsights(organizationId, '30d');
```

### Process Webhook

```typescript
// In your webhook endpoint
export async function POST(request: Request) {
  const payload = await request.json();
  const signature = request.headers.get('x-shopify-hmac-sha256');

  // Queue for async processing
  await queueService.addJob(QueueName.WEBHOOK_PROCESSING, {
    platform: 'shopify',
    eventType: 'orders/create',
    payload,
    signature,
  });

  // Return 200 immediately
  return Response.json({ received: true });
}
```

### Schedule Recurring Report

```typescript
// Schedule weekly report every Monday at 8 AM
await queueService.addRecurringJob(
  QueueName.REPORT_GENERATION,
  'weekly-report-org123',
  {
    reportId: 'recurring',
    organizationId: 'org123',
    reportType: 'weekly',
    period: '7d',
    recipientEmails: ['team@company.com'],
  },
  '0 8 * * 1'
);
```

## 📊 Monitoring

### API Endpoints

**Get All Queue Statistics**
```bash
GET /api/jobs/monitoring

Response:
{
  "success": true,
  "data": {
    "queues": {
      "data-sync": {
        "waiting": 5,
        "active": 2,
        "completed": 1234,
        "failed": 3,
        "delayed": 1,
        "paused": 0
      },
      ...
    },
    "totals": {
      "waiting": 10,
      "active": 5,
      "completed": 5000,
      "failed": 10,
      "delayed": 2,
      "paused": 0
    }
  }
}
```

**Get Specific Queue Statistics**
```bash
GET /api/jobs/data-sync

Response:
{
  "success": true,
  "data": {
    "queueName": "data-sync",
    "stats": { ... },
    "failedJobs": [
      {
        "id": "123",
        "data": { ... },
        "failedReason": "Connection timeout",
        "attemptsMade": 3
      }
    ]
  }
}
```

**Retry Failed Jobs**
```bash
POST /api/jobs/monitoring/retry
Content-Type: application/json

{
  "queueName": "data-sync",
  "jobId": "123"  // Optional: omit to retry all
}
```

**Queue Management**
```bash
POST /api/jobs/data-sync?action=pause
POST /api/jobs/data-sync?action=resume
POST /api/jobs/data-sync?action=empty
POST /api/jobs/data-sync?action=clean
```

### Programmatic Monitoring

```typescript
import { queueService, QueueName } from '@/lib/queue/queue-service';

// Get stats for a specific queue
const stats = await queueService.getQueueStats(QueueName.DATA_SYNC);
console.log('Active jobs:', stats.active);

// Get all queue stats
const allStats = await queueService.getAllQueueStats();

// Get failed jobs
const failedJobs = await queueService.getFailedJobs(QueueName.DATA_SYNC);

// Retry a specific failed job
await queueService.retryFailedJob(QueueName.DATA_SYNC, jobId);

// Retry all failed jobs
await queueService.retryAllFailedJobs(QueueName.DATA_SYNC);
```

## 🛠️ Advanced Configuration

### Custom Job Options

```typescript
await queueService.addJob(
  QueueName.DATA_SYNC,
  jobData,
  {
    priority: 1,  // Higher priority
    attempts: 5,  // More retry attempts
    backoff: {
      type: 'exponential',
      delay: 5000,  // 5 seconds base delay
    },
    delay: 60000,  // Start after 1 minute
    timeout: 300000,  // 5 minute timeout
  }
);
```

### Recurring Jobs (Cron)

```typescript
// Every hour at minute 0
'0 * * * *'

// Every 6 hours
'0 */6 * * *'

// Daily at 8 AM
'0 8 * * *'

// Monday at 8 AM
'0 8 * * 1'

// 1st of month at 8 AM
'0 8 1 * *'
```

## 🔒 Error Handling

### Automatic Retries

All jobs automatically retry up to 3 times with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: 2 seconds later
- Attempt 3: 4 seconds later
- Final failure: Job marked as failed

### Failed Job Management

```typescript
// Get failed jobs
const failedJobs = await queueService.getFailedJobs(QueueName.DATA_SYNC);

// Retry a specific job
await queueService.retryFailedJob(QueueName.DATA_SYNC, jobId);

// Retry all failed jobs
await queueService.retryAllFailedJobs(QueueName.DATA_SYNC);

// Remove old failed jobs
await queueService.cleanQueue(
  QueueName.DATA_SYNC,
  7 * 24 * 3600 * 1000,  // 7 days
  'failed'
);
```

## 🧹 Maintenance

### Cleanup Old Jobs

Jobs are automatically cleaned up:
- **Completed jobs**: Kept for 24 hours
- **Failed jobs**: Kept for 7 days

Manual cleanup:
```typescript
// Clean completed jobs older than 24 hours
await queueService.cleanQueue(QueueName.DATA_SYNC, 24 * 3600 * 1000, 'completed');

// Clean failed jobs older than 7 days
await queueService.cleanQueue(QueueName.DATA_SYNC, 7 * 24 * 3600 * 1000, 'failed');
```

### Pause/Resume Queues

```typescript
// Pause processing (useful during maintenance)
await queueService.pauseQueue(QueueName.DATA_SYNC);

// Resume processing
await queueService.resumeQueue(QueueName.DATA_SYNC);

// Empty queue (remove all jobs)
await queueService.emptyQueue(QueueName.DATA_SYNC);
```

## 🚨 Troubleshooting

### Redis Connection Issues

**Problem:** Worker fails to start with Redis connection error

**Solution:**
```bash
# Check if Redis is running
redis-cli ping

# Check Redis logs
redis-cli info

# Restart Redis
# macOS: brew services restart redis
# Linux: sudo systemctl restart redis
```

### High Memory Usage

**Problem:** Redis memory usage growing

**Solution:**
```bash
# Check memory usage
redis-cli info memory

# Clean old jobs
npm run worker
# Then use monitoring API to clean queues
```

### Stuck Jobs

**Problem:** Jobs stuck in "active" state

**Solution:**
```typescript
// Bull automatically marks stuck jobs as "stalled" after 30 seconds
// They are automatically retried

// Manual intervention:
await queueService.retryAllFailedJobs(QueueName.DATA_SYNC);
```

### Worker Not Processing Jobs

**Problem:** Worker running but jobs not processing

**Solution:**
1. Check worker logs for errors
2. Verify queue is not paused: `await queueService.resumeQueue(queueName)`
3. Check Redis connection
4. Restart worker process

## 📝 Best Practices

1. **Use appropriate concurrency**
   - Resource-intensive: 1-2 concurrent jobs
   - Lightweight: 5-10 concurrent jobs

2. **Set reasonable timeouts**
   - Data sync: 5 minutes
   - Insights: 3 minutes
   - Webhooks: 30 seconds
   - Emails: 10 seconds

3. **Monitor queue depths**
   - Alert if waiting > 100
   - Scale workers if consistently high

4. **Handle failures gracefully**
   - Log detailed error information
   - Update integration status on auth errors
   - Notify admins of critical failures

5. **Use recurring jobs wisely**
   - Balance freshness vs API rate limits
   - Adjust frequency based on plan tier
   - Monitor API quota usage

## 📚 Additional Resources

- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Redis Documentation](https://redis.io/documentation)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Cron Expression Generator](https://crontab.guru/)

## 🎉 Success Indicators

The Background Jobs System is working correctly when:

1. ✅ Worker shows "Queue Worker is now running"
2. ✅ Statistics display every 30 seconds
3. ✅ Jobs transition through states: waiting → active → completed
4. ✅ Failed jobs automatically retry
5. ✅ Data syncs complete successfully
6. ✅ Insights generate every 6 hours
7. ✅ Webhooks process within seconds

---

**Need Help?** Check the logs:
- Worker: `pm2 logs bizinsights-worker`
- Redis: `redis-cli monitor`
- Next.js: `pm2 logs bizinsights-app`
